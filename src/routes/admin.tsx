import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { isAdmin, ADMIN_EMAILS } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { getAdminStats } from "@/server/admin.functions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

type Stats = Awaited<ReturnType<typeof getAdminStats>>;

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    if (!isAdmin(data.user)) throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
});

function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getAdminStats()
      .then(setStats)
      .catch((e) => setError(e?.message ?? "Failed to load admin stats"));
  }, [user]);

  if (!isAdmin(user)) return null;

  if (ADMIN_EMAILS.length === 0) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div className="max-w-md rounded-lg border border-border/60 bg-card p-6">
          <h1 className="text-xl font-semibold">Admin allowlist empty</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your email to <code className="font-mono text-xs">ADMIN_EMAILS</code> in
            <code className="ml-1 font-mono text-xs">src/lib/admin.ts</code> and redeploy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-mono text-sm font-semibold">
            <span className="grid h-6 w-6 place-items-center rounded-md border border-primary/40 bg-primary/10 text-primary">§</span>
            <span>SECStream — Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">User dashboard</Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await logout();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Operations</h1>

        {error && (
          <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!stats && !error && (
          <div className="mt-10 font-mono text-xs text-muted-foreground animate-pulse-slow">loading…</div>
        )}

        {stats && (
          <div className="mt-8 space-y-8">
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Total users" value={stats.totals.users} />
              <Stat label="Active" value={stats.totals.active} accent="text-emerald-500" />
              <Stat label="Past due" value={stats.totals.past_due} accent="text-amber-500" />
              <Stat label="Canceled" value={stats.totals.canceled} accent="text-muted-foreground" />
              <Stat label="Calls 24h" value={stats.totals.calls24h} />
              <Stat label="Calls 7d" value={stats.totals.calls7d} />
              <Stat label="Calls 30d" value={stats.totals.calls30d} />
              <Stat label="MRR (est.)" value={`$${(stats.totals.active * 49).toLocaleString()}`} />
            </section>

            <Panel title="Top users by request volume (7d)">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2">Email</th>
                    <th className="py-2 text-right">Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topUsers.map((u) => (
                    <tr key={u.user_id} className="border-t border-border/40">
                      <td className="py-2 font-mono text-xs">{u.email}</td>
                      <td className="py-2 text-right tabular-nums">{u.count.toLocaleString()}</td>
                    </tr>
                  ))}
                  {stats.topUsers.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-muted-foreground">
                        No usage in last 7 days.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Panel>

            <Panel title="Top endpoints (7d)">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2">Endpoint</th>
                    <th className="py-2 text-right">Calls</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topEndpoints.map((e) => (
                    <tr key={e.endpoint} className="border-t border-border/40">
                      <td className="py-2 font-mono text-xs">{e.endpoint}</td>
                      <td className="py-2 text-right tabular-nums">{e.count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel title="Recent signups">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2">Email</th>
                    <th className="py-2">Plan</th>
                    <th className="py-2">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSignups.map((s) => (
                    <tr key={s.id} className="border-t border-border/40">
                      <td className="py-2 font-mono text-xs">{s.email}</td>
                      <td className="py-2 text-xs">{s.plan}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel title="Recent errors (all users)">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2">When</th>
                    <th className="py-2">Endpoint</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentErrors.map((e, i) => (
                    <tr key={i} className="border-t border-border/40">
                      <td className="py-2 text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-2 font-mono text-xs">{e.endpoint}</td>
                      <td className="py-2 text-xs text-destructive">{e.status}</td>
                      <td className="py-2 text-right tabular-nums text-xs">{e.latency_ms}ms</td>
                    </tr>
                  ))}
                  {stats.recentErrors.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-muted-foreground">
                        No recent errors. 🎉
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Panel>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${accent ?? ""}`}>{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card">
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="overflow-x-auto p-4">{children}</div>
    </div>
  );
}
