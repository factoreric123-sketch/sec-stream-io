import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Zap, Database, Code2, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { CodeBlock } from "@/components/CodeBlock";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const exampleResponse = `{
  "company": "Apple Inc.",
  "ticker": "AAPL",
  "cik": "0000320193",
  "filing_type": "10-K",
  "filing_date": "2024-11-01",
  "period_of_report": "2024-09-28",
  "accession_number": "0000320193-24-000123",
  "url": "https://www.sec.gov/Archives/edgar/data/320193/...",
  "sections": {
    "business": "Apple Inc. designs, manufactures...",
    "risk_factors": "The Company's business...",
    "md_and_a": "Fiscal 2024 highlights..."
  },
  "financials": {
    "revenue": 391035000000,
    "net_income": 93736000000,
    "currency": "USD"
  }
}`;

const curlExample = `curl https://api.secstream.dev/v1/filings \\
  -H "Authorization: Bearer sk_live_..." \\
  -G -d ticker=AAPL -d type=10-K`;

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
              <span className="font-mono">v1 API · live</span>
            </div>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl text-gradient">
              SEC filings in seconds.
              <br />
              Clean, structured, API-ready.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-balance text-base text-muted-foreground md:text-lg">
              The fastest way to query EDGAR. One endpoint, one key, one flat price.
              Built for developers who don't want to parse XBRL.
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
              <CodeBlock code={exampleResponse} filename="response.json" />
            </div>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              What you get
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              An API that actually feels designed.
            </h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
            {[
              {
                icon: Database,
                title: "Structured filings",
                body: "10-K, 10-Q, 8-K, S-1, and more — parsed into clean JSON with extracted sections.",
              },
              {
                icon: Zap,
                title: "Fast responses",
                body: "Aggressively cached. P95 under 120ms for hot tickers. No XBRL parsing on your end.",
              },
              {
                icon: Code2,
                title: "One endpoint to learn",
                body: "Query by ticker, form type, or date range. Predictable params. No SDK needed.",
              },
              {
                icon: ShieldCheck,
                title: "Authenticated by key",
                body: "Bearer token auth. Rotate anytime from your dashboard. Per-key request logs.",
              },
              {
                icon: Database,
                title: "Real-time updates",
                body: "New filings indexed within minutes of EDGAR publication.",
              },
              {
                icon: Code2,
                title: "Built for builders",
                body: "Traders, analysts, devs. Use it for screeners, backtests, or LLM pipelines.",
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

      {/* Who it's for */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-3">
          {[
            {
              tag: "Traders",
              title: "Move on filings before the news cycle.",
              body: "Stream 8-Ks the moment they hit EDGAR. Build alerting pipelines without scraping.",
            },
            {
              tag: "Analysts",
              title: "Skip the manual Ctrl-F.",
              body: "Get pre-extracted Risk Factors, MD&A, and financial sections as plain text.",
            },
            {
              tag: "Developers",
              title: "Ship the feature, not the parser.",
              body: "Drop one HTTP call into your stack. We handle EDGAR's quirks so you don't have to.",
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
            Competitors charge thousands. We charge ten dollars.
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
                "Unlimited endpoints (/filings, /company, /search)",
                "100,000 requests / month",
                "All filing types (10-K, 10-Q, 8-K, S-1, …)",
                "Real-time filing indexing",
                "Per-request usage logs",
                "Cancel anytime",
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
