import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { CodeBlock } from "@/components/CodeBlock";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "API Documentation — SECStream" },
      { name: "description", content: "REST API reference for SECStream: endpoints, parameters, examples." },
    ],
  }),
  component: DocsPage,
});

const sections = [
  { id: "intro", label: "Introduction" },
  { id: "auth", label: "Authentication" },
  { group: "Filings" },
  { id: "filings", label: "GET /filings" },
  { id: "company", label: "GET /company" },
  { id: "search", label: "GET /search" },
  { group: "Market data" },
  { id: "quote", label: "GET /quote" },
  { id: "bars", label: "GET /bars" },
  { id: "fundamentals", label: "GET /fundamentals" },
  { group: "System" },
  { id: "errors", label: "Errors" },
  { id: "limits", label: "Rate limits" },
] as Array<{ id: string; label: string } | { group: string }>;

function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[200px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Reference
            </p>
            <nav className="mt-3 space-y-1">
              {sections.map((s, i) =>
                "group" in s ? (
                  <p
                    key={`g-${i}`}
                    className="mt-4 px-2 pb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70"
                  >
                    {s.group}
                  </p>
                ) : (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {s.label}
                  </a>
                ),
              )}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 space-y-16">
          <Header />
          <Intro />
          <Auth />
          <FilingsEndpoint />
          <CompanyEndpoint />
          <SearchEndpoint />
          <QuoteEndpoint />
          <BarsEndpoint />
          <FundamentalsEndpoint />
          <Errors />
          <Limits />
        </main>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">API Reference · v1</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">SECStream API</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        REST API for SEC filings <span className="text-foreground">and</span> market data.
        JSON in, JSON out. One base URL, one bearer token, predictable parameters.
      </p>
      <div className="mt-6 flex flex-wrap gap-2 font-mono text-xs">
        <Pill>REST</Pill>
        <Pill>JSON</Pill>
        <Pill>Bearer auth</Pill>
        <Pill>Filings + Market</Pill>
        <Pill>v1.0</Pill>
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-card px-2.5 py-1 text-muted-foreground">
      {children}
    </span>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Intro() {
  return (
    <Section id="intro" title="Introduction">
      <p className="text-sm text-muted-foreground">
        All requests are made to a single base URL. Responses are always JSON. All timestamps are ISO 8601 in UTC.
      </p>
      <CodeBlock filename="Base URL" language="http" code={`https://api.secstream.dev/v1`} />
    </Section>
  );
}

function Auth() {
  return (
    <Section id="auth" title="Authentication">
      <p className="text-sm text-muted-foreground">
        Authenticate every request with a bearer token using the API key from your dashboard.
        Requests without a valid key return <code className="rounded bg-muted px-1 py-0.5 text-xs">401 Unauthorized</code>.
      </p>
      <CodeBlock
        filename="Authorization header"
        language="http"
        code={`Authorization: Bearer sk_live_xxxxxxxxxxxxxxxxxxxxxxxx`}
      />
    </Section>
  );
}

function Endpoint({ method, path }: { method: string; path: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-code-bg px-3 py-2 font-mono text-sm">
      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">{method}</span>
      <span>{path}</span>
    </div>
  );
}

function ParamTable({ rows }: { rows: { name: string; type: string; required?: boolean; desc: string }[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-card text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-mono">Param</th>
            <th className="px-4 py-2 font-mono">Type</th>
            <th className="px-4 py-2 font-mono">Description</th>
          </tr>
        </thead>
        <tbody className="ring-divide">
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="px-4 py-3 font-mono text-foreground">
                {r.name}
                {r.required && <span className="ml-1.5 text-[10px] text-primary">required</span>}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.type}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FilingsEndpoint() {
  return (
    <Section id="filings" title="GET /filings">
      <p className="text-sm text-muted-foreground">
        List filings for a company. Filter by form type and date range.
      </p>
      <Endpoint method="GET" path="/v1/filings" />
      <ParamTable
        rows={[
          { name: "ticker", type: "string", required: true, desc: "Stock ticker symbol, e.g. AAPL." },
          { name: "type", type: "string", desc: "Form type: 10-K, 10-Q, 8-K, S-1, etc." },
          { name: "from", type: "ISO date", desc: "Start of filing date range (inclusive)." },
          { name: "to", type: "ISO date", desc: "End of filing date range (inclusive)." },
          { name: "include", type: "string", desc: "Comma-separated extras: `market` adds price reaction (price at filing, +1d, +7d). `sections` (default) returns parsed text." },
          { name: "limit", type: "integer", desc: "Max results (default 25, max 100)." },
        ]}
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <CodeBlock
          filename="Request"
          code={`curl https://api.secstream.dev/v1/filings \\
  -H "Authorization: Bearer sk_live_..." \\
  -G -d ticker=AAPL -d type=10-K \\
  -d include=market -d limit=2`}
        />
        <CodeBlock
          filename="Response"
          code={`{
  "data": [
    {
      "company": "Apple Inc.",
      "ticker": "AAPL",
      "filing_type": "10-K",
      "filing_date": "2024-11-01",
      "url": "https://www.sec.gov/Archives/...",
      "sections": {
        "business": "Apple Inc. designs...",
        "risk_factors": "The Company's...",
        "md_and_a": "Fiscal 2024..."
      },
      "market": {
        "price_at_filing": 222.91,
        "price_t_plus_1d": 222.01,
        "price_t_plus_7d": 229.54,
        "reaction_7d_pct": 2.97
      }
    }
  ],
  "next_cursor": null
}`}
        />
      </div>
    </Section>
  );
}
function CompanyEndpoint() {
  return (
    <Section id="company" title="GET /company">
      <p className="text-sm text-muted-foreground">
        Get company metadata, including CIK, SIC code, and most recent filings summary.
      </p>
      <Endpoint method="GET" path="/v1/company" />
      <ParamTable
        rows={[
          { name: "ticker", type: "string", required: true, desc: "Stock ticker symbol." },
        ]}
      />
      <CodeBlock
        filename="Response"
        code={`{
  "name": "Apple Inc.",
  "ticker": "AAPL",
  "cik": "0000320193",
  "sic": "3571",
  "industry": "Electronic Computers",
  "exchange": "NASDAQ",
  "fiscal_year_end": "09-28",
  "recent_filings": 47
}`}
      />
    </Section>
  );
}

function SearchEndpoint() {
  return (
    <Section id="search" title="GET /search">
      <p className="text-sm text-muted-foreground">
        Full-text search across filings. Returns matched snippets with highlighted context.
      </p>
      <Endpoint method="GET" path="/v1/search" />
      <ParamTable
        rows={[
          { name: "q", type: "string", required: true, desc: "Search query." },
          { name: "type", type: "string", desc: "Restrict to a specific form type." },
          { name: "from", type: "ISO date", desc: "Start of date range." },
          { name: "to", type: "ISO date", desc: "End of date range." },
        ]}
      />
      <CodeBlock
        filename="Response"
        code={`{
  "data": [
    {
      "ticker": "TSLA",
      "filing_type": "10-Q",
      "filing_date": "2024-10-23",
      "snippet": "...supply constraints in <em>lithium</em> markets...",
      "score": 0.94
    }
  ]
}`}
      />
    </Section>
  );
}

function Errors() {
  return (
    <Section id="errors" title="Errors">
      <p className="text-sm text-muted-foreground">
        Errors return a non-2xx HTTP status with a JSON body containing a code and message.
      </p>
      <ParamTable
        rows={[
          { name: "400", type: "bad_request", desc: "Missing or invalid parameter." },
          { name: "401", type: "unauthorized", desc: "Missing or invalid API key." },
          { name: "404", type: "not_found", desc: "Resource (ticker / filing) not found." },
          { name: "429", type: "rate_limited", desc: "Too many requests. Back off and retry." },
          { name: "500", type: "server_error", desc: "Something broke on our end." },
        ]}
      />
      <CodeBlock
        filename="Error response"
        code={`{
  "error": {
    "code": "not_found",
    "message": "No company found for ticker 'XXXX'."
  }
}`}
      />
    </Section>
  );
}

function Limits() {
  return (
    <Section id="limits" title="Rate limits">
      <p className="text-sm text-muted-foreground">
        100,000 requests per month included. Soft burst limit of 60 requests per second per key.
        Limit headers are returned on every response.
      </p>
      <CodeBlock
        filename="Response headers"
        language="http"
        code={`X-RateLimit-Limit: 100000
X-RateLimit-Remaining: 99847
X-RateLimit-Reset: 2025-12-01T00:00:00Z`}
      />
    </Section>
  );
}

function QuoteEndpoint() {
  return (
    <Section id="quote" title="GET /quote">
      <p className="text-sm text-muted-foreground">
        Live quote for a ticker. Last price, bid/ask, day change, and volume.
      </p>
      <Endpoint method="GET" path="/v1/quote" />
      <ParamTable
        rows={[
          { name: "ticker", type: "string", required: true, desc: "Stock ticker symbol." },
        ]}
      />
      <CodeBlock
        filename="Response"
        code={`{
  "ticker": "AAPL",
  "price": 229.87,
  "bid": 229.85,
  "ask": 229.88,
  "day_change": 1.42,
  "day_change_pct": 0.62,
  "volume": 48211900,
  "as_of": "2025-05-01T19:59:58Z"
}`}
      />
    </Section>
  );
}

function BarsEndpoint() {
  return (
    <Section id="bars" title="GET /bars">
      <p className="text-sm text-muted-foreground">
        Historical OHLCV bars. Use for charts, backtests, or correlating filings to price action.
      </p>
      <Endpoint method="GET" path="/v1/bars" />
      <ParamTable
        rows={[
          { name: "ticker", type: "string", required: true, desc: "Stock ticker symbol." },
          { name: "timeframe", type: "string", required: true, desc: "1m, 5m, 1h, 1d, 1w, 1mo." },
          { name: "from", type: "ISO date", desc: "Start of range (inclusive)." },
          { name: "to", type: "ISO date", desc: "End of range (inclusive)." },
          { name: "limit", type: "integer", desc: "Max bars (default 500, max 5000)." },
        ]}
      />
      <CodeBlock
        filename="Response"
        code={`{
  "ticker": "AAPL",
  "timeframe": "1d",
  "data": [
    { "t": "2025-04-28", "o": 224.10, "h": 227.03, "l": 223.81, "c": 226.40, "v": 41880200 },
    { "t": "2025-04-29", "o": 226.55, "h": 229.99, "l": 225.92, "c": 229.87, "v": 48211900 }
  ]
}`}
      />
    </Section>
  );
}

function FundamentalsEndpoint() {
  return (
    <Section id="fundamentals" title="GET /fundamentals">
      <p className="text-sm text-muted-foreground">
        Live fundamentals derived from latest filings + current price: market cap, P/E, EPS, sector.
      </p>
      <Endpoint method="GET" path="/v1/fundamentals" />
      <ParamTable
        rows={[
          { name: "ticker", type: "string", required: true, desc: "Stock ticker symbol." },
        ]}
      />
      <CodeBlock
        filename="Response"
        code={`{
  "ticker": "AAPL",
  "market_cap": 3480000000000,
  "pe_ratio": 35.4,
  "eps_ttm": 6.49,
  "dividend_yield": 0.0044,
  "shares_outstanding": 15140000000,
  "sector": "Technology",
  "industry": "Consumer Electronics",
  "latest_filing": { "type": "10-K", "date": "2024-11-01" }
}`}
      />
    </Section>
  );
}
