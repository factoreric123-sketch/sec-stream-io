// Fix N: Idempotency keys for write endpoints.
//
// Standard Stripe-style pattern: client sends `Idempotency-Key: <opaque>`,
// server stores (key, request_hash) -> (status, response_body) for 24h.
// Replays with the same key return the cached response without re-running
// the handler. Replays with a different request body for the same key return
// 409 (conflict).
//
// This is read-from / write-to a Postgres table so it works across processes.
//
// MIGRATION REQUIRED:
//   CREATE TABLE public.idempotency_records (
//     key             TEXT NOT NULL,
//     user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//     request_hash    TEXT NOT NULL,
//     status          INT  NOT NULL,
//     response_body   JSONB NOT NULL,
//     created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
//     PRIMARY KEY (user_id, key)
//   );
//   CREATE INDEX idx_idemp_created ON public.idempotency_records (created_at);
//   -- Run a daily cron: DELETE FROM idempotency_records WHERE created_at < now() - interval '24 hours';
//
// WIRING (in any write handler, e.g. POST endpoints):
//   import { withIdempotency } from "./idempotency.server";
//
//   const cached = await withIdempotency(auth.user_id, request, async (key) => {
//     // run the actual write
//     return { status: 200, body: { ok: true, id: created.id } };
//   });
//   if (cached) return jsonResponse(cached.body, cached.status, headers);

import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const HEADER_NAME = "idempotency-key";
const TTL_HOURS = 24;
const MAX_KEY_LEN = 255;

export type IdempotentResult = {
  status: number;
  body: unknown;
  replayed: boolean;
};

export type IdempotencyError =
  | { code: "conflict"; message: string }
  | { code: "invalid_key"; message: string };

/**
 * Run `fn` exactly once per (user_id, idempotency_key) pair within the TTL.
 *
 * Returns:
 *   - The result of fn() on first call, with replayed: false.
 *   - The cached result on subsequent calls with the same key + body, replayed: true.
 *   - An IdempotencyError if the key is reused with a different request body.
 *   - null if no Idempotency-Key header was provided (caller should run normally).
 */
export async function withIdempotency(
  userId: string,
  request: Request,
  body: unknown,
  fn: () => Promise<{ status: number; body: unknown }>
): Promise<IdempotentResult | IdempotencyError | null> {
  const key = request.headers.get(HEADER_NAME)?.trim();
  if (!key) return null;
  if (key.length === 0 || key.length > MAX_KEY_LEN) {
    return { code: "invalid_key", message: `Idempotency-Key must be 1..${MAX_KEY_LEN} chars.` };
  }

  const requestHash = hashRequest(request, body);

  // 1. Look up existing record.
  const { data: existing, error: lookupErr } = await supabaseAdmin
    .from("idempotency_records")
    .select("request_hash,status,response_body,created_at")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle();

  if (lookupErr) {
    // Fail-open: log and run as if no idempotency.
    console.error("[idempotency] lookup failed", lookupErr);
    const result = await fn();
    return { status: result.status, body: result.body, replayed: false };
  }

  if (existing) {
    const ageMs = Date.now() - new Date(existing.created_at).getTime();
    if (ageMs < TTL_HOURS * 3_600_000) {
      if (existing.request_hash !== requestHash) {
        return {
          code: "conflict",
          message: "Idempotency-Key reused with a different request body.",
        };
      }
      return {
        status: existing.status,
        body: existing.response_body,
        replayed: true,
      };
    }
    // Expired record: fall through and overwrite below.
  }

  // 2. Run the handler.
  const result = await fn();

  // 3. Persist for replay. Use upsert in case of TOCTOU with another instance.
  const { error: insertErr } = await supabaseAdmin
    .from("idempotency_records")
    .upsert(
      {
        user_id: userId,
        key,
        request_hash: requestHash,
        status: result.status,
        response_body: result.body as never,
      },
      { onConflict: "user_id,key" }
    );

  if (insertErr) {
    console.error("[idempotency] persist failed", insertErr);
    // Still return the handler's result; we just lose replay protection.
  }

  return { status: result.status, body: result.body, replayed: false };
}

function hashRequest(request: Request, body: unknown): string {
  const h = createHash("sha256");
  h.update(request.method);
  h.update("\n");
  h.update(new URL(request.url).pathname);
  h.update("\n");
  h.update(typeof body === "string" ? body : JSON.stringify(body ?? null));
  return h.digest("hex");
}
