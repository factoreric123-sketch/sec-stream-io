// Fix C: Race-free rate limiter.
//
// The current rate limiter in apiAuth.server.ts does:
//   const used = await recentRequestCount(userId);  // SELECT count(*)
//   if (used >= limit) return 429;
//   // ... handler runs ...
//   // ... INSERT into usage_logs ...
// This has two problems:
//   1) Slow: count(*) scans an index range and gets slower as usage_logs grows.
//   2) Racy: concurrent requests all see "used < limit" before any of them
//      inserts, so bursts can exceed the limit by N.
//
// This module provides two implementations:
//   - inMemoryLimiter: single-instance, atomic, ~0ms. Use for dev / single-worker.
//   - postgresLimiter: multi-instance safe via UPSERT on a counter row.
//
// WIRING (in apiAuth.server.ts, replace the recentRequestCount() block):
//   import { getLimiter } from "./rateLimiter.server";
//
//   const { used, limit: effectiveLimit, resetSeconds } =
//     await getLimiter().consume(auth.user_id, auth.rate_limit_per_min);
//   if (used > effectiveLimit) {
//     // 429 with Retry-After: resetSeconds, X-RateLimit-Reset: resetSeconds
//   }
//
// MIGRATION REQUIRED for postgresLimiter:
//   CREATE TABLE public.rate_buckets (
//     user_id   UUID NOT NULL,
//     bucket    BIGINT NOT NULL,   -- floor(epoch / 60)
//     count     INT NOT NULL DEFAULT 0,
//     PRIMARY KEY (user_id, bucket)
//   );
//   -- TTL via a periodic cron or a partial index. Old buckets are harmless.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ConsumeResult = {
  used: number;          // Count *after* this request.
  limit: number;         // Effective limit for this user.
  resetSeconds: number;  // Seconds until window rolls over.
};

export interface RateLimiter {
  consume(userId: string, limit: number): Promise<ConsumeResult>;
}

// ----------------------------------------------------------------------------
// In-memory limiter. Atomic within one process. Resets on cold start.
// ----------------------------------------------------------------------------

class InMemoryLimiter implements RateLimiter {
  private buckets = new Map<string, { bucket: number; count: number }>();

  async consume(userId: string, limit: number): Promise<ConsumeResult> {
    const bucket = Math.floor(Date.now() / 60_000);
    const existing = this.buckets.get(userId);
    let count: number;
    if (!existing || existing.bucket !== bucket) {
      count = 1;
      this.buckets.set(userId, { bucket, count });
    } else {
      existing.count += 1;
      count = existing.count;
    }
    const resetSeconds = 60 - Math.floor((Date.now() % 60_000) / 1000);
    return { used: count, limit, resetSeconds };
  }
}

// ----------------------------------------------------------------------------
// Postgres limiter. Atomic across processes via UPSERT.
// ----------------------------------------------------------------------------

class PostgresLimiter implements RateLimiter {
  async consume(userId: string, limit: number): Promise<ConsumeResult> {
    const bucket = Math.floor(Date.now() / 60_000);

    // Atomic increment via UPSERT.
    // PostgREST .upsert with onConflict + ignoreDuplicates: false performs
    // an UPDATE on conflict. We need INSERT-or-UPDATE-with-increment,
    // which PostgREST doesn't expose directly, so use an RPC:
    //
    //   CREATE OR REPLACE FUNCTION public.rate_bucket_incr(
    //     p_user UUID, p_bucket BIGINT
    //   ) RETURNS INT
    //   LANGUAGE sql AS $$
    //     INSERT INTO public.rate_buckets (user_id, bucket, count)
    //     VALUES (p_user, p_bucket, 1)
    //     ON CONFLICT (user_id, bucket)
    //     DO UPDATE SET count = rate_buckets.count + 1
    //     RETURNING count;
    //   $$;
    //
    // Add that RPC in a migration and call it here:

    const { data, error } = await supabaseAdmin.rpc("rate_bucket_incr", {
      p_user: userId,
      p_bucket: bucket,
    });

    if (error || typeof data !== "number") {
      // Fail-open on limiter errors. Logging recommended.
      console.error("[rateLimiter] postgres incr failed", error);
      return { used: 0, limit, resetSeconds: 60 };
    }

    const resetSeconds = 60 - Math.floor((Date.now() % 60_000) / 1000);
    return { used: data, limit, resetSeconds };
  }
}

// ----------------------------------------------------------------------------
// Factory. Switch via env var.
// ----------------------------------------------------------------------------

let _instance: RateLimiter | null = null;

export function getLimiter(): RateLimiter {
  if (_instance) return _instance;
  const backend = process.env.RATE_LIMITER ?? "memory";
  _instance = backend === "postgres" ? new PostgresLimiter() : new InMemoryLimiter();
  return _instance;
}
