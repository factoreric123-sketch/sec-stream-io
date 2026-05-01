import { createFileRoute } from "@tanstack/react-router";
import {
  apiError,
  handlePublicApi,
  parseLimit,
  requireParam,
} from "@/server/apiAuth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/v1/fundamentals")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handlePublicApi(request, "/v1/fundamentals", async ({ url }) => {
          const ticker = requireParam(url, "ticker");
          if (!ticker)
            return apiError("missing_param", "Missing required parameter: ticker", 400, {
              param: "ticker",
            });
          // Reuse limit semantics for "periods" (default 4, max 20 historical periods).
          const periods = Math.min(parseLimit(url, 4, 20), 20);

          const { data, error } = await supabaseAdmin
            .from("sec_filings")
            .select(
              "accession_no,form_type,period_of_report,filed_at,revenue,net_income,operating_cash_flow,total_assets,total_liabilities,total_equity,total_debt,cash_and_equivalents,current_ratio,debt_to_equity"
            )
            .eq("ticker", ticker.toUpperCase())
            .in("form_type", ["10-K", "10-Q"])
            .not("revenue", "is", null)
            .order("period_of_report", { ascending: false })
            .limit(periods);

          if (error) return apiError("internal_error", error.message, 500);

          return {
            ok: true,
            data: {
              ticker: ticker.toUpperCase(),
              data: data ?? [],
              pagination: { next_cursor: null, has_more: false, limit: periods },
            },
          };
        }),
    },
  },
});
