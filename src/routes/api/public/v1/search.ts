import { createFileRoute } from "@tanstack/react-router";
import {
  apiError,
  handlePublicApi,
  parseLimit,
  requireParam,
} from "@/server/apiAuth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/v1/search")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handlePublicApi(request, "/v1/search", async ({ url }) => {
          const q = requireParam(url, "q");
          if (!q)
            return apiError("missing_param", "Missing required parameter: q", 400, {
              param: "q",
            });
          const limit = parseLimit(url, 10, 50);
          const scope = (url.searchParams.get("scope") ?? "all").toLowerCase();

          const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;
          const orParts: string[] = [];
          if (scope === "all" || scope === "ticker") orParts.push(`ticker.ilike.${pattern}`);
          if (scope === "all" || scope === "company") orParts.push(`company_name.ilike.${pattern}`);

          if (orParts.length === 0)
            return apiError("invalid_param", `Unknown scope: ${scope}`, 400, { param: "scope" });

          const { data, error } = await supabaseAdmin
            .from("sec_filings")
            .select("ticker,company_name,cik")
            .or(orParts.join(","))
            .limit(limit * 6);

          if (error) return apiError("internal_error", error.message, 500);

          const seen = new Set<string>();
          const results: Array<{ ticker: string | null; name: string | null; cik: string | null }> = [];
          for (const row of data ?? []) {
            const key = (row.ticker ?? "") + "|" + (row.cik ?? "");
            if (seen.has(key)) continue;
            seen.add(key);
            results.push({ ticker: row.ticker, name: row.company_name, cik: row.cik });
            if (results.length >= limit) break;
          }

          return {
            ok: true,
            data: {
              query: q,
              scope,
              data: results,
              pagination: { next_cursor: null, has_more: false, limit },
            },
          };
        }),
    },
  },
});
