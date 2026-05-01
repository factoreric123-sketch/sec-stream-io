import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Zap, Database, Code2, ShieldCheck, LineChart, Layers, X } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { CodeBlock } from "@/components/CodeBlock";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SECStream — SEC filings + market data in one API" },
      { name: "description", content: "The only API that combines SEC EDGAR filings with live market data. Query a 10-K and get the price reaction in the same call. $10/month, flat." },
      { property: "og:title", content: "SECStream — SEC filings + market data in one API" },
      { property: "og:description", content: "Filings + prices in one call. $10/month, flat. Built for traders, analysts, and developers." },
    ],
  }),
  component: LandingPage,
});

const combinedResponse = `{
  "company": "Apple Inc.",
  "ticker": "AAPL",
  "filing_type": "10-K",
  "filing_date": "2024-11-01",
  "sections": {
    "risk_factors": "The Company's business...",
    "md_and_a": "Fiscal 2024 highlights..."
  },
  "financials": {
    "revenue": 391035000000,
    "net_income": 93736000000
  },
  "market": {
    "price_at_filing": 222.91,
    "price_t_plus_1d": 222.01,
    "price_t_plus_7d": 229.54,
    "reaction_7d_pct": 2.97,
    "volume_t_plus_1d": 56822500,
    "market_cap": 3380000000000
  }
}`;

