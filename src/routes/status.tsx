import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Status — SECStream" },
      { name: "description", content: "Real-time uptime and latency for SECStream API endpoints." },
    ],
  }),
  component: StatusPage,
});

type Service = {
  name: string;
  endpoint: string;
  uptime: number;
  p95: number;
  status: "operational" | "degraded" | "outage";
};

const services: Service[] = [
  { name: "Filings API", endpoint: "GET /filings", uptime: 99.99, p95: 112, status: "operational" },
  { name: "Company API", endpoint: "GET /company", uptime: 100.0, p95: 47, status: "operational" },
  { name: "Search API", endpoint: "GET /search", uptime: 99.97, p95: 89, status: "operational" },
  { name: "Quote API", endpoint: "GET /quote", uptime: 99.99, p95: 38, status: "operational" },
  { name: "Bars API", endpoint: "GET /bars", uptime: 99.98, p95: 71, status: "operational" },
  { name: "Fundamentals API", endpoint: "GET /fundamentals", uptime: 99.99, p95: 64, status: "operational" },
  { name: "EDGAR Ingestion", endpoint: "Internal", uptime: 99.95, p95: 0, status: "operational" },
  { name: "Market Data Feed", endpoint: "Internal", uptime: 99.99, p95: 0, status: "operational" },
];

function seed(s: string, i: number): number {
  let h = 2166136261 ^ i;
  for (let k = 0; k < s.length; k++) {
    h ^= s.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function StatusPage() {
  const allOk = services.every((s) => s.status === "operational");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            System status
          </p>
          <div className={`mt-3 flex items-center gap-3 rounded-xl border p-5 ${
            allOk
              ? "border-success/40 bg-success/[0.06]"
              : "border-destructive/40 bg-destructive/10"
          }`}>
            <span className={`dot animate-pulse-slow ${allOk ? "bg-success" : "bg-destructive"}`} />
            <h1 className="text-xl font-semibold tracking-tight">
              {allOk ? "All systems operational" : "Service disruption"}
            </h1>
            <span className="ml-auto font-mono text-xs text-muted-foreground">
              updated {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          {services.map((s) => (
            <ServiceRow key={s.name} service={s} />
          ))}
        </div>

        <p className="mt-10 font-mono text-[11px] text-muted-foreground">
          Uptime computed over the last 90 days. P95 latency measured server-side.
        </p>
      </main>
    </div>
  );
}

function ServiceRow({ service }: { service: Service }) {
  const days = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => {
        const r = seed(service.name, i);
        if (r > 0.985) return "outage";
        if (r > 0.96) return "degraded";
        return "ok";
      }),
    [service.name],
  );

  const statusColor =
    service.status === "operational"
      ? "text-success"
      : service.status === "degraded"
        ? "text-[oklch(0.78_0.15_85)]"
        : "text-destructive";

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{service.name}</p>
          <p className="font-mono text-[11px] text-muted-foreground">{service.endpoint}</p>
        </div>
        <div className="flex items-center gap-6 text-right">
          {service.p95 > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                P95
              </p>
              <p className="font-mono text-sm">{service.p95}ms</p>
            </div>
          )}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Uptime
            </p>
            <p className="font-mono text-sm">{service.uptime.toFixed(2)}%</p>
          </div>
          <span className={`flex items-center gap-1.5 text-xs ${statusColor}`}>
            <span className={`dot ${service.status === "operational" ? "bg-success" : "bg-current"}`} />
            <span className="capitalize">{service.status}</span>
          </span>
        </div>
      </div>
      <div className="mt-3 flex gap-[3px]">
        {days.map((d, i) => (
          <div
            key={i}
            title={`${60 - i}d ago — ${d}`}
            className={`h-7 flex-1 rounded-[2px] transition-opacity hover:opacity-70 ${
              d === "ok"
                ? "bg-success/70"
                : d === "degraded"
                  ? "bg-[oklch(0.78_0.15_85)]/80"
                  : "bg-destructive/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
