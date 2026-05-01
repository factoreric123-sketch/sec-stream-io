import { createFileRoute } from "@tanstack/react-router";
import { handlePublicApi } from "@/server/apiAuth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/v1/clusters")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handlePublicApi(request, "/v1/clusters", async ({ url }) => {
          const ticker = url.searchParams.get("ticker")?.trim();
          const minCluster = Math.max(Number(url.searchParams.get("min")) || 2, 2);
          const limit = Math.min(Number(url.searchParams.get("limit")) || 25, 100);

          let q = supabaseAdmin
            .from("sec_filings")
            .select(
              "accession_no,filed_at,transaction_date,ticker,company_name,insider_name,insider_title,transaction_code,transaction_shares,price_per_share,total_value,cluster_count"
            )
            .eq("form_type", "4")
            .gte("cluster_count", minCluster)
            .order("cluster_count", { ascending: false })
            .order("transaction_date", { ascending: false, nullsFirst: false })
            .limit(limit);
          if (ticker) q = q.eq("ticker", ticker.toUpperCase());

          const { data, error } = await q;
          if (error) return { ok: false, status: 500, error: error.message };

          return {
            ok: true,
            data: {
              ticker: ticker ? ticker.toUpperCase() : null,
              min_cluster_count: minCluster,
              count: (data ?? []).length,
              clusters: data ?? [],
            },
          };
        }),
    },
  },
});
