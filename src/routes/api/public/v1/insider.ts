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

export const Route = createFileRoute("/api/public/v1/insider")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handlePublicApi(request, "/v1/insider", async ({ url }) => {
          const ticker = requireParam(url, "ticker");
          if (!ticker)
            return apiError("missing_param", "Missing required parameter: ticker", 400, {
              param: "ticker",
            });
          const limit = parseLimit(url, 25, 100);
          const fields = url.searchParams.get("fields");
          const cursor = decodeCursor(url);

          let q = supabaseAdmin
            .from("sec_filings")
            .select(
              "accession_no,filed_at,transaction_date,ticker,company_name,insider_name,insider_title,transaction_code,security_title,is_derivative,transaction_shares,price_per_share,shares_owned_before,shares_owned_after,total_value,delta_ownership,cluster_count"
            )
            .eq("ticker", ticker.toUpperCase())
            .eq("form_type", "4")
            .order("filed_at", { ascending: false, nullsFirst: false })
            .order("accession_no", { ascending: false })
            .limit(limit + 1);

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

          const projected = page.map((r) => pickFields(r as Record<string, unknown>, fields));

          return {
            ok: true,
            data: {
              ticker: ticker.toUpperCase(),
              data: projected,
              pagination: { next_cursor: nextCursor, has_more: hasMore, limit },
            },
            csv: {
              rows: projected as Array<Record<string, unknown>>,
              filename: `insider_${ticker.toUpperCase()}.csv`,
            },
          };
        }),
    },
  },
});
