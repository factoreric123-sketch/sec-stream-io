import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog — SECStream" },
      { name: "description", content: "What's new in SECStream: API releases, endpoints, and improvements." },
    ],
  }),
  component: ChangelogPage,
});

type Entry = {
  date: string;
  version: string;
  tag: "release" | "feature" | "fix" | "improvement";
  title: string;
  body: string;
  items?: string[];
};

const entries: Entry[] = [
  {
    date: "2026-04-28",
    version: "v1.4",
    tag: "feature",
    title: "Filing → market reaction join",
    body: "The /filings endpoint now accepts include=market to attach price-at-filing, t+1d, and t+7d returns inline. One request, one bill.",
    items: [
      "New `market` object on filing responses",
      "Reaction percentages for 1d, 7d, 30d windows",
      "Cached server-side — no extra latency",
    ],
  },
  {
    date: "2026-04-12",
    version: "v1.3",
    tag: "release",
    title: "Market data endpoints (GA)",
    body: "Quotes, OHLCV bars, and fundamentals are now generally available — included in the $10/month plan.",
    items: [
      "GET /quote — real-time price, bid/ask, volume",
      "GET /bars — historical candles, 1m to 1mo timeframes",
      "GET /fundamentals — derived from latest 10-K/10-Q + prices",
    ],
  },
  {
    date: "2026-03-30",
    version: "v1.2",
    tag: "improvement",
    title: "P95 latency cut by 38%",
    body: "Rewrote the filing parser cache layer. Hot tickers (AAPL, MSFT, NVDA, TSLA) now return in under 60ms p95.",
  },
  {
    date: "2026-03-15",
    version: "v1.1",
    tag: "feature",
    title: "Webhooks for new filings",
    body: "Subscribe to filing events by ticker or form type. Receive HMAC-signed POSTs within seconds of EDGAR publication.",
  },
  {
    date: "2026-02-20",
    version: "v1.0",
    tag: "release",
    title: "SECStream v1 — public launch",
    body: "Structured SEC filings via REST. One key, $10/month, 100k requests included.",
    items: [
      "GET /filings, /company, /search",
      "Bearer token auth + per-request usage logs",
      "JSON-only, predictable parameters",
    ],
  },
];

const tagStyles: Record<Entry["tag"], string> = {
  release: "border-primary/40 bg-primary/10 text-primary",
  feature: "border-success/40 bg-success/10 text-success",
  fix: "border-destructive/40 bg-destructive/10 text-destructive",
  improvement: "border-border bg-accent text-foreground",
};

function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Changelog</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Shipped.</h1>
          <p className="mt-2 text-muted-foreground">
            Every release, every fix. Subscribe via the webhook on /releases (coming soon).
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden />
          <div className="space-y-10">
            {entries.map((e) => (
              <article key={e.version} className="relative pl-8">
                <span className="absolute left-0 top-2 h-[15px] w-[15px] rounded-full border-2 border-background bg-primary shadow-[0_0_0_1px_var(--color-border)]" />
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm text-foreground">{e.version}</span>
                  <span className="font-mono text-xs text-muted-foreground">{e.date}</span>
                  <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tagStyles[e.tag]}`}>
                    {e.tag}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-medium tracking-tight">{e.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{e.body}</p>
                {e.items && (
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {e.items.map((it) => (
                      <li key={it} className="flex gap-2 text-muted-foreground">
                        <span className="text-primary">→</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
