// Fix G: Batched usage_logs inserts.
//
// Every API request currently does one INSERT into usage_logs. At scale that's
// one write per request, dominating DB IOPS. Buffering them in-process for ~1s
// and writing as multi-row INSERTs collapses N writes into 1.
//
// TRADEOFF: up to FLUSH_INTERVAL_MS of lag on the usage dashboard, and up to
// MAX_BUFFER rows lost on a hard crash (since we don't fsync). Acceptable for
// analytics; would NOT be acceptable for billing.
//
// WIRING (in apiAuth.server.ts, replace the logUsage() body):
//   import { usageBuffer } from "./usageBuffer.server";
//
//   async function logUsage(auth, endpoint, status, latencyMs) {
//     if (!auth) return;
//     usageBuffer.enqueue({
//       user_id: auth.user_id,
//       endpoint,
//       status,
//       latency_ms: latencyMs,
//     });
//     // last_used_at update is throttled separately (see PERFORMANCE.md Fix H).
//   }
//
// Also call usageBuffer.flush() on graceful shutdown if your runtime supports
// it (Node SIGTERM, Cloudflare Workers waitUntil, etc.).

import { supabaseAdmin } from "@/integrations/supabase/client.server";

type UsageRow = {
  user_id: string;
  endpoint: string;
  status: number;
  latency_ms: number;
};

const FLUSH_INTERVAL_MS = 1_000;
const MAX_BUFFER = 500; // Flush early if buffer hits this size.

class UsageBuffer {
  private rows: UsageRow[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flushing = false;

  enqueue(row: UsageRow): void {
    this.rows.push(row);

    if (this.rows.length >= MAX_BUFFER) {
      // Don't wait — flush now.
      void this.flush();
      return;
    }

    if (this.timer === null) {
      this.timer = setTimeout(() => {
        this.timer = null;
        void this.flush();
      }, FLUSH_INTERVAL_MS);
    }
  }

  async flush(): Promise<void> {
    if (this.flushing) return;
    if (this.rows.length === 0) return;

    this.flushing = true;
    const batch = this.rows;
    this.rows = [];
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    try {
      const { error } = await supabaseAdmin.from("usage_logs").insert(batch);
      if (error) {
        console.error("[usageBuffer] flush failed", error, "rows:", batch.length);
        // Best-effort: drop the batch. Reinserting risks runaway memory if
        // the DB is down. Adjust if you have a durable queue available.
      }
    } catch (e) {
      console.error("[usageBuffer] flush threw", e);
    } finally {
      this.flushing = false;
    }
  }

  size(): number {
    return this.rows.length;
  }
}

export const usageBuffer = new UsageBuffer();

// Optional: best-effort flush on process exit. No-op on serverless runtimes.
if (typeof process !== "undefined" && typeof process.on === "function") {
  const shutdown = () => { void usageBuffer.flush(); };
  process.on("beforeExit", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
