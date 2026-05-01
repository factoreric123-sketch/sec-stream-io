import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Webhook, Eye, EyeOff, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Hook = {
  id: string;
  url: string;
  secret: string;
  label: string;
  active: boolean;
  events: string[];
  created_at: string;
  last_delivery_at: string | null;
};
type Watched = { ticker: string; created_at: string };
type Delivery = {
  id: string;
  webhook_id: string;
  event: string;
  status: string;
  response_code: number | null;
  attempted_at: string;
};

function genSecret() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "whsec_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function WebhooksPanel({ userId }: { userId: string }) {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [watched, setWatched] = useState<Watched[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [ticker, setTicker] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [h, w, d] = await Promise.all([
      supabase.from("webhooks").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("watched_tickers").select("*").eq("user_id", userId).order("ticker"),
      supabase
        .from("webhook_deliveries")
        .select("id,webhook_id,event,status,response_code,attempted_at")
        .eq("user_id", userId)
        .order("attempted_at", { ascending: false })
        .limit(20),
    ]);
    setHooks((h.data ?? []) as Hook[]);
    setWatched((w.data ?? []) as Watched[]);
    setDeliveries((d.data ?? []) as Delivery[]);
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addHook = async () => {
    setError(null);
    try {
      const u = new URL(url);
      if (!u.protocol.startsWith("http")) throw new Error("URL must be http(s)");
    } catch {
      setError("Enter a valid URL (https://…)");
      return;
    }
    const secret = genSecret();
    const { error: e } = await supabase.from("webhooks").insert({
      user_id: userId,
      url,
      secret,
      label: label.trim() || "Default",
      events: ["filing.created"],
      active: true,
    });
    if (e) {
      setError(e.message);
      return;
    }
    setUrl("");
    setLabel("");
    reload();
  };

  const removeHook = async (id: string) => {
    await supabase.from("webhooks").delete().eq("id", id);
    reload();
  };

  const toggleActive = async (h: Hook) => {
    await supabase.from("webhooks").update({ active: !h.active }).eq("id", h.id);
    reload();
  };

  const addTicker = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    await supabase.from("watched_tickers").insert({ user_id: userId, ticker: t });
    setTicker("");
    reload();
  };

  const removeTicker = async (t: string) => {
    await supabase.from("watched_tickers").delete().eq("user_id", userId).eq("ticker", t);
    reload();
  };

  const copy = async (id: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <section className="rounded-lg border border-border/60 bg-card">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Webhook className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Webhooks</h2>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          filing.created
        </span>
      </div>

      <div className="space-y-6 p-4">
        {/* Watched tickers */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Watched tickers</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Get notified when new filings land for these tickers.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {watched.map((w) => (
              <span
                key={w.ticker}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
              >
                {w.ticker}
                <button
                  onClick={() => removeTicker(w.ticker)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
            {watched.length === 0 && (
              <span className="text-xs text-muted-foreground">No tickers watched yet.</span>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTicker()}
              placeholder="AAPL"
              className="w-32 rounded-md border border-border bg-background px-3 py-1.5 font-mono text-xs uppercase outline-none focus:border-primary"
            />
            <Button size="sm" variant="outline" onClick={addTicker}>
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>
        </div>

        {/* Endpoints */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Endpoints</p>
          <div className="mt-3 space-y-2">
            {hooks.map((h) => (
              <div key={h.id} className="rounded-md border border-border/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{h.label}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{h.url}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {h.last_delivery_at
                        ? `Last delivery ${new Date(h.last_delivery_at).toLocaleString()}`
                        : "No deliveries yet"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleActive(h)}
                      className="text-xs"
                    >
                      {h.active ? "Active" : "Paused"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeHook(h.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Secret</span>
                  <code className="flex-1 truncate font-mono text-xs">
                    {revealed[h.id] ? h.secret : "whsec_•••••••••••••••••"}
                  </code>
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setRevealed((r) => ({ ...r, [h.id]: !r[h.id] }))}
                  >
                    {revealed[h.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => copy(h.id, h.secret)}
                  >
                    {copied === h.id ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            ))}
            {hooks.length === 0 && (
              <p className="text-xs text-muted-foreground">No webhooks yet.</p>
            )}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-app.com/webhooks/secstream"
              className="rounded-md border border-border bg-background px-3 py-1.5 font-mono text-xs outline-none focus:border-primary"
            />
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label"
              className="w-32 rounded-md border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
            />
            <Button size="sm" onClick={addHook}>
              <Plus className="h-3 w-3" /> Add endpoint
            </Button>
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>

        {/* Recent deliveries */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent deliveries</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1.5">When</th>
                  <th className="py-1.5">Event</th>
                  <th className="py-1.5">Status</th>
                  <th className="py-1.5 text-right">HTTP</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-t border-border/40">
                    <td className="py-1.5 text-muted-foreground">
                      {new Date(d.attempted_at).toLocaleString()}
                    </td>
                    <td className="py-1.5 font-mono">{d.event}</td>
                    <td
                      className={
                        d.status === "delivered"
                          ? "py-1.5 text-emerald-500"
                          : d.status === "failed"
                            ? "py-1.5 text-destructive"
                            : "py-1.5 text-muted-foreground"
                      }
                    >
                      {d.status}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{d.response_code ?? "—"}</td>
                  </tr>
                ))}
                {deliveries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-muted-foreground">
                      No deliveries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
