// Server-only helpers for the public REST API.
// Authenticates incoming requests via Bearer sk_live_... key, logs usage,
// and returns a JSON Response.
import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AuthedKey = {
  user_id: string;
  key_id: string;
};

export type ApiResult<T> =
  | { ok: true; data: T; status?: number }
  | { ok: false; status: number; error: string };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

export function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function jsonResponse(body: unknown, status: number, latencyMs: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Response-Time-Ms": String(latencyMs),
      ...CORS_HEADERS,
    },
  });
}

function extractBearer(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : auth.trim();
}

async function authenticate(request: Request): Promise<AuthedKey | null> {
  const key = extractBearer(request);
  if (!key || !key.startsWith("sk_")) return null;
  const hash = createHash("sha256").update(key).digest("hex");
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id,user_id")
    .eq("key_hash", hash)
    .maybeSingle();
  if (error || !data) return null;
  return { user_id: data.user_id, key_id: data.id };
}

async function logUsage(
  auth: AuthedKey | null,
  endpoint: string,
  status: number,
  latencyMs: number
) {
  if (!auth) return;
  // Fire-and-forget; don't block the response on logging failures.
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

/**
 * Wrap a public API handler with auth, usage logging, error handling, and CORS.
 * The handler returns either { ok: true, data } (200) or { ok: false, status, error }.
 */
export async function handlePublicApi<T>(
  request: Request,
  endpoint: string,
  fn: (ctx: { auth: AuthedKey; url: URL }) => Promise<ApiResult<T>>
): Promise<Response> {
  const start = Date.now();

  if (request.method === "OPTIONS") return corsPreflight();

  const auth = await authenticate(request);
  if (!auth) {
    const latency = Date.now() - start;
    return jsonResponse(
      {
        error: "unauthorized",
        message:
          "Missing or invalid API key. Send `Authorization: Bearer sk_live_...`.",
      },
      401,
      latency
    );
  }

  let result: ApiResult<T>;
  try {
    const url = new URL(request.url);
    result = await fn({ auth, url });
  } catch (e) {
    console.error(`[api ${endpoint}]`, e);
    result = { ok: false, status: 500, error: "internal_error" };
  }

  const latency = Date.now() - start;
  const status = result.ok ? result.status ?? 200 : result.status;
  await logUsage(auth, endpoint, status, latency);

  if (result.ok) return jsonResponse(result.data, status, latency);
  return jsonResponse({ error: result.error }, status, latency);
}

export function requireParam(url: URL, name: string): string | null {
  const v = url.searchParams.get(name);
  return v && v.trim().length > 0 ? v.trim() : null;
}
