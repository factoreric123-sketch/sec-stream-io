import { createFileRoute } from "@tanstack/react-router";
import {
  apiError,
  decodeCursor,
  encodeCursor,
  handlePublicApi,
  parseLimit,
  pickFields,
  requireParam,
} from "@/server/apiAuth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/v1/filings")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handlePublicApi(request, "/v1/filings", async ({ url }) => {
          const ticker = requireParam(url, "ticker");
          if (!ticker)
            return apiError("missing_param", "Missing required parameter: ticker", 400, {
              param: "ticker",
            });
          const formType = url.searchParams.get("type");
          const limit = parseLimit(url, 25, 100);
          const include = url.searchParams.get("include"); // "market"
          const fields = url.searchParams.get("fields");
          const cursor = decodeCursor(url);

          let q = supabaseAdmin
            .from("sec_filings")
            .select(
              "accession_no,form_type,filed_at,period_of_report,ticker,company_name,cik,sic,sic_description,exchange,fiscal_year_end,revenue,net_income,operating_cash_flow,total_assets,total_liabilities,total_equity,total_debt,cash_and_equivalents,current_ratio,debt_to_equity"
            )
            .eq("ticker", ticker.toUpperCase())
            .order("filed_at", { ascending: false, nullsFirst: false })
            .order("accession_no", { ascending: false })
            .limit(limit + 1);
          if (formType) q = q.eq("form_type", formType);
          if (cursor) {
            q = q.or(
              `filed_at.lt.${cursor.filed_at},and(filed_at.eq.${cursor.filed_at},accession_no.lt.${cursor.accession_no})`
            );
          }

          const { data, error } = await q;
          if (error) return apiError("internal_error", error.message, 500);

          const rows = data ?? [];
          const hasMore = rows.length > limit;
          const page = hasMore ? rows.slice(0, limit) : rows;
          const last = page[page.length - 1];
          const nextCursor =
            hasMore && last?.filed_at && last?.accession_no
              ? encodeCursor({ filed_at: last.filed_at, accession_no: last.accession_no })
              : null;

          const filings = page.map((f) => {
            const full = {
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
              ...(include === "market" && { market_note: "Market overlay coming soon." }),
            };
            return pickFields(full, fields);
          });

          return {
            ok: true,
            data: {
              ticker: ticker.toUpperCase(),
              data: filings,
              pagination: { next_cursor: nextCursor, has_more: hasMore, limit },
            },
            csv: {
              rows: filings as Array<Record<string, unknown>>,
              filename: `filings_${ticker.toUpperCase()}.csv`,
            },
          };
        }),
    },
  },
});
