// Freemium quota enforcement.
//
// Free-tier users get a lifetime cap (default 10 API calls) before they're
// required to upgrade. Paid users (plan='active') skip the cap entirely.
//
// This module provides:
//   - consumeQuota(userId): atomic increment + return state
//   - quotaExhaustedResponse(authedKey): builds the 402 response
//
// WIRING in apiAuth.server.ts (you must apply this — I can't edit that file):
//
//   import { consumeQuota, quotaExhaustedResponse } from "./quota.server";
//
//   // Inside handlePublicApi, AFTER auth + plan check, BEFORE the data handler runs:
//   const quota = await consumeQuota(auth.user_id);
//   if (quota && quota.plan === "free" && quota.new_count > quota.free_quota) {
//     const latency = Date.now() - start;
//     await logUsage(auth, endpoint, 402, latency);
//     return jsonResponse(
//       quotaExhaustedResponse(quota),
//       402,
//       { ...baseHeaders, "X-Response-Time-Ms": String(latency) },
//     );
//   }
//
// The increment is atomic via a Postgres RPC (consume_quota in migration
// 20260604075928_freemium_tier.sql).

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type QuotaState = {
  new_count: number;
  free_quota: number;
  plan: string;
};

/**
 * Atomically increment the user's lifetime_request_count and return the new
 * value plus their quota. Returns null on DB error (caller should fail-open).
 */
export async function consumeQuota(userId: string): Promise<QuotaState | null> {
  const { data, error } = await supabaseAdmin.rpc("consume_quota", {
    p_user_id: userId,
  });

  if (error) {
    console.error("[quota] consume_quota RPC failed", error);
    return null;
  }

  // Supabase returns an array of row(s) from table-returning functions.
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.new_count !== "number") {
    return null;
  }
  return {
    new_count: Number(row.new_count),
    free_quota: Number(row.free_quota),
    plan: String(row.plan),
  };
}

/**
 * Standard 402 Payment Required body. Frontend can read upgrade_url and
 * deep-link the user straight to checkout.
 */
export function quotaExhaustedResponse(quota: QuotaState) {
  const appBase = process.env.APP_BASE_URL ?? "https://sec-stream-io.lovable.app";
  return {
    error: {
      code: "upgrade_required",
      message:
        `Free-tier quota of ${quota.free_quota} requests exceeded. ` +
        `Upgrade to Premium ($10/mo) for unlimited access.`,
      details: {
        used: quota.new_count,
        quota: quota.free_quota,
        plan: quota.plan,
        upgrade_url: `${appBase}/dashboard?upgrade=1`,
      },
    },
  };
}
