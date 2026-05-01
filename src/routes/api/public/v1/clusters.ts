import { createFileRoute } from "@tanstack/react-router";
import {
  apiError,
  decodeCursor,
  encodeCursor,
  handlePublicApi,
  parseLimit,
} from "@/server/apiAuth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/v1/clusters")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handlePublicApi(request, "/v1/clusters", async ({ url }) => {
          const ticker = url.searchParams.get("ticker")?.trim();
          const minCluster = Math.max(Number(url.searchParams.get("min")) || 2, 2);
          const limit = parseLimit(url, 25, 100);
          const cursor = decodeCursor(url);

          let q = supabaseAdmin
            .from("sec_filings")
            .select(
              "accession_no,filed_at,transaction_date,ticker,company_name,insider_name,insider_title,transaction_code,transaction_shares,price_per_share,total_value,cluster_count"
            )
            .eq("form_type", "4")
            .gte("cluster_count", minCluster)
            .order("filed_at", { ascending: false, nullsFirst: false })
            .order("accession_no", { ascending: false })
            .limit(limit + 1);
          if (ticker) q = q.eq("ticker", ticker.toUpperCase());
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

          return {
            ok: true,
            data: {
              ticker: ticker ? ticker.toUpperCase() : null,
              min_cluster_count: minCluster,
              data: page,
              pagination: { next_cursor: nextCursor, has_more: hasMore, limit },
            },
          };
        }),
    },
  },
});
