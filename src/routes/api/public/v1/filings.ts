import { createFileRoute } from "@tanstack/react-router";
import { handlePublicApi, requireParam } from "@/server/apiAuth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/v1/filings")({
  server: {
    handlers: {
      OPTIONS: async () => handlePublicApi(new Request("http://x", { method: "OPTIONS" }), "/v1/filings", async () => ({ ok: true, data: {} })),
      GET: async ({ request }) =>
        handlePublicApi(request, "/v1/filings", async ({ url }) => {
          const ticker = requireParam(url, "ticker");
          if (!ticker) return { ok: false, status: 400, error: "missing required param: ticker" };
          const formType = url.searchParams.get("type");
          const limit = Math.min(Number(url.searchParams.get("limit")) || 25, 100);
          const include = url.searchParams.get("include"); // "market"

          let q = supabaseAdmin
            .from("sec_filings")
            .select(
              "accession_no,form_type,filed_at,period_of_report,ticker,company_name,cik,sic,sic_description,exchange,fiscal_year_end,revenue,net_income,operating_cash_flow,total_assets,total_liabilities,total_equity,total_debt,cash_and_equivalents,current_ratio,debt_to_equity"
            )
            .eq("ticker", ticker.toUpperCase())
            .order("filed_at", { ascending: false })
            .limit(limit);
          if (formType) q = q.eq("form_type", formType);

          const { data, error } = await q;
          if (error) return { ok: false, status: 500, error: error.message };

          const filings = (data ?? []).map((f) => ({
            accession_no: f.accession_no,
            form_type: f.form_type,
            filed_at: f.filed_at,
            period_of_report: f.period_of_report,
            ticker: f.ticker,
            company_name: f.company_name,
            cik: f.cik,
            sic: f.sic,
            sic_description: f.sic_description,
            exchange: f.exchange,
            fiscal_year_end: f.fiscal_year_end,
            financials: {
              revenue: f.revenue,
              net_income: f.net_income,
              operating_cash_flow: f.operating_cash_flow,
              total_assets: f.total_assets,
              total_liabilities: f.total_liabilities,
              total_equity: f.total_equity,
              total_debt: f.total_debt,
              cash_and_equivalents: f.cash_and_equivalents,
              current_ratio: f.current_ratio,
              debt_to_equity: f.debt_to_equity,
            },
            ...(include === "market" && {
              market: {
                note: "Market overlay coming soon — wire up your market-data source.",
              },
            }),
          }));

          return {
            ok: true,
            data: { ticker: ticker.toUpperCase(), count: filings.length, filings },
          };
        }),
    },
  },
});
