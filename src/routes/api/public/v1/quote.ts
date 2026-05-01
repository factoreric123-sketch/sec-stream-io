import { createFileRoute } from "@tanstack/react-router";
import { handlePublicApi, requireParam } from "@/server/apiAuth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Market quote endpoint. We don't yet have a live market feed wired up,
// so this returns the most recent insider transaction price as a proxy.
// Replace `priceFromMarketFeed` with your real provider when ready.
export const Route = createFileRoute("/api/public/v1/quote")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handlePublicApi(request, "/v1/quote", async ({ url }) => {
          const ticker = requireParam(url, "ticker");
          if (!ticker) return { ok: false, status: 400, error: "missing required param: ticker" };

          const { data, error } = await supabaseAdmin
            .from("sec_filings")
            .select("ticker,company_name,price_per_share,transaction_date,filed_at")
            .eq("ticker", ticker.toUpperCase())
            .not("price_per_share", "is", null)
            .order("transaction_date", { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle();

          if (error) return { ok: false, status: 500, error: error.message };

          return {
            ok: true,
            data: {
              ticker: ticker.toUpperCase(),
              name: data?.company_name ?? null,
              price: data?.price_per_share ?? null,
              as_of: data?.transaction_date ?? data?.filed_at ?? null,
              source: "sec_form4_last_trade",
              note: "Live market quote feed not yet attached — using most recent Form 4 trade price as a proxy.",
            },
          };
        }),
    },
  },
});
