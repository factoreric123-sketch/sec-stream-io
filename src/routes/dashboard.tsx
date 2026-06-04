import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  LogOut,
  BookOpen,
  Play,
  Plus,
  AlertCircle,
} from "lucide-react";
import { useAuth, type ApiKey } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/CodeBlock";
import { WebhooksPanel } from "@/components/WebhooksPanel";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { isAdmin } from "@/lib/admin";
import { useServerFn } from "@tanstack/react-start";
import { createProCheckout } from "@/lib/stripe.functions";
import { toast } from "sonner";

function UpgradeButton({ plan }: { plan: string }) {
  const [loading, setLoading] = useState(false);
  const isActive = plan === "active";
  const endpoint = isActive
    ? "/api/public/v1/billing/portal"
    : "/api/public/stripe-checkout";
  return (
    <Button
      variant={isActive ? "outline" : "default"}
      size="sm"
      className="mt-6 w-full"
      disabled={loading}
      onClick={async () => {
        try {
          setLoading(true);
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            toast.error("You must be signed in.");
            setLoading(false);
            return;
          }
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const body = (await res.json()) as { url?: string; error?: string };
          if (!res.ok || !body.url) {
            throw new Error(body.error ?? `Request failed (${res.status})`);
          }
          window.location.href = body.url;
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Something went wrong");
          setLoading(false);
        }
      }}
    >
      {loading ? "Redirecting…" : isActive ? "Manage subscription" : "Upgrade to Pro — $10/mo"}
    </Button>
  );
}


export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, profile, apiKey, apiKeys, loading, logout, createKey, revokeKey } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user || !profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="font-mono text-xs text-muted-foreground animate-pulse-slow">
          loading session…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader email={profile.email} showAdmin={isAdmin(user)} onLogout={async () => { await logout(); navigate({ to: "/" }); }} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Welcome back.
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <OnboardingWizard apiKey={apiKey?.keyPlaintext ?? null} userId={user.id} />
            <ApiKeysPanel
              apiKeys={apiKeys}
              onCreate={createKey}
              onRevoke={revokeKey}
            />
            <UsagePanel userId={user.id} />
            <WebhooksPanel userId={user.id} />
            <QuickstartPanel apiKey={apiKey?.keyPlaintext ?? "sk_live_..."} />
          </div>
          <div className="space-y-6">
            <AccountPanel plan={profile.plan} renewalDate={profile.renewalDate} email={profile.email} />
            <DocsCard />
          </div>
        </div>
      </main>
    </div>
  );
}

