// Mocked SEC + market data responses for the API playground.
// Deterministic — same input → same output.

export type Endpoint =
  | "/filings"
  | "/company"
  | "/search"
  | "/quote"
  | "/bars"
  | "/fundamentals";

export type PlaygroundRequest = {
  endpoint: Endpoint;
  params: Record<string, string>;
};

export type PlaygroundResponse = {
  status: number;
  latencyMs: number;
  body: unknown;
};

const COMPANIES: Record<string, { name: string; cik: string; sector: string; sic: string }> = {
  AAPL: { name: "Apple Inc.", cik: "0000320193", sector: "Technology", sic: "3571" },
  MSFT: { name: "Microsoft Corporation", cik: "0000789019", sector: "Technology", sic: "7372" },
  NVDA: { name: "NVIDIA Corporation", cik: "0001045810", sector: "Semiconductors", sic: "3674" },
  TSLA: { name: "Tesla, Inc.", cik: "0001318605", sector: "Automotive", sic: "3711" },
  GOOGL: { name: "Alphabet Inc.", cik: "0001652044", sector: "Technology", sic: "7370" },
  META: { name: "Meta Platforms, Inc.", cik: "0001326801", sector: "Technology", sic: "7370" },
  AMZN: { name: "Amazon.com, Inc.", cik: "0001018724", sector: "Consumer Discretionary", sic: "5961" },
};

function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

function priceFor(ticker: string): number {
  const base = { AAPL: 224, MSFT: 432, NVDA: 138, TSLA: 248, GOOGL: 178, META: 612, AMZN: 218 };
  return (base as Record<string, number>)[ticker] ?? 100 + seedFromString(ticker) * 200;
}

function round(n: number, d = 2) {
  const m = Math.pow(10, d);
  return Math.round(n * m) / m;
}

function company(ticker: string) {
  return COMPANIES[ticker] ?? {
    name: `${ticker} Holdings, Inc.`,
    cik: String(1000000 + Math.floor(seedFromString(ticker) * 8000000)).padStart(10, "0"),
    sector: "Industrials",
    sic: "3990",
  };
}

export function mockResponse(req: PlaygroundRequest): PlaygroundResponse {
  const ticker = (req.params.ticker || "AAPL").toUpperCase();
  const c = company(ticker);
  const px = priceFor(ticker);
  const latency = Math.round(48 + seedFromString(req.endpoint + JSON.stringify(req.params)) * 120);

  switch (req.endpoint) {
    case "/filings": {
      const type = req.params.type || "10-K";
      const include = req.params.include === "market";
      const reaction = round((seedFromString(ticker + type) - 0.4) * 12);
      const body = {
        company: c.name,
        ticker,
        cik: c.cik,
        filing_type: type,
        filing_date: "2024-11-01",
        accession_no: "0000320193-24-000123",
        url: `https://www.sec.gov/Archives/edgar/data/${parseInt(c.cik, 10)}/000032019324000123/${ticker.toLowerCase()}-${type.toLowerCase()}.htm`,
        sections: {
          risk_factors: "The Company's business is subject to risks including macroeconomic conditions, supply chain disruptions, and intense competition…",
          md_and_a: "Fiscal 2024 net sales increased 2% year-over-year, driven by Services growth offsetting hardware softness…",
          business: "The Company designs, manufactures, and markets smartphones, personal computers, tablets, wearables and accessories…",
        },
        financials: {
          revenue: 391_035_000_000,
          net_income: 93_736_000_000,
          eps_diluted: 6.08,
          operating_cash_flow: 118_254_000_000,
        },
        ...(include && {
          market: {
            price_at_filing: round(px - 1.2),
            price_t_plus_1d: round(px - 2.1),
            price_t_plus_7d: round(px + reaction * 0.7),
            reaction_1d_pct: round(((px - 2.1) / (px - 1.2) - 1) * 100),
            reaction_7d_pct: round(reaction),
            volume_t_plus_1d: 56_822_500,
            market_cap: Math.round(px * 15_300_000_000),
          },
        }),
      };
      return { status: 200, latencyMs: latency, body };
    }
    case "/company": {
      return {
        status: 200,
        latencyMs: latency,
        body: {
          ticker,
          name: c.name,
          cik: c.cik,
          sector: c.sector,
          sic: c.sic,
          exchange: "NASDAQ",
          country: "US",
          ipo_date: "1980-12-12",
          fiscal_year_end: "09-30",
          employees: 164_000,
          website: `https://www.${ticker.toLowerCase()}.com`,
        },
      };
    }
    case "/search": {
      const q = (req.params.q || "apple").toLowerCase();
      return {
        status: 200,
        latencyMs: latency,
        body: {
          query: q,
          total: 3,
          results: Object.entries(COMPANIES)
            .filter(([t, v]) => t.toLowerCase().includes(q) || v.name.toLowerCase().includes(q))
            .slice(0, 5)
            .map(([t, v]) => ({ ticker: t, name: v.name, cik: v.cik })),
        },
      };
    }
    case "/quote": {
      const change = round((seedFromString(ticker + "q") - 0.5) * 6);
      return {
        status: 200,
        latencyMs: latency,
        body: {
          ticker,
          price: round(px),
          bid: round(px - 0.02),
          ask: round(px + 0.02),
          change,
          change_pct: round((change / px) * 100),
          volume: 42_817_300,
          timestamp: new Date().toISOString(),
        },
      };
    }
    case "/bars": {
      const tf = req.params.timeframe || "1d";
      const bars = Array.from({ length: 7 }, (_, i) => {
        const s = seedFromString(ticker + "b" + i);
        const o = round(px * (0.97 + s * 0.06));
        const h = round(o * (1 + s * 0.015));
        const l = round(o * (1 - (1 - s) * 0.015));
        const cl = round(l + (h - l) * s);
        return {
          t: new Date(Date.now() - (6 - i) * 86_400_000).toISOString().slice(0, 10),
          o, h, l, c: cl,
          v: 30_000_000 + Math.round(s * 40_000_000),
        };
      });
      return { status: 200, latencyMs: latency, body: { ticker, timeframe: tf, bars } };
    }
    case "/fundamentals": {
      return {
        status: 200,
        latencyMs: latency,
        body: {
          ticker,
          market_cap: Math.round(px * 15_300_000_000),
          pe_ratio: round(28 + seedFromString(ticker + "p") * 12),
          eps_ttm: 6.08,
          dividend_yield_pct: 0.45,
          beta: round(1 + (seedFromString(ticker + "be") - 0.5) * 0.6, 2),
          shares_outstanding: 15_300_000_000,
          revenue_ttm: 391_035_000_000,
          gross_margin_pct: 46.2,
          source_filing: "10-K · 2024-11-01",
        },
      };
    }
  }
}

export const ENDPOINT_PARAMS: Record<Endpoint, { name: string; example: string; required?: boolean }[]> = {
  "/filings": [
    { name: "ticker", example: "AAPL", required: true },
    { name: "type", example: "10-K" },
    { name: "include", example: "market" },
  ],
  "/company": [{ name: "ticker", example: "AAPL", required: true }],
  "/search": [{ name: "q", example: "apple", required: true }],
  "/quote": [{ name: "ticker", example: "AAPL", required: true }],
  "/bars": [
    { name: "ticker", example: "AAPL", required: true },
    { name: "timeframe", example: "1d" },
  ],
  "/fundamentals": [{ name: "ticker", example: "AAPL", required: true }],
};
