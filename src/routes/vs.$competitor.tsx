import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

type Row = { feature: string; us: boolean | string; them: boolean | string };

const COMPETITORS: Record<
  string,
  { name: string; tagline: string; rows: Row[] }
> = {
  "sec-api-io": {
    name: "sec-api.io",
    tagline:
      "We're cheaper at the entry tier, ship CSV + bulk endpoints, and give you usage analytics in your dashboard.",
    rows: [
      { feature: "Free tier", us: "Yes (60 req/min)", them: "Limited trial" },
      { feature: "Insider Form 4 endpoint", us: true, them: true },
      { feature: "10-K / 10-Q financials parsed", us: true, them: true },
      { feature: "Bulk POST /filings/batch (100 tickers)", us: true, them: false },
      { feature: "CSV export (Accept: text/csv)", us: true, them: false },
      { feature: "Field selection (?fields=)", us: true, them: false },
      { feature: "Insider cluster detection (built-in)", us: true, them: false },
      { feature: "Webhooks on new filings", us: true, them: true },
      { feature: "In-dashboard usage analytics", us: true, them: "Basic" },
      { feature: "Cursor pagination", us: true, them: true },
      { feature: "Structured error codes", us: true, them: true },
    ],
  },
  edgar: {
    name: "EDGAR (raw)",
    tagline:
      "EDGAR is free but raw. We parse it into structured JSON, dedupe noisy filings, and run on a CDN edge.",
    rows: [
      { feature: "JSON API (no XBRL parsing)", us: true, them: false },
      { feature: "Insider trades parsed (Form 4)", us: true, them: false },
      { feature: "Pre-computed cluster_count", us: true, them: false },
      { feature: "Field selection + CSV export", us: true, them: false },
      { feature: "Webhooks on new filings", us: true, them: false },
      { feature: "Rate limit (per key)", us: "60–600 req/min", them: "10 req/sec shared" },
      { feature: "Free", us: "Free tier + paid", them: true },
      { feature: "Raw filing access", us: true, them: true },
    ],
  },
};

export const Route = createFileRoute("/vs/$competitor")({
  loader: ({ params }) => {
    const data = COMPETITORS[params.competitor];
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const title = loaderData
      ? `SECStream vs ${loaderData.name} — feature comparison`
      : `SECStream vs ${params.competitor}`;
    const description = loaderData
      ? `${loaderData.tagline} See the full feature matrix.`
      : "Compare SEC data API providers.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold">No comparison page for that provider.</h1>
        <Button asChild className="mt-6">
          <Link to="/">Home</Link>
        </Button>
      </main>
    </div>
  ),
  component: VsPage,
});

function Cell({ value }: { value: boolean | string }) {
  if (value === true)
    return <Check className="mx-auto h-4 w-4 text-success" />;
  if (value === false)
    return <X className="mx-auto h-4 w-4 text-muted-foreground/50" />;
  return <span className="text-xs">{value}</span>;
}

function VsPage() {
  const { name, tagline, rows } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Comparison
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          SECStream <span className="text-muted-foreground">vs</span> {name}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">{tagline}</p>

        <div className="mt-10 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card">
              <tr className="border-b border-border/60 text-left">
                <th className="px-4 py-3 font-medium">Feature</th>
                <th className="px-4 py-3 text-center font-medium text-primary">SECStream</th>
                <th className="px-4 py-3 text-center font-medium">{name}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/30 last:border-0">
                  <td className="px-4 py-3">{r.feature}</td>
                  <td className="px-4 py-3 text-center">
                    <Cell value={r.us} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Cell value={r.them} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Try SECStream free
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            60 req/min on the free tier. No credit card. Same data as the big providers, with the
            developer ergonomics they're missing.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button asChild>
              <Link to="/signup">Get free API key</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/docs">View docs</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
