import { createFileRoute } from "@tanstack/react-router";
import { apiError, handlePublicApi, requireParam } from "@/server/apiAuth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/v1/company")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handlePublicApi(request, "/v1/company", async ({ url }) => {
          const ticker = requireParam(url, "ticker");
          if (!ticker)
            return apiError("missing_param", "Missing required parameter: ticker", 400, {
              param: "ticker",
            });

          const { data, error } = await supabaseAdmin
            .from("sec_filings")
            .select("ticker,company_name,cik,sic,sic_description,exchange,fiscal_year_end")
            .eq("ticker", ticker.toUpperCase())
            .order("filed_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) return apiError("internal_error", error.message, 500);
          if (!data)
            return apiError("not_found", `No company found for ticker ${ticker.toUpperCase()}`, 404);

          return {
            ok: true,
            data: {
              ticker: data.ticker,
              name: data.company_name,
              cik: data.cik,
              sic: data.sic,
              sic_description: data.sic_description,
              exchange: data.exchange,
              fiscal_year_end: data.fiscal_year_end,
            },
          };
        }),
    },
  },
});
