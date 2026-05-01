import { createFileRoute } from "@tanstack/react-router";
import { handlePublicApi, requireParam } from "@/server/apiAuth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/v1/company")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handlePublicApi(request, "/v1/company", async ({ url }) => {
          const ticker = requireParam(url, "ticker");
          if (!ticker) return { ok: false, status: 400, error: "missing required param: ticker" };

          const { data, error } = await supabaseAdmin
            .from("sec_filings")
            .select("ticker,company_name,cik,sic,sic_description,exchange,fiscal_year_end")
            .eq("ticker", ticker.toUpperCase())
            .order("filed_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) return { ok: false, status: 500, error: error.message };
          if (!data) return { ok: false, status: 404, error: "company not found" };

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
