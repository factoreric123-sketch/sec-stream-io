import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/examples")({
  head: () => ({
    meta: [
      { title: "API Examples — runnable SEC API recipes | SECStream" },
      {
        name: "description",
        content:
          "Copy-pasteable examples using the SECStream API: insider cluster detector, 10-K diff, top movers, and more.",
      },
      { property: "og:title", content: "API Examples — SECStream" },
      {
        property: "og:description",
        content:
          "Copy-pasteable examples using the SECStream API: insider cluster detector, 10-K diff, top movers, and more.",
      },
    ],
  }),
  component: ExamplesLayout,
});

function ExamplesLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isIndex = pathname === "/examples";
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        {isIndex ? <ExamplesIndex /> : <Outlet />}
      </main>
    </div>
  );
}

const EXAMPLES = [
  {
    slug: "insider-cluster-detector",
    title: "Insider cluster detector",
    blurb:
      "Surface tickers where 3+ insiders bought stock in the last 30 days — a classic bullish signal.",
    tag: "Python",
  },
  {
    slug: "10k-diff",
    title: "10-K filing diff",
    blurb: "Compare two consecutive 10-K filings and pull out balance-sheet deltas.",
    tag: "Node.js",
  },
  {
    slug: "top-insider-sells",
    title: "Top insider sells (this week)",
    blurb: "Rank companies by total dollar value of insider sales over a rolling 7-day window.",
    tag: "curl + jq",
  },
] as const;

function ExamplesIndex() {
  return (
    <>
      <div className="mb-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Examples
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Runnable recipes for the SECStream API
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Each example is a single file you can copy, paste, and run with your API key. No
          framework, no boilerplate.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {EXAMPLES.map((ex) => (
          <Link
            key={ex.slug}
            to="/examples/$slug"
            params={{ slug: ex.slug }}
            className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/60"
          >
            <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
              {ex.tag}
            </span>
            <h2 className="mt-2 text-base font-semibold tracking-tight group-hover:text-primary">
              {ex.title}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{ex.blurb}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
