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

          const t = ticker.toUpperCase();
          const [latest, countRes] = await Promise.all([
            supabaseAdmin
              .from("sec_filings")
              .select("ticker,company_name,cik,form_type,filing_date")
              .eq("ticker", t)
              .order("filing_date", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabaseAdmin
              .from("sec_filings")
              .select("id", { count: "exact", head: true })
              .eq("ticker", t),
          ]);

          if (latest.error) return apiError("internal_error", latest.error.message, 500);
          if (!latest.data)
            return apiError("not_found", `No company found for ticker ${t}`, 404);

          return {
            ok: true,
            data: {
              ticker: latest.data.ticker,
              name: latest.data.company_name,
              cik: latest.data.cik,
              latest_filing_date: latest.data.filing_date,
              latest_form_type: latest.data.form_type,
              total_filings: countRes.count ?? 0,
            },
          };
        }),
    },
  },
});
