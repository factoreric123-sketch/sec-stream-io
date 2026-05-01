import { createFileRoute } from "@tanstack/react-router";
import { handlePublicApi, requireParam } from "@/server/apiAuth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/v1/search")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handlePublicApi(request, "/v1/search", async ({ url }) => {
          const q = requireParam(url, "q");
          if (!q) return { ok: false, status: 400, error: "missing required param: q" };
          const limit = Math.min(Number(url.searchParams.get("limit")) || 10, 50);

          const pattern = `%${q}%`;
          const { data, error } = await supabaseAdmin
            .from("sec_filings")
            .select("ticker,company_name,cik,sic_description,exchange")
            .or(`ticker.ilike.${pattern},company_name.ilike.${pattern}`)
            .limit(limit * 4); // fetch extra for dedup

          if (error) return { ok: false, status: 500, error: error.message };

          const seen = new Set<string>();
          const results: Array<{
            ticker: string | null;
            name: string | null;
            cik: string | null;
            sic_description: string | null;
            exchange: string | null;
          }> = [];
          for (const row of data ?? []) {
            const key = (row.ticker ?? "") + "|" + (row.cik ?? "");
            if (seen.has(key)) continue;
            seen.add(key);
            results.push({
              ticker: row.ticker,
              name: row.company_name,
              cik: row.cik,
              sic_description: row.sic_description,
              exchange: row.exchange,
            });
            if (results.length >= limit) break;
          }

          return { ok: true, data: { query: q, count: results.length, results } };
        }),
    },
  },
});