const curlExample = `curl https://api.secstream.dev/v1/filings \\
  -H "Authorization: Bearer sk_live_..." \\
  -G -d ticker=AAPL -d type=10-K \\
  -d include=market`;

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <div className="absolute inset-0 hero-glow pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-20 md:pt-32 md:pb-28">
          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <span className="dot bg-success animate-pulse-slow" />
              <span className="font-mono">filings + market data · v1 live</span>
            </div>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl text-gradient">
              SEC filings and market data.
              <br />
              One API. One key.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-balance text-base text-muted-foreground md:text-lg">
              Query a 10-K and get the price reaction in the same call.
              The only API that joins EDGAR filings with quotes, bars, and fundamentals — for $10/month.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="btn-glow">
                <Link to="/signup">
                  Get your API key
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/docs">Read the docs</Link>
              </Button>
            </div>
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              $10/month · cancel anytime · no credit card to view docs
            </p>
          </div>

          {/* Code preview */}
          <div className="relative mx-auto mt-16 max-w-3xl animate-fade-up [animation-delay:120ms]">
            <div className="absolute inset-x-12 -inset-y-4 rounded-2xl bg-primary/10 blur-3xl" />
            <div className="relative grid gap-3 md:grid-cols-[1fr_1.2fr]">
              <CodeBlock code={curlExample} filename="request.sh" />
              <CodeBlock code={combinedResponse} filename="response.json" />
            </div>
            <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              ↑ filing + financials + price reaction · one request
            </p>
          </div>
        </div>
      </section>

      {/* The pitch */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              Why SECStream
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Filings and prices belong together.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Every other API forces you to stitch two sources. We do it server-side, cached,
              and return the joined object in milliseconds.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
            {[
              {
                icon: Database,
                title: "Structured filings",
                body: "10-K, 10-Q, 8-K, S-1, and more — parsed into clean JSON with extracted sections.",
              },
              {
                icon: LineChart,
                title: "Live market data",
                body: "Real-time quotes, OHLCV bars, and fundamentals. Every ticker EDGAR covers, we price.",
              },
              {
                icon: Layers,
                title: "The combined endpoint",
                body: "?include=market on /filings returns price at filing, +1d, +7d. Backtest catalysts in one call.",
              },
              {
                icon: Zap,
                title: "Fast responses",
                body: "Aggressively cached. P95 under 120ms for hot tickers. No XBRL parsing on your end.",
              },
              {
                icon: Code2,
                title: "One endpoint to learn",
                body: "Predictable params, JSON in, JSON out. No SDK needed. Works from any language.",
              },
              {
                icon: ShieldCheck,
                title: "Built for builders",
                body: "Bearer auth. Per-request logs. Webhooks for new filings. Rotate keys anytime.",
              },
            ].map((f) => (
              <div key={f.title} className="bg-card p-6">
                <f.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 font-medium">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-10 max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              How we compare
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Two APIs in one. A fraction of the price.
            </h2>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-background/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-mono">Feature</th>
                  <th className="px-5 py-3 font-mono">
                    <span className="text-primary">SECStream</span>
                  </th>
                  <th className="px-5 py-3 font-mono">sec-api.io</th>
                  <th className="px-5 py-3 font-mono">polygon.io</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["SEC filings (parsed)", true, true, false],
                  ["Real-time market data", true, false, true],
                  ["Filing + price reaction", true, false, false],
                  ["Single endpoint, one key", true, false, false],
                  ["Starts at $10/month", true, false, false],
                ].map(([label, a, b, c]) => (
                  <tr key={label as string} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3.5">{label}</td>
                    <Cell on={a as boolean} highlight />
                    <Cell on={b as boolean} />
                    <Cell on={c as boolean} />
                  </tr>
                ))}
                <tr>
                  <td className="px-5 py-3.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Entry price
                  </td>
                  <td className="px-5 py-3.5 font-mono font-semibold text-primary">$10/mo</td>
                  <td className="px-5 py-3.5 font-mono text-muted-foreground">$99/mo</td>
                  <td className="px-5 py-3.5 font-mono text-muted-foreground">$29/mo</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            * Competitor pricing per public sites. SECStream gives you both data sources for less than either alone.
          </p>
        </div>
      </section>

      {/* Who it's for */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-3">
          {[
            {
              tag: "Traders",
              title: "Trade the catalyst, not the headline.",
              body: "Stream 8-Ks the moment they hit EDGAR — with the live quote already attached. Zero stitching.",
            },
            {
              tag: "Quants",
              title: "Backtest filings against price.",
              body: "Pull 10 years of 10-Qs with t+1d / t+7d returns pre-joined. Skip the data engineering.",
            },
            {
              tag: "Builders",
              title: "Ship screeners and dashboards faster.",
              body: "Filings, fundamentals, and prices behind one bearer token. One bill. One vendor.",
            },
          ].map((p) => (
            <div key={p.tag}>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{p.tag}</p>
              <h3 className="mt-3 text-xl font-medium tracking-tight">{p.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Pricing</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            One plan. No tiers. No sales calls.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Filings <span className="text-foreground">and</span> market data. Ten dollars.
          </p>

          <div className="relative mx-auto mt-12 max-w-md overflow-hidden rounded-2xl border border-border bg-card p-8 text-left">
            <div className="absolute -inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-semibold tracking-tight">$10</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Everything included.</p>

            <ul className="mt-6 space-y-3 text-sm">
              {[
                "All filings endpoints (/filings, /company, /search)",
                "All market endpoints (/quote, /bars, /fundamentals)",
                "Combined endpoint: filing + price reaction",
                "100,000 requests / month",
                "Real-time filing indexing + webhooks",
                "Per-request usage logs · Cancel anytime",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Button asChild size="lg" className="mt-8 w-full btn-glow">
              <Link to="/signup">
                Get API Key
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-primary">§</span> SECStream
          </div>
          <div className="flex items-center gap-6">
            <Link to="/docs" className="hover:text-foreground">Docs</Link>
            <Link to="/login" className="hover:text-foreground">Log in</Link>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Cell({ on, highlight }: { on: boolean; highlight?: boolean }) {
  return (
    <td className={`px-5 py-3.5 ${highlight ? "bg-primary/[0.04]" : ""}`}>
      {on ? (
        <Check className={`h-4 w-4 ${highlight ? "text-primary" : "text-success"}`} />
      ) : (
        <X className="h-4 w-4 text-muted-foreground/50" />
      )}
    </td>
  );
}
