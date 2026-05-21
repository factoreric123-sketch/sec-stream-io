import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ArrowRight, FileText, TrendingUp } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { CodeBlock } from "@/components/CodeBlock";
import { Button } from "@/components/ui/button";

const getCompany = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ ticker: z.string().min(1).max(10) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ticker = data.ticker.toUpperCase();
    const { data: company } = await supabaseAdmin
      .from("sec_filings")
      .select("ticker,company_name,cik")
      .eq("ticker", ticker)
      .order("filing_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!company) return null;

    const [{ data: filings }, { data: insider }] = await Promise.all([
      supabaseAdmin
        .from("sec_filings")
        .select("accession_number,form_type,filing_date,report_date,description,filing_url")
        .eq("ticker", ticker)
        .order("filing_date", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("insider_form4_filings")
        .select(
          "accession,filed_at,reporting_owner_name,reporting_owner_title,transaction_code,shares,price_per_share,transaction_value"
        )
        .eq("ticker", ticker)
        .order("filed_at", { ascending: false })
        .limit(8),
    ]);

    return { company, filings: filings ?? [], insider: insider ?? [] };
  });

export const Route = createFileRoute("/companies/$ticker")({
  loader: async ({ params }) => {
    const result = await getCompany({ data: { ticker: params.ticker } });
    if (!result) throw notFound();
    return result;
  },
  head: ({ loaderData, params }) => {
    const ticker = params.ticker.toUpperCase();
    const name = loaderData?.company.company_name ?? ticker;
    const title = `${ticker} — ${name} SEC Filings & Insider Trades | SECStream API`;
    const description = `Latest SEC filings and insider transactions for ${name} (${ticker}). Get this data via REST API in seconds.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="font-mono text-xs text-destructive">{error.message}</p>
      </main>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold">Ticker not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We don't have any SEC filings indexed for that ticker yet.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Back to home</Link>
        </Button>
      </main>
    </div>
  ),
  component: TickerPage,
});

function fmtMoney(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toISOString().slice(0, 10);
}

function TickerPage() {
  const { company, filings, insider } = Route.useLoaderData();
  const ticker = company.ticker ?? "";
  const curl = `curl -H "Authorization: Bearer sk_live_..." \\
  "https://sec-stream-io.lovable.app/api/public/v1/filings?ticker=${ticker}"`;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-6 border-b border-border pb-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              CIK {company.cik ?? "—"}
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              {company.company_name}{" "}
              <span className="font-mono text-2xl text-muted-foreground">({ticker})</span>
            </h1>
          </div>
          <Button asChild size="lg">
            <Link to="/signup">
              Get this via API <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <Section title="Recent filings" icon={<FileText className="h-4 w-4" />}>
            {filings.length === 0 ? (
              <Empty>No filings indexed.</Empty>
            ) : (
              <ul className="divide-y divide-border/60">
                {filings.map((f) => (
                  <li key={f.accession_number} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <span className="font-mono text-xs text-primary">{f.form_type}</span>
                      <span className="ml-2 text-muted-foreground">{f.accession_number}</span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {fmtDate(f.filing_date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Insider activity" icon={<TrendingUp className="h-4 w-4" />}>
            {insider.length === 0 ? (
              <Empty>No insider trades.</Empty>
            ) : (
              <ul className="divide-y divide-border/60">
                {insider.map((i) => (
                  <li key={i.accession} className="py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="truncate font-medium">{i.reporting_owner_name ?? "—"}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {fmtDate(i.filed_at)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {i.reporting_owner_title ?? "—"} · {i.transaction_code ?? "?"} ·{" "}
                      {i.shares?.toLocaleString() ?? "—"} shares ·{" "}
                      <span className="text-foreground">{fmtMoney(i.transaction_value)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="mt-10 rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Get {ticker} data programmatically
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Same data, JSON or CSV, with cursor pagination and field selection. Free tier available.
          </p>
          <div className="mt-4">
            <CodeBlock language="bash" code={curl} />
          </div>
          <div className="mt-4 flex gap-3">
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

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
