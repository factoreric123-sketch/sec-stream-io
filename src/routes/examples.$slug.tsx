import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { CodeBlock } from "@/components/CodeBlock";
import { Button } from "@/components/ui/button";

const RECIPES: Record<string, {
  title: string;
  description: string;
  language: "python" | "javascript" | "bash";
  code: string;
}> = {
  "insider-cluster-detector": {
    title: "Insider cluster detector",
    description:
      "Find tickers where 3+ different insiders bought in the last 30 days. Returns a sorted list, biggest cluster first.",
    language: "python",
    code: `import os, requests
from collections import defaultdict

API = "https://sec-stream-io.lovable.app/api/public/v1"
KEY = os.environ["SECSTREAM_KEY"]
H = {"Authorization": f"Bearer {KEY}"}

# /clusters returns Form 4 buys with cluster_count >= min already pre-computed
res = requests.get(f"{API}/clusters", params={"min": 3, "limit": 100}, headers=H).json()

by_ticker = defaultdict(set)
for row in res["data"]:
    if row.get("transaction_code") == "P":  # P = open-market purchase
        by_ticker[row["ticker"]].add(row["insider_name"])

ranked = sorted(by_ticker.items(), key=lambda kv: -len(kv[1]))
for ticker, insiders in ranked[:20]:
    print(f"{ticker:6}  {len(insiders)} insiders: {', '.join(list(insiders)[:3])}…")
`,
  },
  "10k-diff": {
    title: "10-K filing diff",
    description:
      "Pull the two most recent 10-K filings for a ticker and print the year-over-year change in headline financials.",
    language: "javascript",
    code: `const API = "https://sec-stream-io.lovable.app/api/public/v1";
const KEY = process.env.SECSTREAM_KEY;
const ticker = process.argv[2] || "AAPL";

const res = await fetch(\`\${API}/filings?ticker=\${ticker}&type=10-K&limit=2\`, {
  headers: { Authorization: \`Bearer \${KEY}\` },
});
const { data } = await res.json();
const [curr, prev] = data.data;
if (!prev) {
  console.log("Need at least 2 10-K filings.");
  process.exit(1);
}

const fields = ["revenue", "net_income", "total_assets", "total_debt"];
console.log(\`\${ticker} 10-K diff (\${curr.period_of_report} vs \${prev.period_of_report})\`);
for (const f of fields) {
  const a = curr[f], b = prev[f];
  if (!a || !b) continue;
  const pct = (((a - b) / b) * 100).toFixed(1);
  console.log(\`  \${f.padEnd(15)} \${a.toLocaleString().padStart(15)}  (\${pct > 0 ? "+" : ""}\${pct}%)\`);
}
`,
  },
  "top-insider-sells": {
    title: "Top insider sells (this week)",
    description:
      "Aggregate the top 10 companies by insider sell value over the last 7 days. Pure curl + jq, no SDK.",
    language: "bash",
    code: `#!/bin/bash
# Requires: curl, jq

API="https://sec-stream-io.lovable.app/api/public/v1"
KEY="\${SECSTREAM_KEY:?Set SECSTREAM_KEY}"

# Pull recent insider rows for a watchlist of tickers in one batch call
curl -s -X POST "$API/filings/batch" \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tickers": ["AAPL","MSFT","GOOGL","TSLA","NVDA","META","AMZN","NFLX","CRM","ORCL"],
    "type": "4",
    "limit_per_ticker": 20,
    "fields": "ticker,filed_at,transaction_code,total_value"
  }' | jq '
    [
      .data.results | to_entries[] |
      {ticker: .key,
       sells: [.value[] | select(.transaction_code == "S") | .total_value // 0] | add // 0}
    ]
    | sort_by(-.sells) | .[0:10]
  '
`,
  },
};

export const Route = createFileRoute("/examples/$slug")({
  loader: ({ params }) => {
    const recipe = RECIPES[params.slug];
    if (!recipe) throw notFound();
    return recipe;
  },
  head: ({ loaderData, params }) => {
    const r = loaderData;
    const title = r ? `${r.title} — SECStream Example` : `Example — SECStream`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content:
            r?.description ??
            `Runnable code recipe for the SECStream API.`,
        },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content:
            r?.description ??
            `Runnable code recipe for the SECStream API.`,
        },
        { name: "og:url", content: `/examples/${params.slug}` },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <div className="text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div>
      <p className="text-sm text-muted-foreground">Example not found.</p>
      <Button asChild className="mt-4" variant="outline">
        <Link to="/examples">Back to examples</Link>
      </Button>
    </div>
  ),
  component: ExamplePage,
});

function ExamplePage() {
  const recipe = Route.useLoaderData();
  return (
    <article>
      <Link
        to="/examples"
        className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All examples
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{recipe.title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{recipe.description}</p>
      <div className="mt-6">
        <CodeBlock language={recipe.language} code={recipe.code} />
      </div>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link to="/signup">Get API key</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/docs">API reference</Link>
        </Button>
      </div>
    </article>
  );
}
