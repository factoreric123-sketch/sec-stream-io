import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SEC_API_KEY = Deno.env.get("SEC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("DB_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("DB_SERVICE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Fetch the raw Form 4 XML and extract transaction fields
async function parseForm4Xml(xmlUrl: string): Promise<{
  transactionCode: string | null;
  securityTitle: string | null;
  isDerivative: boolean;
  transactionShares: number | null;
  pricePerShare: number | null;
  sharesOwnedAfter: number | null;
  transactionDate: string | null;
}> {
  const resp = await fetch(xmlUrl, {
    headers: { "User-Agent": "sec-stream-io contact@sec-stream.io" },
  });
  if (!resp.ok) {
    return {
      transactionCode: null,
      securityTitle: null,
      isDerivative: false,
      transactionShares: null,
      pricePerShare: null,
      sharesOwnedAfter: null,
      transactionDate: null,
    };
  }

  const xml = await resp.text();

  const get = (tag: string) => {
    const m = xml.match(new RegExp(`<${tag}>[^<]*<value>([^<]*)</value>`));
    return m ? m[1].trim() : null;
  };
  const getSimple = (tag: string) => {
    const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
    return m ? m[1].trim() : null;
  };

  // Prefer nonDerivativeTransaction; fall back to derivativeTransaction
  const isDerivative = !xml.includes("<nonDerivativeTransaction>") &&
    xml.includes("<derivativeTransaction>");

  const transactionCode = getSimple("transactionCode");
  const securityTitle = get("securityTitle");
  const transactionDate = get("transactionDate") ?? getSimple("periodOfReport");
  const transactionShares = get("transactionShares");
  const pricePerShare = get("transactionPricePerShare");
  const sharesOwnedAfter = get("sharesOwnedFollowingTransaction");

  return {
    transactionCode,
    securityTitle,
    isDerivative,
    transactionShares: transactionShares ? parseFloat(transactionShares) : null,
    pricePerShare: pricePerShare ? parseFloat(pricePerShare) : null,
    sharesOwnedAfter: sharesOwnedAfter ? parseFloat(sharesOwnedAfter) : null,
    transactionDate,
  };
}

Deno.serve(async (_req) => {
  try {
    // Query SEC API for recent Form 4 buys filed in the last 10 minutes
    // Using a window slightly larger than poll interval to avoid gaps
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const queryBody = {
      query: {
        query_string: {
          query: `formType:"4" AND filedAt:[${since} TO *]`,
        },
      },
      from: "0",
      size: "50",
      sort: [{ filedAt: { order: "desc" } }],
    };

    const secResp = await fetch("https://api.sec-api.io", {
      method: "POST",
      headers: {
        Authorization: SEC_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(queryBody),
    });

    if (!secResp.ok) {
      const err = await secResp.text();
      return new Response(`SEC API error: ${err}`, { status: 502 });
    }

    const { filings } = await secResp.json();
    if (!filings || filings.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, message: "no new filings" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const rows = [];

    for (const filing of filings) {
      // Find the raw XML doc (not the xsl-styled one)
      const xmlDoc = filing.documentFormatFiles?.find(
        (d: { type: string; documentUrl: string; size: string }) =>
          d.type === "4" && !d.documentUrl.includes("xslF345X06") && d.size !== " "
      );
      if (!xmlDoc) continue;

      const tx = await parseForm4Xml(xmlDoc.documentUrl);

      // Filter: buys only
      if (tx.transactionCode !== "P") continue;

      // Pull company/entity info from filing
      const issuer = filing.entities?.find((e: { companyName: string }) =>
        e.companyName?.includes("(Issuer)")
      ) ?? filing.entities?.[0];

      const reporter = filing.entities?.find((e: { companyName: string }) =>
        e.companyName?.includes("(Reporting)")
      );

      const sic = issuer?.sic ?? "";
      const sicParts = sic.split(" ");
      const sicCode = sicParts[0] ?? null;
      const sicDesc = sicParts.slice(1).join(" ") || null;

      const sharesOwnedBefore = tx.transactionShares != null && tx.sharesOwnedAfter != null
        ? tx.sharesOwnedAfter - tx.transactionShares
        : null;

      const deltaOwnership =
        sharesOwnedBefore && sharesOwnedBefore !== 0
          ? parseFloat(
            ((tx.sharesOwnedAfter! - sharesOwnedBefore) / sharesOwnedBefore * 100).toFixed(4)
          )
          : null;

      rows.push({
        accession_no: filing.accessionNo,
        form_type: filing.formType,
        filed_at: filing.filedAt,
        transaction_date: tx.transactionDate,
        cik: issuer?.cik?.replace(/^0+/, "") ?? filing.cik,
        ticker: filing.ticker || null,
        company_name: issuer?.companyName?.replace(" (Issuer)", "") ?? filing.companyName,
        sic: sicCode,
        sic_description: sicDesc,
        exchange: null,
        fiscal_year_end: issuer?.fiscalYearEnd ?? null,
        insider_name: reporter?.companyName?.replace(" (Reporting)", "") ?? null,
        insider_title: null, // only in XML relationship block; skipping for now
        transaction_code: tx.transactionCode,
        security_title: tx.securityTitle,
        is_derivative: tx.isDerivative,
        transaction_shares: tx.transactionShares,
        price_per_share: tx.pricePerShare,
        shares_owned_after: tx.sharesOwnedAfter,
        shares_owned_before: sharesOwnedBefore,
        delta_ownership: deltaOwnership,
        cluster_count: 1,
        period_of_report: filing.periodOfReport ?? null,
        total_assets: null,
        total_liabilities: null,
        total_equity: null,
        total_debt: null,
        cash_and_equivalents: null,
        current_ratio: null,
        debt_to_equity: null,
        revenue: null,
        net_income: null,
        operating_cash_flow: null,
      });
    }

    if (rows.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, message: "no buy transactions found" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Upsert — skip duplicates by accession_no
    const { error } = await supabase
      .from("sec_filings")
      .upsert(rows, { onConflict: "accession_no", ignoreDuplicates: true });

    if (error) {
      return new Response(`Supabase error: ${error.message}`, { status: 500 });
    }

    return new Response(
      JSON.stringify({ inserted: rows.length, tickers: rows.map((r) => r.ticker) }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(`Unhandled error: ${err}`, { status: 500 });
  }
});
