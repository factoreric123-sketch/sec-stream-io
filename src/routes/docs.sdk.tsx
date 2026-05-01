import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { CodeBlock } from "@/components/CodeBlock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/docs/sdk")({
  head: () => ({
    meta: [
      { title: "SDK & Examples — SECStream" },
      {
        name: "description",
        content: "Copy-paste SDK snippets in curl, Node.js, Python, and a TypeScript client for SECStream.",
      },
    ],
  }),
  component: SdkPage,
});

const langs = ["curl", "Node.js", "Python", "Python (async)"] as const;
type Lang = (typeof langs)[number];

const examples: Record<string, Record<Lang, string>> = {
  filings: {
    curl: `curl -H "Authorization: Bearer $SECSTREAM_KEY" \\
  "https://sec-stream-io.lovable.app/api/public/v1/filings?ticker=AAPL&limit=10"`,
    "Node.js": `const res = await fetch(
  "https://sec-stream-io.lovable.app/api/public/v1/filings?ticker=AAPL&limit=10",
  { headers: { Authorization: \`Bearer \${process.env.SECSTREAM_KEY}\` } }
);
const json = await res.json();
console.log(json.data);`,
    Python: `import os, requests
r = requests.get(
    "https://sec-stream-io.lovable.app/api/public/v1/filings",
    params={"ticker": "AAPL", "limit": 10},
    headers={"Authorization": f"Bearer {os.environ['SECSTREAM_KEY']}"},
)
print(r.json()["data"])`,
    "Python (async)": `import os, httpx, asyncio

async def main():
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://sec-stream-io.lovable.app/api/public/v1/filings",
            params={"ticker": "AAPL", "limit": 10},
            headers={"Authorization": f"Bearer {os.environ['SECSTREAM_KEY']}"},
        )
        print(r.json()["data"])

asyncio.run(main())`,
  },
  insider: {
    curl: `curl -H "Authorization: Bearer $SECSTREAM_KEY" \\
  "https://sec-stream-io.lovable.app/api/public/v1/insider?ticker=TSLA&limit=25"`,
    "Node.js": `const res = await fetch(
  "https://sec-stream-io.lovable.app/api/public/v1/insider?ticker=TSLA&limit=25",
  { headers: { Authorization: \`Bearer \${process.env.SECSTREAM_KEY}\` } }
);
console.log(await res.json());`,
    Python: `import os, requests
r = requests.get(
    "https://sec-stream-io.lovable.app/api/public/v1/insider",
    params={"ticker": "TSLA", "limit": 25},
    headers={"Authorization": f"Bearer {os.environ['SECSTREAM_KEY']}"},
)
print(r.json())`,
    "Python (async)": `import os, httpx, asyncio

async def main():
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://sec-stream-io.lovable.app/api/public/v1/insider",
            params={"ticker": "TSLA", "limit": 25},
            headers={"Authorization": f"Bearer {os.environ['SECSTREAM_KEY']}"},
        )
        print(r.json())

asyncio.run(main())`,
  },
};

const tsClient = `// secstream.ts — drop into your project. No deps.
export type SECStreamOptions = { baseUrl?: string };

export class SECStream {
  private base: string;
  constructor(private apiKey: string, opts: SECStreamOptions = {}) {
    this.base = opts.baseUrl ?? "https://sec-stream-io.lovable.app/api/public/v1";
  }

  private async req<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(this.base + path);
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    const res = await fetch(url, {
      headers: { Authorization: \`Bearer \${this.apiKey}\` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message ?? \`HTTP \${res.status}\`);
    }
    return res.json() as Promise<T>;
  }

  filings(opts: { ticker: string; limit?: number; cursor?: string; type?: string }) {
    return this.req("/filings", opts);
  }
  company(opts: { ticker: string }) { return this.req("/company", opts); }
  insider(opts: { ticker: string; limit?: number; cursor?: string }) {
    return this.req("/insider", opts);
  }
  search(opts: { q: string; limit?: number; cursor?: string }) {
    return this.req("/search", opts);
  }
  fundamentals(opts: { ticker: string }) { return this.req("/fundamentals", opts); }
  quote(opts: { ticker: string }) { return this.req("/quote", opts); }
  clusters(opts: { ticker?: string; limit?: number; cursor?: string }) {
    return this.req("/clusters", opts);
  }
}

// usage:
// const sec = new SECStream(process.env.SECSTREAM_KEY!);
// const { data } = await sec.filings({ ticker: "AAPL" });`;

const pyClient = `# secstream.py — drop into your project. Only depends on requests.
import requests
from typing import Optional

class SECStream:
    def __init__(self, api_key: str, base_url: str = "https://sec-stream-io.lovable.app/api/public/v1"):
        self.api_key = api_key
        self.base_url = base_url

    def _get(self, path: str, **params):
        params = {k: v for k, v in params.items() if v is not None}
        r = requests.get(
            f"{self.base_url}{path}",
            params=params,
            headers={"Authorization": f"Bearer {self.api_key}"},
            timeout=30,
        )
        if not r.ok:
            try:
                msg = r.json().get("error", {}).get("message", r.text)
            except Exception:
                msg = r.text
            raise RuntimeError(f"SECStream {r.status_code}: {msg}")
        return r.json()

    def filings(self, ticker: str, limit: int = 25, cursor: Optional[str] = None, type: Optional[str] = None):
        return self._get("/filings", ticker=ticker, limit=limit, cursor=cursor, type=type)

    def company(self, ticker: str): return self._get("/company", ticker=ticker)
    def insider(self, ticker: str, limit: int = 25, cursor: Optional[str] = None):
        return self._get("/insider", ticker=ticker, limit=limit, cursor=cursor)
    def search(self, q: str, limit: int = 25, cursor: Optional[str] = None):
        return self._get("/search", q=q, limit=limit, cursor=cursor)
    def fundamentals(self, ticker: str): return self._get("/fundamentals", ticker=ticker)
    def quote(self, ticker: str): return self._get("/quote", ticker=ticker)
    def clusters(self, ticker: Optional[str] = None, limit: int = 25, cursor: Optional[str] = None):
        return self._get("/clusters", ticker=ticker, limit=limit, cursor=cursor)`;

function SdkPage() {
  const [lang, setLang] = useState<Lang>("curl");
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">SDK & Examples</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Drop-in clients</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          No npm package needed. Copy these snippets straight into your project. They cover every endpoint with proper
          error handling and pagination.
        </p>

        <div className="mt-8 flex gap-2">
          {langs.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                lang === l
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {l}
            </button>
          ))}
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">List filings</h2>
          <CodeBlock code={examples.filings[lang]} />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Insider transactions</h2>
          <CodeBlock code={examples.insider[lang]} />
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">Tiny TypeScript client</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Copy this into <code className="font-mono text-xs">src/lib/secstream.ts</code>.
          </p>
          <CodeBlock code={tsClient} language="typescript" />
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">Tiny Python client</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Save as <code className="font-mono text-xs">secstream.py</code> in your project.
          </p>
          <CodeBlock code={pyClient} language="python" />
        </section>

        <section className="mt-12 rounded-lg border border-border/60 bg-card p-6">
          <h3 className="font-semibold">Webhooks</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Verify the <code className="font-mono text-xs">X-SECStream-Signature</code> header on inbound deliveries:
          </p>
          <CodeBlock
            language="typescript"
            code={`import { createHmac, timingSafeEqual } from "crypto";

export function verifyWebhook(rawBody: string, header: string | null, secret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const sig = header.slice("sha256=".length);
  if (sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}`}
          />
        </section>
      </main>
    </div>
  );
}
