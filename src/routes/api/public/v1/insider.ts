import { createFileRoute } from "@tanstack/react-router";
import { handlePublicApi, requireParam } from "@/server/apiAuth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/v1/insider")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handlePublicApi(request, "/v1/insider", async ({ url }) => {
          const ticker = requireParam(url, "ticker");
          if (!ticker) return { ok: false, status: 400, error: "missing required param: ticker" };
          const limit = Math.min(Number(url.searchParams.get("limit")) || 25, 100);

          const { data, error } = await supabaseAdmin
            .from("sec_filings")
            .select(
              "accession_no,filed_at,transaction_date,ticker,company_name,insider_name,insider_title,transaction_code,security_title,is_derivative,transaction_shares,price_per_share,shares_owned_before,shares_owned_after,total_value,delta_ownership,cluster_count"
            )
            .eq("ticker", ticker.toUpperCase())
            .eq("form_type", "4")
            .order("transaction_date", { ascending: false, nullsFirst: false })
            .limit(limit);

          if (error) return { ok: false, status: 500, error: error.message };

          return {
            ok: true,
            data: {
              ticker: ticker.toUpperCase(),
              count: (data ?? []).length,
              transactions: data ?? [],
            },
          };
        }),
    },
  },
});
