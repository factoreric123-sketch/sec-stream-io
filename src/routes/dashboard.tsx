import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Copy, Check, RefreshCw, LogOut, BookOpen, AlertTriangle, Play } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/CodeBlock";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, profile, apiKey, loading, logout, regenerateKey } = useAuth();
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
      <DashboardHeader email={profile.email} onLogout={async () => { await logout(); navigate({ to: "/" }); }} />
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
            {apiKey ? (
              <ApiKeyPanel apiKey={apiKey.keyPlaintext} onRegenerate={regenerateKey} />
            ) : (
              <PendingKeyPanel onCreate={regenerateKey} />
            )}
            <UsagePanel userId={user.id} />
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

function DashboardHeader({ email, onLogout }: { email: string; onLogout: () => void }) {
  return (
    <header className="border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-mono text-sm font-semibold">
          <span className="grid h-6 w-6 place-items-center rounded-md border border-primary/40 bg-primary/10 text-primary">§</span>
          SECStream
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-xs text-muted-foreground sm:inline">{email}</span>
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

function ApiKeyPanel({ apiKey, onRegenerate }: { apiKey: string; onRegenerate: () => void }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const masked = apiKey.slice(0, 11) + "•".repeat(20) + apiKey.slice(-4);

  const onCopy = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <Card title="API Key" description="Use this key in the Authorization header.">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 truncate rounded-md border border-border bg-code-bg px-3 py-2 font-mono text-sm">
          {visible ? apiKey : masked}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setVisible((v) => !v)}>
            {visible ? <EyeOff /> : <Eye />}
            {visible ? "Hide" : "Show"}
          </Button>
          <Button variant="outline" size="sm" onClick={onCopy}>
            {copied ? <Check className="text-success" /> : <Copy />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>

      <div className="mt-5 flex items-start justify-between gap-4 rounded-md border border-border/60 bg-background/40 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.78_0.15_85)]" />
          <div>
            <p className="text-sm font-medium">Regenerate key</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your old key will stop working immediately.
            </p>
          </div>
        </div>
        {confirming ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { onRegenerate(); setConfirming(false); }}
            >
              Confirm
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
            <RefreshCw /> Regenerate
          </Button>
        )}
      </div>
    </Card>
  );
}

function UsagePanel() {
  // Mocked usage data — deterministic so chart doesn't jump per render
  const data = useMemo(() => {
    const seed = 7;
    return Array.from({ length: 30 }, (_, i) => {
      const x = Math.sin(i * 1.3 + seed) * 0.5 + 0.5;
      return Math.round(120 + x * 480 + (i / 29) * 200);
    });
  }, []);
  const max = Math.max(...data);
  const today = data[data.length - 1];
  const month = data.reduce((a, b) => a + b, 0);

  return (
    <Card title="Usage" description="Last 30 days">
      <div className="grid grid-cols-3 gap-6 border-b border-border/60 pb-5">
        <Stat label="Today" value={today.toLocaleString()} />
        <Stat label="This month" value={month.toLocaleString()} />
        <Stat label="Limit" value="100,000" subtle />
      </div>
      <div className="mt-5 flex h-32 items-end gap-1">
        {data.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-primary/30 transition-all hover:bg-primary"
            style={{ height: `${(v / max) * 100}%` }}
            title={`${v.toLocaleString()} requests`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>30d ago</span>
        <span>today</span>
      </div>
    </Card>
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
// Returns filings with attached market reaction
const filings = await res.json();
console.log(filings);`;

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
      <Button variant="outline" size="sm" className="mt-6 w-full" disabled>
        Manage billing (coming soon)
      </Button>
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
