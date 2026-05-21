import { createFileRoute } from "@tanstack/react-router";
import {
  apiError,
  handlePublicApi,
  parseLimit,
  pickFields,
  requireParam,
} from "@/server/apiAuth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type InsiderCursor = { filed_at: string; accession: string };

function decodeInsiderCursor(url: URL): InsiderCursor | null {
  const raw = url.searchParams.get("cursor");
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const p = JSON.parse(json);
    if (p && typeof p.filed_at === "string" && typeof p.accession === "string") return p;
    return null;
  } catch {
    return null;
  }
}

function encodeInsiderCursor(c: InsiderCursor): string {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
}

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
          const cursor = decodeInsiderCursor(url);

          let q = supabaseAdmin
            .from("insider_form4_filings")
            .select(
              "accession,filed_at,ticker,issuer_name,cik,reporting_owner_name,reporting_owner_title,is_director,is_officer,is_ten_percent_owner,transaction_code,is_10b5,shares,price_per_share,transaction_value"
            )
            .eq("ticker", ticker.toUpperCase())
            .order("filed_at", { ascending: false, nullsFirst: false })
            .order("accession", { ascending: false })
            .limit(limit + 1);

          if (cursor) {
            q = q.or(
              `filed_at.lt.${cursor.filed_at},and(filed_at.eq.${cursor.filed_at},accession.lt.${cursor.accession})`
            );
          }

          const { data, error } = await q;
          if (error) return apiError("internal_error", error.message, 500);

          const rows = data ?? [];
          const hasMore = rows.length > limit;
          const page = hasMore ? rows.slice(0, limit) : rows;
          const last = page[page.length - 1];
          const nextCursor =
            hasMore && last?.filed_at && last?.accession
              ? encodeInsiderCursor({ filed_at: last.filed_at, accession: last.accession })
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
