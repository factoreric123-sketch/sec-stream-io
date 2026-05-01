import { createFileRoute } from "@tanstack/react-router";
import {
  apiError,
  handlePublicApi,
  parseLimit,
  pickFields,
} from "@/server/apiAuth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MAX_TICKERS = 100;

type Body = {
  tickers?: unknown;
  fields?: unknown;
  limit_per_ticker?: unknown;
  type?: unknown;
};

export const Route = createFileRoute("/api/public/v1/filings/batch")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handlePublicApi(request, "/v1/filings/batch", async ({ url }) => {
          let body: Body;
          try {
            body = (await request.json()) as Body;
          } catch {
            return apiError("invalid_param", "Body must be valid JSON.", 400);
          }
          const rawTickers = Array.isArray(body.tickers) ? body.tickers : null;
          if (!rawTickers || rawTickers.length === 0)
            return apiError("missing_param", "Body.tickers must be a non-empty array.", 400, {
              param: "tickers",
            });
          if (rawTickers.length > MAX_TICKERS)
            return apiError(
              "invalid_param",
              `Too many tickers. Max ${MAX_TICKERS} per request.`,
              422,
              { max: MAX_TICKERS, received: rawTickers.length }
            );

          const tickers = Array.from(
            new Set(
              rawTickers
                .filter((t): t is string => typeof t === "string")
                .map((t) => t.trim().toUpperCase())
                .filter(Boolean)
            )
          );

          const fields = typeof body.fields === "string" ? body.fields : url.searchParams.get("fields");
          const formType = typeof body.type === "string" ? body.type : null;
          const perTicker =
            typeof body.limit_per_ticker === "number" && body.limit_per_ticker > 0
              ? Math.min(Math.floor(body.limit_per_ticker), 50)
              : parseLimit(url, 10, 50);

          // Single round-trip: fetch all rows for all tickers, then group + cap per ticker.
          let q = supabaseAdmin
            .from("sec_filings")
            .select(
              "accession_no,form_type,filed_at,period_of_report,ticker,company_name,cik,sic_description,exchange,revenue,net_income,total_assets,total_equity,total_debt"
            )
            .in("ticker", tickers)
            .order("filed_at", { ascending: false, nullsFirst: false })
            .limit(tickers.length * perTicker * 2);
          if (formType) q = q.eq("form_type", formType);

          const { data, error } = await q;
          if (error) return apiError("internal_error", error.message, 500);

          const grouped: Record<string, Array<Record<string, unknown>>> = {};
          for (const t of tickers) grouped[t] = [];
          for (const row of data ?? []) {
            const t = (row.ticker ?? "").toUpperCase();
            const bucket = grouped[t];
            if (!bucket || bucket.length >= perTicker) continue;
            bucket.push(pickFields(row as Record<string, unknown>, fields) as Record<string, unknown>);
          }

          return {
            ok: true,
            data: {
              count: tickers.length,
              limit_per_ticker: perTicker,
              results: grouped,
            },
          };
        }),
    },
  },
});
