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
          const fields = url.searchParams.get("fields");
          const cursor = decodeCursor(url);

          let q = supabaseAdmin
            .from("sec_filings")
            .select(
              "accession_number,form_type,filing_date,report_date,ticker,company_name,cik,filing_url,description"
            )
            .eq("ticker", ticker.toUpperCase())
            .order("filing_date", { ascending: false, nullsFirst: false })
            .order("accession_number", { ascending: false })
            .limit(limit + 1);
          if (formType) q = q.eq("form_type", formType);
          if (cursor) {
            q = q.or(
              `filing_date.lt.${cursor.filing_date},and(filing_date.eq.${cursor.filing_date},accession_number.lt.${cursor.accession_number})`
            );
          }

          const { data, error } = await q;
          if (error) return apiError("internal_error", error.message, 500);

          const rows = data ?? [];
          const hasMore = rows.length > limit;
          const page = hasMore ? rows.slice(0, limit) : rows;
          const last = page[page.length - 1];
          const nextCursor =
            hasMore && last?.filing_date && last?.accession_number
              ? encodeCursor({
                  filing_date: last.filing_date,
                  accession_number: last.accession_number,
                })
              : null;

          const filings = page.map((f) =>
            pickFields(f as Record<string, unknown>, fields)
          );

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
