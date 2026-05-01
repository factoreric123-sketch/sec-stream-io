// Server-only helpers for the public REST API.
// Handles auth (Bearer sk_live_...), plan enforcement, best-effort rate limiting,
// structured error responses, request IDs, and usage logging.
import { createHash, randomUUID } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AuthedKey = {
  user_id: string;
  key_id: string;
  plan: string;
  renewal_date: string | null;
  rate_limit_per_min: number;
};

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "plan_inactive"
  | "rate_limited"
  | "missing_param"
  | "invalid_param"
  | "not_found"
  | "internal_error";

export type ApiResult<T> =
  | { ok: true; data: T; status?: number }
  | {
      ok: false;
      status: number;
      code: ApiErrorCode;
      message: string;
      details?: Record<string, unknown>;
    };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Expose-Headers":
    "X-Request-Id, X-Response-Time-Ms, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After",
} as const;

export function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Build a structured error result. Use inside handlers. */
export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>
): ApiResult<never> {
  return { ok: false, status, code, message, details };
}

function jsonResponse(
  body: unknown,
  status: number,
  extraHeaders: Record<string, string>
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function extractBearer(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : auth.trim();
}

/**
 * Authenticate the request and load plan + rate-limit config in a single round-trip.
 */
async function authenticate(request: Request): Promise<AuthedKey | null> {
  const key = extractBearer(request);
  if (!key || !key.startsWith("sk_")) return null;
  const hash = createHash("sha256").update(key).digest("hex");

  const { data: keyRow, error: keyErr } = await supabaseAdmin
    .from("api_keys")
    .select("id,user_id")
    .eq("key_hash", hash)
    .maybeSingle();
  if (keyErr || !keyRow) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan,renewal_date,rate_limit_per_min")
    .eq("id", keyRow.user_id)
    .maybeSingle();

  return {
    user_id: keyRow.user_id,
    key_id: keyRow.id,
    plan: profile?.plan ?? "active",
    renewal_date: profile?.renewal_date ?? null,
    rate_limit_per_min: profile?.rate_limit_per_min ?? 60,
  };
}

/** Returns count of requests in the last 60 seconds for this user. */
async function recentRequestCount(userId: string): Promise<number> {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabaseAdmin
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  return count ?? 0;
}

async function logUsage(
  auth: AuthedKey | null,
  endpoint: string,
  status: number,
  latencyMs: number
) {
  if (!auth) return;
  await Promise.allSettled([
    supabaseAdmin.from("usage_logs").insert({
      user_id: auth.user_id,
      endpoint,
      status,
      latency_ms: latencyMs,
    }),
    supabaseAdmin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", auth.key_id),
  ]);
}

function isPlanActive(plan: string, renewalDate: string | null): boolean {
  if (plan === "active") return true;
  // Allow past_due / canceled if they're still inside their paid period
  if (renewalDate && new Date(renewalDate).getTime() > Date.now()) return true;
  return false;
}

function buildErrorBody(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>
) {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

/**
 * Wrap a public API handler with auth, plan enforcement, rate limiting,
 * usage logging, error handling, and CORS.
 */
export async function handlePublicApi<T>(
  request: Request,
  endpoint: string,
  fn: (ctx: { auth: AuthedKey; url: URL }) => Promise<ApiResult<T>>
): Promise<Response> {
  const start = Date.now();
  const requestId = randomUUID();

  const baseHeaders: Record<string, string> = {
    "X-Request-Id": requestId,
  };

  if (request.method === "OPTIONS") return corsPreflight();

  // 1. Authenticate
  const auth = await authenticate(request);
  if (!auth) {
    return jsonResponse(
      buildErrorBody(
        "unauthorized",
        "Missing or invalid API key. Send `Authorization: Bearer sk_live_...`."
      ),
      401,
      { ...baseHeaders, "X-Response-Time-Ms": String(Date.now() - start) }
    );
  }

  // 2. Plan enforcement
  if (!isPlanActive(auth.plan, auth.renewal_date)) {
    const body = buildErrorBody(
      "plan_inactive",
      "Your subscription is not active. Renew billing to continue using the API.",
      { plan: auth.plan, renewal_date: auth.renewal_date }
    );
    const latency = Date.now() - start;
    await logUsage(auth, endpoint, 403, latency);
    return jsonResponse(body, 403, {
      ...baseHeaders,
      "X-Response-Time-Ms": String(latency),
    });
  }

  // 3. Rate limit (best-effort: counts usage_logs in the last 60s).
  const limit = auth.rate_limit_per_min;
  const used = await recentRequestCount(auth.user_id);
  const remaining = Math.max(limit - used, 0);
  const rateHeaders: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": "60",
  };

  if (used >= limit) {
    const latency = Date.now() - start;
    await logUsage(auth, endpoint, 429, latency);
    return jsonResponse(
      buildErrorBody(
        "rate_limited",
        `Rate limit exceeded: ${limit} requests per minute. Try again shortly.`,
        { limit, window_seconds: 60 }
      ),
      429,
      {
        ...baseHeaders,
        ...rateHeaders,
        "Retry-After": "60",
        "X-Response-Time-Ms": String(latency),
      }
    );
  }

  // 4. Run handler
  let result: ApiResult<T>;
  try {
    const url = new URL(request.url);
    result = await fn({ auth, url });
  } catch (e) {
    console.error(`[api ${endpoint}] (req ${requestId})`, e);
    result = apiError("internal_error", "An unexpected error occurred.", 500);
  }

  const latency = Date.now() - start;
  const status = result.ok ? result.status ?? 200 : result.status;
  await logUsage(auth, endpoint, status, latency);

  const responseHeaders = {
    ...baseHeaders,
    ...rateHeaders,
    "X-Response-Time-Ms": String(latency),
  };

  if (result.ok) return jsonResponse(result.data, status, responseHeaders);
  return jsonResponse(
    buildErrorBody(result.code, result.message, result.details),
    status,
    responseHeaders
  );
}

export function requireParam(url: URL, name: string): string | null {
  const v = url.searchParams.get(name);
  return v && v.trim().length > 0 ? v.trim() : null;
}

/** Parse limit param. Default 25, max 100. */
export function parseLimit(url: URL, defaultLimit = 25, max = 100): number {
  const raw = Number(url.searchParams.get("limit"));
  if (!Number.isFinite(raw) || raw <= 0) return defaultLimit;
  return Math.min(Math.floor(raw), max);
}

export type Cursor = { filed_at: string; accession_no: string };

/** Decode a base64 cursor. Returns null if missing or malformed. */
export function decodeCursor(url: URL): Cursor | null {
  const raw = url.searchParams.get("cursor");
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    if (
      parsed &&
      typeof parsed.filed_at === "string" &&
      typeof parsed.accession_no === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
}