function DashboardHeader({ email, onLogout, showAdmin }: { email: string; onLogout: () => void; showAdmin?: boolean }) {
  return (
    <header className="border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-mono text-sm font-semibold">
          <span className="grid h-6 w-6 place-items-center rounded-md border border-primary/40 bg-primary/10 text-primary">§</span>
          SECStream
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-xs text-muted-foreground sm:inline">{email}</span>
          {showAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">Admin</Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link to="/playground"><Play /> Playground</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/docs"><BookOpen /> Docs</Link>
          </Button>
          <Button onClick={onLogout} variant="outline" size="sm">
            <LogOut /> Logout
          </Button>
        </div>
      </div>
    </header>
  );
}

function Card({ title, description, action, children }: {
  title: string; description?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

// ============================================================================
// API Keys
// ============================================================================

function ApiKeysPanel({
  apiKeys,
  onCreate,
  onRevoke,
}: {
  apiKeys: ApiKey[];
  onCreate: (label?: string, scopes?: string[]) => Promise<ApiKey>;
  onRevoke: (id: string) => Promise<void>;
}) {
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>(["read", "webhooks"]);
  const [revealId, setRevealId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const k = await onCreate(newLabel, newScopes);
      setNewLabel("");
      setNewScopes(["read", "webhooks"]);
      setRevealId(k.id);
    } finally {
      setCreating(false);
    }
  };

  const toggleScope = (s: string) =>
    setNewScopes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const copy = async (id: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1400);
  };

  return (
    <Card
      title="API Keys"
      description="Use these keys in the Authorization header. Scope keys narrowly — e.g. read-only for CI."
    >
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Production, CI)"
            maxLength={50}
            className="flex-1 rounded-md border border-input bg-background/40 px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <Button size="sm" onClick={handleCreate} disabled={creating || newScopes.length === 0}>
            <Plus />
            {creating ? "Creating…" : "New key"}
          </Button>
        </div>
        <div className="flex items-center gap-3 pl-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Scopes
          </span>
          {(["read", "webhooks"] as const).map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={newScopes.includes(s)}
                onChange={() => toggleScope(s)}
                className="h-3.5 w-3.5 cursor-pointer accent-primary"
              />
              <span className="font-mono">{s}</span>
            </label>
          ))}
        </div>
      </div>

      {apiKeys.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed border-border bg-background/40 p-6 text-center text-sm text-muted-foreground">
          No active keys. Create one to start calling the API.
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {apiKeys.map((k) => {
            const visible = revealId === k.id;
            const masked = `${k.keyPrefix}${"•".repeat(20)}${k.keyLast4}`;
            const canReveal = k.keyPlaintext !== null;
            const display = visible && k.keyPlaintext ? k.keyPlaintext : masked;
            const isConfirming = confirmRevoke === k.id;
            return (
              <div
                key={k.id}
                className="rounded-md border border-border bg-background/40 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{k.label}</span>
                      {k.scopes.map((s) => (
                        <span
                          key={s}
                          className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary"
                        >
                          {s}
                        </span>
                      ))}
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {fmtKeyMeta(k)}
                      </span>
                    </div>
                    <div className="mt-1.5 truncate font-mono text-xs text-foreground/80">
                      {display}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRevealId(visible ? null : k.id)}
                      title={canReveal ? (visible ? "Hide" : "Reveal") : "Full key is only shown at creation. Rotate to get a new one."}
                      disabled={!canReveal}
                    >
                      {visible ? <EyeOff /> : <Eye />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => k.keyPlaintext && copy(k.id, k.keyPlaintext)}
                      title="Copy"
                      disabled={!canReveal}
                    >
                      {copiedId === k.id ? (
                        <Check className="text-success" />
                      ) : (
                        <Copy />
                      )}
                    </Button>
                    {isConfirming ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmRevoke(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            await onRevoke(k.id);
                            setConfirmRevoke(null);
                          }}
                        >
                          Revoke
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmRevoke(k.id)}
                        title="Revoke"
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function fmtKeyMeta(k: ApiKey): string {
  const created = new Date(k.createdAt);
  const age = Math.floor((Date.now() - created.getTime()) / 86_400_000);
  const ageStr = age === 0 ? "today" : age === 1 ? "1d ago" : `${age}d ago`;
  const used = k.lastUsedAt
    ? `last used ${relTime(new Date(k.lastUsedAt))}`
    : "never used";
  return `created ${ageStr} · ${used}`;
}

function relTime(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

// ============================================================================
// Usage analytics
// ============================================================================

type UsageRow = {
  endpoint: string;
  status: number;
  latency_ms: number;
  created_at: string;
};

function UsagePanel({ userId }: { userId: string }) {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data } = await supabase
        .from("usage_logs")
        .select("endpoint,status,latency_ms,created_at")
        .eq("user_id", userId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (!alive) return;
      setRows((data ?? []) as UsageRow[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [userId]);

  const stats = useMemo(() => computeStats(rows), [rows]);

  return (
    <Card title="Usage" description="Last 30 days · live from your account">
      <div className="grid grid-cols-2 gap-4 border-b border-border/60 pb-5 sm:grid-cols-4">
        <Stat label="Today" value={stats.today.toLocaleString()} />
        <Stat label="7-day" value={stats.last7d.toLocaleString()} />
        <Stat label="30-day" value={stats.last30d.toLocaleString()} />
        <Stat
          label="Success rate"
          value={stats.last30d > 0 ? `${stats.successRate.toFixed(1)}%` : "—"}
          subtle={stats.last30d === 0}
        />
      </div>

      {/* 30-day bar chart */}
      <div className="mt-5">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Requests per day
        </p>
        <div className="flex h-24 items-end gap-1">
          {stats.daily.map((v, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t transition-all ${v > 0 ? "bg-primary/40 hover:bg-primary" : "bg-border/40"}`}
              style={{
                height: `${Math.max((v / Math.max(...stats.daily, 1)) * 100, 4)}%`,
              }}
              title={`${v.toLocaleString()} requests`}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>30d ago</span>
          <span>{loading ? "…" : "today"}</span>
        </div>
      </div>

      {stats.last30d > 0 && (
        <>
          {/* Status + latency row */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Status breakdown (30d)
              </p>
              <div className="flex gap-1">
                {(["2xx", "4xx", "5xx"] as const).map((band) => {
                  const c = stats.statusBands[band];
                  const pct = stats.last30d > 0 ? (c / stats.last30d) * 100 : 0;
                  const color =
                    band === "2xx"
                      ? "bg-success/60"
                      : band === "4xx"
                        ? "bg-[oklch(0.78_0.15_85)]/60"
                        : "bg-destructive/60";
                  return (
                    <div
                      key={band}
                      className={`h-6 rounded ${color} flex items-center justify-center font-mono text-[10px] text-foreground`}
                      style={{ width: `${Math.max(pct, 6)}%` }}
                      title={`${band}: ${c.toLocaleString()}`}
                    >
                      {pct >= 8 ? band : ""}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-4 font-mono text-[10px] text-muted-foreground">
                <span>2xx: {stats.statusBands["2xx"].toLocaleString()}</span>
                <span>4xx: {stats.statusBands["4xx"].toLocaleString()}</span>
                <span>5xx: {stats.statusBands["5xx"].toLocaleString()}</span>
              </div>
            </div>

            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Latency (24h)
              </p>
              <div className="grid grid-cols-3 gap-2">
                <LatencyStat label="p50" value={stats.latency.p50} />
                <LatencyStat label="p95" value={stats.latency.p95} />
                <LatencyStat label="p99" value={stats.latency.p99} />
              </div>
            </div>
          </div>

          {/* Top endpoints */}
          {stats.topEndpoints.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Top endpoints (30d)
              </p>
              <div className="space-y-1">
                {stats.topEndpoints.map(([ep, count]) => {
                  const pct = (count / stats.topEndpoints[0][1]) * 100;
                  return (
                    <div key={ep} className="flex items-center gap-3">
                      <code className="w-32 shrink-0 truncate font-mono text-xs">{ep}</code>
                      <div className="flex-1">
                        <div
                          className="h-2 rounded-full bg-primary/40"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right font-mono text-xs text-muted-foreground">
                        {count.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent errors */}
          {stats.recentErrors.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <AlertCircle className="h-3 w-3 text-destructive" />
                Recent errors
              </p>
              <div className="overflow-hidden rounded-md border border-border/60">
                <table className="w-full text-xs">
                  <thead className="bg-background/40">
                    <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2">When</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Endpoint</th>
                      <th className="px-3 py-2 text-right">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentErrors.map((r, i) => (
                      <tr key={i} className="border-t border-border/40">
                        <td className="px-3 py-1.5 font-mono text-muted-foreground">
                          {relTime(new Date(r.created_at))}
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${r.status >= 500 ? "bg-destructive/15 text-destructive" : "bg-[oklch(0.78_0.15_85)]/15 text-[oklch(0.78_0.15_85)]"}`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 font-mono">{r.endpoint}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                          {r.latency_ms}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {stats.last30d === 0 && !loading && (
        <p className="mt-6 text-xs text-muted-foreground">
          No requests yet. Try the{" "}
          <Link to="/playground" className="text-primary hover:underline">Playground</Link>{" "}
          to generate some traffic.
        </p>
      )}
    </Card>
  );
}

function computeStats(rows: UsageRow[]) {
  const now = Date.now();
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);

  const daily = Array(30).fill(0);
  let today = 0;
  let last7d = 0;
  let last30d = 0;
  let success = 0;
  const statusBands = { "2xx": 0, "4xx": 0, "5xx": 0 } as Record<string, number>;
  const endpointCounts = new Map<string, number>();
  const last24hLatencies: number[] = [];
  const recentErrors: UsageRow[] = [];

  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    const ageMs = now - t;
    last30d++;
    if (ageMs < 7 * 86_400_000) last7d++;

    const d = new Date(r.created_at); d.setHours(0, 0, 0, 0);
    if (d.getTime() === today0.getTime()) today++;
    const dayDiff = Math.round((today0.getTime() - d.getTime()) / 86_400_000);
    const idx = 29 - dayDiff;
    if (idx >= 0 && idx < 30) daily[idx]++;

    if (r.status >= 200 && r.status < 300) {
      success++;
      statusBands["2xx"]++;
    } else if (r.status >= 400 && r.status < 500) {
      statusBands["4xx"]++;
    } else if (r.status >= 500) {
      statusBands["5xx"]++;
    }

    endpointCounts.set(r.endpoint, (endpointCounts.get(r.endpoint) ?? 0) + 1);

    if (ageMs < 86_400_000) last24hLatencies.push(r.latency_ms);
    if (r.status >= 400 && recentErrors.length < 20) recentErrors.push(r);
  }

  const topEndpoints = Array.from(endpointCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    daily,
    today,
    last7d,
    last30d,
    successRate: last30d > 0 ? (success / last30d) * 100 : 0,
    statusBands,
    topEndpoints,
    latency: percentiles(last24hLatencies),
    recentErrors,
  };
}

function percentiles(arr: number[]): { p50: number; p95: number; p99: number } {
  if (arr.length === 0) return { p50: 0, p95: 0, p99: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const pick = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
  return { p50: pick(50), p95: pick(95), p99: pick(99) };
}

function LatencyStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm">
        {value > 0 ? `${value}ms` : "—"}
      </p>
    </div>
  );
}

function Stat({ label, value, subtle }: { label: string; value: string; subtle?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight ${subtle ? "text-muted-foreground" : ""}`}>
        {value}
      </p>
    </div>
  );
}

// ============================================================================
// Quickstart + Account
// ============================================================================

function QuickstartPanel({ apiKey }: { apiKey: string }) {
  const [tab, setTab] = useState<"curl" | "js">("curl");
  const display = apiKey.slice(0, 14) + "...";

  const curl = `curl https://api.secstream.dev/v1/filings \\
  -H "Authorization: Bearer ${display}" \\
  -G -d ticker=AAPL -d type=10-K \\
  -d include=market`;

  const js = `const res = await fetch(
  "https://api.secstream.dev/v1/filings?ticker=AAPL&type=10-K&include=market",
  { headers: { Authorization: "Bearer ${display}" } }
);
const { data, pagination } = await res.json();
console.log(data.length, "filings, next cursor:", pagination.next_cursor);`;

  return (
    <Card
      title="Quickstart"
      description="Make your first request in 10 seconds."
      action={
        <div className="flex rounded-md border border-border bg-background/40 p-0.5 text-xs">
          {(["curl", "js"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded px-2.5 py-1 font-mono uppercase tracking-wider transition-colors ${
                tab === t ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      }
    >
      <CodeBlock code={tab === "curl" ? curl : js} language={tab} />
    </Card>
  );
}

function AccountPanel({ plan, renewalDate, email }: { plan: string; renewalDate: string; email: string }) {
  const renewal = new Date(renewalDate).toLocaleDateString(undefined, {
    month: "long", day: "numeric", year: "numeric",
  });
  const planColor =
    plan === "active" ? "text-success" : plan === "past_due" ? "text-[oklch(0.78_0.15_85)]" : "text-destructive";

  return (
    <Card title="Account">
      <dl className="space-y-4 text-sm">
        <Row label="Email" value={<span className="font-mono text-xs">{email}</span>} />
        <Row
          label="Status"
          value={
            <span className={`flex items-center gap-2 ${planColor}`}>
              <span className={`dot ${plan === "active" ? "bg-success animate-pulse-slow" : "bg-current"}`} />
              <span className="capitalize">{plan.replace("_", " ")}</span>
            </span>
          }
        />
        <Row label="Plan" value="$10 / month" />
        <Row label="Renews" value={renewal} />
      </dl>
      <UpgradeButton plan={plan} />

    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function DocsCard() {
  return (
    <Card title="Reference">
      <p className="text-sm text-muted-foreground">
        Full endpoint reference, parameters, and examples.
      </p>
      <Button asChild variant="outline" size="sm" className="mt-4 w-full">
        <Link to="/docs"><BookOpen /> Open API docs</Link>
      </Button>
    </Card>
  );
}
