// Internal endpoint called by pg_cron (or manual cron) to dispatch
// pending webhook deliveries. Protected by an INTERNAL_DISPATCH_TOKEN secret.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/v1/_internal/dispatch-webhooks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-internal-token");
        const expected = process.env.INTERNAL_DISPATCH_TOKEN;
        if (!expected || token !== expected) {
          return new Response(JSON.stringify({ error: "forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }

        const result = { enqueued: 0, delivered: 0, failed: 0 };

        // 1. Enqueue new filings (last 5 minutes) for matching watchers.
        const since = new Date(Date.now() - 5 * 60_000).toISOString().slice(0, 10);
        const { data: newFilings } = await supabaseAdmin
          .from("sec_filings")
          .select("accession_number,form_type,filed_at,ticker,company_name,cik")
          .gte("filed_at", since)
          .limit(500);

        if (newFilings && newFilings.length > 0) {
          const tickers = Array.from(
            new Set(newFilings.map((f) => f.ticker).filter(Boolean))
          ) as string[];

          if (tickers.length > 0) {
            const { data: watchers } = await supabaseAdmin
              .from("watched_tickers")
              .select("user_id,ticker")
              .in("ticker", tickers);

            if (watchers && watchers.length > 0) {
              const userIds = Array.from(new Set(watchers.map((w) => w.user_id)));
              const { data: hooks } = await supabaseAdmin
                .from("webhooks")
                .select("id,user_id,events,active")
                .in("user_id", userIds)
                .eq("active", true);

              const hooksByUser = new Map<string, { id: string; events: string[] }[]>();
              for (const h of hooks ?? []) {
                if (!h.events.includes("filing.created")) continue;
                const arr = hooksByUser.get(h.user_id) ?? [];
                arr.push({ id: h.id, events: h.events });
                hooksByUser.set(h.user_id, arr);
              }

              const watchersByUser = new Map<string, Set<string>>();
              for (const w of watchers) {
                const set = watchersByUser.get(w.user_id) ?? new Set();
                set.add(w.ticker);
                watchersByUser.set(w.user_id, set);
              }

              const toInsert: Array<{
                webhook_id: string;
                user_id: string;
                event: string;
                payload: Record<string, unknown>;
              }> = [];
              for (const filing of newFilings) {
                if (!filing.ticker) continue;
                for (const [userId, userHooks] of hooksByUser) {
                  if (!watchersByUser.get(userId)?.has(filing.ticker)) continue;
                  for (const h of userHooks) {
                    toInsert.push({
                      webhook_id: h.id,
                      user_id: userId,
                      event: "filing.created",
                      payload: {
                        event: "filing.created",
                        filing,
                        timestamp: new Date().toISOString(),
                      },
                    });
                  }
                }
              }

              if (toInsert.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await supabaseAdmin.from("webhook_deliveries").insert(toInsert as any);
                result.enqueued = toInsert.length;
              }
            }
          }
        }

        // 2. Deliver pending deliveries (cap 50 per run).
        const { data: pending } = await supabaseAdmin
          .from("webhook_deliveries")
          .select("id,webhook_id,payload,event,attempt")
          .eq("status", "pending")
          .order("attempted_at", { ascending: true })
          .limit(50);

        if (pending && pending.length > 0) {
          const hookIds = Array.from(new Set(pending.map((p) => p.webhook_id)));
          const { data: hookRows } = await supabaseAdmin
            .from("webhooks")
            .select("id,url,secret,active")
            .in("id", hookIds);
          const hookMap = new Map((hookRows ?? []).map((h) => [h.id, h]));

          for (const delivery of pending) {
            const hook = hookMap.get(delivery.webhook_id);
            if (!hook || !hook.active) {
              await supabaseAdmin
                .from("webhook_deliveries")
                .update({ status: "skipped", response_body: "webhook inactive" })
                .eq("id", delivery.id);
              continue;
            }

            const body = JSON.stringify(delivery.payload);
            const signature = createHmac("sha256", hook.secret).update(body).digest("hex");

            try {
              const res = await fetch(hook.url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-SECStream-Signature": `sha256=${signature}`,
                  "X-SECStream-Event": delivery.event,
                  "User-Agent": "SECStream-Webhooks/1.0",
                },
                body,
                signal: AbortSignal.timeout(10_000),
              });
              const text = await res.text().catch(() => "");
              const ok = res.status >= 200 && res.status < 300;
              await supabaseAdmin
                .from("webhook_deliveries")
                .update({
                  status: ok ? "delivered" : delivery.attempt >= 3 ? "failed" : "pending",
                  response_code: res.status,
                  response_body: text.slice(0, 500),
                  attempt: delivery.attempt + (ok ? 0 : 1),
                  attempted_at: new Date().toISOString(),
                })
                .eq("id", delivery.id);
              if (ok) {
                result.delivered++;
                await supabaseAdmin
                  .from("webhooks")
                  .update({ last_delivery_at: new Date().toISOString() })
                  .eq("id", hook.id);
              } else {
                result.failed++;
              }
            } catch (e) {
              await supabaseAdmin
                .from("webhook_deliveries")
                .update({
                  status: delivery.attempt >= 3 ? "failed" : "pending",
                  response_body: String(e).slice(0, 500),
                  attempt: delivery.attempt + 1,
                  attempted_at: new Date().toISOString(),
                })
                .eq("id", delivery.id);
              result.failed++;
            }
          }
        }

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
