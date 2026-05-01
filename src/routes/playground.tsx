import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Play, Zap } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { CodeBlock } from "@/components/CodeBlock";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  mockResponse,
  ENDPOINT_PARAMS,
  type Endpoint,
  type PlaygroundResponse,
} from "@/lib/mockApi";

export const Route = createFileRoute("/playground")({
  head: () => ({
    meta: [
      { title: "API Playground — SECStream" },
      { name: "description", content: "Test SECStream API endpoints live in the browser. Filings, quotes, bars, and fundamentals." },
    ],
  }),
  component: PlaygroundPage,
});

const ENDPOINTS: { id: Endpoint; group: string }[] = [
  { id: "/filings", group: "Filings" },
  { id: "/company", group: "Filings" },
  { id: "/search", group: "Filings" },
  { id: "/quote", group: "Market" },
  { id: "/bars", group: "Market" },
  { id: "/fundamentals", group: "Market" },
];

function PlaygroundPage() {
  const { user } = useAuth();
  const [endpoint, setEndpoint] = useState<Endpoint>("/filings");
  const [params, setParams] = useState<Record<string, string>>({
    ticker: "AAPL",
    type: "10-K",
    include: "market",
  });
  const [response, setResponse] = useState<PlaygroundResponse | null>(null);
  const [running, setRunning] = useState(false);

  const paramDefs = ENDPOINT_PARAMS[endpoint];
  const queryString = useMemo(() => {
    const usable = paramDefs
      .filter((p) => params[p.name])
      .map((p) => `${p.name}=${encodeURIComponent(params[p.name])}`)
      .join("&");
    return usable ? `?${usable}` : "";
  }, [params, paramDefs]);

  const keyDisplay = user ? user.apiKey.slice(0, 14) + "..." : "sk_live_demo_...";

  const curl = `curl https://api.secstream.dev/v1${endpoint}${queryString} \\
  -H "Authorization: Bearer ${keyDisplay}"`;

  const onRun = () => {
    setRunning(true);
    // Simulate network latency for realism
    const result = mockResponse({ endpoint, params });
    window.setTimeout(() => {
      setResponse(result);
      setRunning(false);
    }, 320);
  };

  const switchEndpoint = (id: Endpoint) => {
    setEndpoint(id);
    setResponse(null);
    const fresh: Record<string, string> = {};
    ENDPOINT_PARAMS[id].forEach((p) => (fresh[p.name] = p.example));
    setParams(fresh);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Playground
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Try the API live.</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Real response shapes, mocked data. No key required to test — sign up when you're ready to ship.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* Endpoint sidebar */}
          <aside>
            <div className="rounded-xl border border-border bg-card p-2">
              {["Filings", "Market"].map((group) => (
                <div key={group} className="mb-2 last:mb-0">
                  <p className="px-2 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {group}
                  </p>
                  {ENDPOINTS.filter((e) => e.group === group).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => switchEndpoint(e.id)}
                      className={`block w-full rounded-md px-2 py-1.5 text-left font-mono text-sm transition-colors ${
                        endpoint === e.id
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {e.id}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </aside>

          {/* Request builder + response */}
          <div className="space-y-4">
            <section className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
                <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                  GET
                </span>
                <code className="truncate font-mono text-sm">
                  https://api.secstream.dev/v1
                  <span className="text-foreground">{endpoint}</span>
                  <span className="text-muted-foreground">{queryString}</span>
                </code>
              </div>
              <div className="space-y-3 p-4">
                {paramDefs.map((p) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <label className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                      {p.name}
                      {p.required && <span className="ml-0.5 text-destructive">*</span>}
                    </label>
                    <input
                      value={params[p.name] || ""}
                      onChange={(e) => setParams((cur) => ({ ...cur, [p.name]: e.target.value }))}
                      placeholder={p.example}
                      className="flex-1 rounded-md border border-input bg-background/40 px-3 py-1.5 font-mono text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <p className="font-mono text-[11px] text-muted-foreground">
                    Auth: <span className="text-foreground">Bearer {keyDisplay}</span>
                  </p>
                  <Button onClick={onRun} disabled={running} size="sm" className="btn-glow">
                    {running ? (
                      <>
                        <Zap className="animate-pulse" /> Running…
                      </>
                    ) : (
                      <>
                        <Play /> Send request
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </section>

            <CodeBlock code={curl} filename="request.sh" />

            <section className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="dot bg-success animate-pulse-slow" />
                  <span className="font-mono text-xs text-muted-foreground">Response</span>
                </div>
                {response && (
                  <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                    <span className="text-success">{response.status} OK</span>
                    <span>·</span>
                    <span>{response.latencyMs}ms</span>
                  </div>
                )}
              </div>
              <pre className="max-h-[480px] overflow-auto px-4 py-4 font-mono text-[13px] leading-relaxed text-foreground/90">
                <code>
                  {response
                    ? JSON.stringify(response.body, null, 2)
                    : "// Send a request to see the response."}
                </code>
              </pre>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
