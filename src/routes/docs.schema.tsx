import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/docs/schema")({
  head: () => ({
    meta: [
      { title: "Data Schema — SECStream" },
      { name: "description", content: "Complete field reference for the sec_filings table: 45 fields across identity, insider trades, 8-K signals, filing content, and more." },
    ],
  }),
  component: SchemaPage,
});

// ─── Data ────────────────────────────────────────────────────────────────────

const sections = [
  { id: "identity",    label: "1. Identity" },
  { id: "form4",      label: "2. Form 4 Trades" },
  { id: "insider",    label: "3. Insider Identity" },
  { id: "signals",    label: "4. 8-K Signals" },
  { id: "content",    label: "5. Filing Content" },
  { id: "issuer",     label: "6. Issuer Metadata" },
  { id: "json",       label: "7. Raw JSON" },
  { id: "system",     label: "8. System & Timing" },
  { id: "tradecodes", label: "Trade Codes" },
  { id: "formtypes",  label: "Form Types" },
];

const identityFields = [
  { field: "id",           type: "bigint (PK)",   desc: "Auto-incrementing row ID." },
  { field: "ticker",       type: "text",           desc: "Stock symbol (e.g. VITL). NULL for funds/trusts." },
  { field: "company_name", type: "text",           desc: "Issuer's legal name." },
  { field: "form_type",    type: "text",           desc: "SEC form code: 8-K, 10-Q, 4, S-1, etc. Primary filter column." },
  { field: "filed_at",     type: "timestamptz",    desc: "Exact moment SEC accepted the filing — the tradeable timestamp." },
];

const form4Fields = [
  { field: "trade_type",             type: "text",    desc: "P=Purchase, S=Sale, A=Grant, F=Tax withhold, M=Option exercise, etc." },
  { field: "trade_date",             type: "date",    desc: "When the actual transaction took place." },
  { field: "shares_qty",             type: "numeric", desc: "Number of shares in the first transaction." },
  { field: "price_per_share",        type: "numeric", desc: "Price per share." },
  { field: "total_transaction_value",type: "numeric", desc: "Sum of (shares × price) across all transactions in the filing." },
  { field: "shares_owned_after",     type: "numeric", desc: "Shares insider holds after the transaction." },
  { field: "delta_own_pct",          type: "numeric", desc: "% change in ownership: shares / (owned_after − shares) × 100." },
  { field: "transaction_count",      type: "integer", desc: "Number of distinct transactions in this filing." },
];

const insiderFields = [
  { field: "insider_name",         type: "text",    desc: "Reporting person's name (e.g. Tyler Brian S.)." },
  { field: "insider_title",        type: "text",    desc: "Officer title (e.g. Chief Executive Officer, Director)." },
  { field: "is_director",          type: "boolean", desc: "TRUE if on the board." },
  { field: "is_officer",           type: "boolean", desc: "TRUE if executive officer." },
  { field: "is_ten_percent_owner", type: "boolean", desc: "TRUE if ≥10% beneficial owner." },
  { field: "is_10b5_1_plan",       type: "boolean", desc: "TRUE = pre-scheduled trade (weaker signal). FALSE = discretionary (strong signal)." },
  { field: "is_group_filing",      type: "boolean", desc: "TRUE if multiple insiders reporting jointly." },
  { field: "no_longer_section_16", type: "boolean", desc: "TRUE if filer is exiting officer/director role — often precedes departure announcement." },
  { field: "insider_country",      type: "text",    desc: "Country code (for non-US insiders)." },
  { field: "original_currency",    type: "text",    desc: "Non-USD currency mentioned in footnotes (CHF, EUR, etc.)." },
];

const signalFields = [
  { field: "is_earnings_release", type: "boolean (derived)", desc: "8-K Item 2.02 — quarterly earnings published." },
  { field: "is_ma_event",         type: "boolean (derived)", desc: "8-K Item 1.01 (material agreement) or Item 2.01 (completed acquisition)." },
  { field: "is_exec_change",      type: "boolean (derived)", desc: "8-K Item 5.02 — officer/director departure or appointment." },
  { field: "is_restatement",      type: "boolean (derived)", desc: "8-K Item 4.02 — financial restatement (very bearish)." },
  { field: "is_default_event",    type: "boolean (derived)", desc: "8-K Item 2.04 (debt acceleration) or 3.01 (delisting)." },
  { field: "is_amendment",        type: "boolean (GENERATED)", desc: "TRUE if form_type ends in /A. Computed column — no storage cost." },
];

const contentFields = [
  { field: "items",             type: "text[]", desc: 'For 8-Ks: array of item codes (e.g. ["Item 2.02: Results of Operations"]).' },
  { field: "period_of_report",  type: "date",   desc: "The reporting period covered. 10-Q: end of quarter. Form 4: transaction date. 8-K: event date." },
  { field: "press_release_url", type: "text",   desc: "EX-99.1 press release URL — for earnings/M&A announcements." },
  { field: "filing_url",        type: "text",   desc: "SEC HTML viewer URL." },
  { field: "primary_document",  type: "text",   desc: "URL to the main document (8-K HTML, 10-Q HTML, Form 4 XML, etc.)." },
];

const issuerFields = [
  { field: "cik",                   type: "text", desc: "SEC Central Index Key — unique company ID (e.g. 1579733 = Vital Farms)." },
  { field: "sic_code",              type: "text", desc: "4-digit industry code (e.g. 2834 = Pharmaceutical Preparations)." },
  { field: "exchange",              type: "text", desc: "NYSE, NASDAQ, etc. (often NULL)." },
  { field: "state_of_incorporation",type: "text", desc: "Two-letter US state or foreign country code." },
  { field: "fiscal_year_end",       type: "text", desc: "MMDD format (1231 = Dec 31). Useful for off-cycle earnings strategies." },
];

const jsonFields = [
  { field: "transactions",        type: "jsonb", desc: "Array of every transaction in the Form 4. Each has: date, code, security, shares, price, value, acquired_or_disposed, owned_after, direct, is_derivative." },
  { field: "footnotes",           type: "jsonb", desc: "Array of {id, text} footnote entries from Form 4s." },
  { field: "entities",            type: "jsonb", desc: "All parties on the filing (issuer, filer, reporter) with their CIK, SIC, IRS#, etc." },
  { field: "document_format_files",type: "jsonb", desc: "All attached files with size, type, URL." },
];

const systemFields = [
  { field: "accession_number",  type: "text (UNIQUE)",      desc: "SEC's globally-unique filing identifier — your dedup key." },
  { field: "created_at",        type: "timestamptz",         desc: "When your DB stored the row (auto: DEFAULT now())." },
  { field: "ingestion_lag_ms",  type: "integer (GENERATED)", desc: "Milliseconds from SEC acceptance to DB write — your pipeline latency metric." },
];

const tradeCodes = [
  { code: "P", meaning: "Open-market purchase",     signal: "Strongest — insider spent own cash", strength: "high" },
  { code: "S", meaning: "Open-market sale",          signal: "Weak — many reasons to sell",        strength: "low" },
  { code: "A", meaning: "Grant / award",             signal: "Noise — compensation",               strength: "noise" },
  { code: "D", meaning: "Sale to issuer (buyback)",  signal: "Mechanical",                         strength: "noise" },
  { code: "F", meaning: "Tax withholding",           signal: "Mechanical",                         strength: "noise" },
  { code: "G", meaning: "Gift",                      signal: "Not a market trade",                 strength: "noise" },
  { code: "M", meaning: "Option exercise (non-deriv)",signal: "Weak",                             strength: "low" },
  { code: "X", meaning: "Option exercise (in-the-money)",signal: "Weak",                         strength: "low" },
  { code: "C", meaning: "Conversion of derivative",  signal: "Mechanical",                         strength: "noise" },
  { code: "W", meaning: "Inherited shares",           signal: "Not a trade",                       strength: "noise" },
];

const formTypeGroups = [
  { label: "Material events",       types: ["8-K", "8-K/A"] },
  { label: "Periodic reports",      types: ["10-Q", "10-Q/A", "10-K", "10-K/A", "6-K", "6-K/A", "20-F", "20-F/A", "40-F", "40-F/A"] },
  { label: "Beneficial ownership",  types: ["SC 13D", "SC 13D/A", "SC 13G", "SC 13G/A"] },
  { label: "Insider activity",      types: ["3", "3/A", "4", "4/A", "5", "5/A"] },
  { label: "Securities offerings",  types: ["S-1", "S-1/A", "S-3", "S-3/A"] },
  { label: "Proxies & M&A",         types: ["DEF 14A", "DEFM14A", "PRE 14A", "PREM14A", "425"] },
  { label: "Tender offers",         types: ["SC TO-T", "SC TO-I", "SC 14D9", "SC 14D9/A"] },
  { label: "Listing status",        types: ["25", "25-NSE", "15", "15-12B", "15-12G"] },
  { label: "Late filing notices",   types: ["NT 10-Q", "NT 10-K"] },
];

const fieldCounts = [
  { section: "1. Identity",              count: 5 },
  { section: "2. Form 4 trade details",  count: 8 },
  { section: "3. Insider identity",      count: 10 },
  { section: "4. 8-K signal flags",      count: 6 },
  { section: "5. Filing content",        count: 5 },
  { section: "6. Issuer metadata",       count: 5 },
  { section: "7. Raw JSON safety nets",  count: 4 },
  { section: "8. System & timing",       count: 3 },
];

// ─── Page ────────────────────────────────────────────────────────────────────

function SchemaPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[200px_1fr]">

        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Schema
            </p>
            <nav className="mt-3 space-y-1">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                >
                  {s.label}
                </a>
              ))}
            </nav>
            <div className="mt-6 border-t border-border pt-4">
              <Link
                to="/docs"
                className="block px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                ← API Reference
              </Link>
              <Link
                to="/docs/sdk"
                className="block px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                SDK & Examples
              </Link>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 space-y-16">

          {/* Header */}
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              Data Reference · sec_filings
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Schema Reference
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Complete field-by-field guide to the{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">sec_filings</code>{" "}
              table — 45 fields across identity, insider trades, 8-K signal flags, filing content,
              issuer metadata, and raw JSON payloads.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 font-mono text-xs">
              {fieldCounts.map((r) => (
                <span key={r.section} className="rounded-full border border-border bg-card px-2.5 py-1 text-muted-foreground">
                  {r.count} {r.section.replace(/^\d+\.\s/, "")}
                </span>
              ))}
            </div>
          </div>

          {/* Section 1 */}
          <SchemaSection id="identity" title="1. Identity" subtitle="Core identifying columns present on every filing.">
            <FieldTable rows={identityFields} />
          </SchemaSection>

          {/* Section 2 */}
          <SchemaSection id="form4" title="2. Form 4 Trade Details" subtitle="Auto-populated for Form 3/4/5 filings. NULL for other form types.">
            <FieldTable rows={form4Fields} />
          </SchemaSection>

          {/* Section 3 */}
          <SchemaSection id="insider" title="3. Insider Identity & Role" subtitle="Who filed and what their relationship to the company is.">
            <FieldTable rows={insiderFields} />
            <Callout>
              <strong>Trading signal tip:</strong>{" "}
              <code className="font-mono text-xs">is_10b5_1_plan = FALSE</code> means the trade was
              discretionary — not pre-scheduled. Discretionary purchases (
              <code className="font-mono text-xs">trade_type = 'P'</code>) are the strongest insider
              signal in the dataset.
            </Callout>
          </SchemaSection>

          {/* Section 4 */}
          <SchemaSection id="signals" title="4. 8-K Signal Flags" subtitle="Auto-derived from the items array. High-signal trading triggers — no parsing required.">
            <FieldTable rows={signalFields} />
            <Callout variant="warn">
              <strong>is_restatement</strong> (Item 4.02) is historically one of the most bearish
              signals in 8-K filings. Combine with{" "}
              <code className="font-mono text-xs">filed_at</code> to measure pre/post price action.
            </Callout>
          </SchemaSection>

          {/* Section 5 */}
          <SchemaSection id="content" title="5. Filing Content" subtitle="URLs and structured content extracted from the filing itself.">
            <FieldTable rows={contentFields} />
          </SchemaSection>

          {/* Section 6 */}
          <SchemaSection id="issuer" title="6. Issuer Metadata" subtitle="Company-level attributes from the SEC filing header.">
            <FieldTable rows={issuerFields} />
            <Callout>
              <strong>fiscal_year_end</strong> in{" "}
              <code className="font-mono text-xs">MMDD</code> format lets you identify off-cycle
              filers (e.g. <code className="font-mono text-xs">0630</code> = June fiscal year) which
              often have less analyst coverage during earnings season.
            </Callout>
          </SchemaSection>

          {/* Section 7 */}
          <SchemaSection id="json" title="7. Raw JSON Safety Nets" subtitle="Full original payloads preserved for forward-compatibility. Use these if you need fields not yet flattened above.">
            <FieldTable rows={jsonFields} />
          </SchemaSection>

          {/* Section 8 */}
          <SchemaSection id="system" title="8. System & Timing" subtitle="Infrastructure columns — dedup, audit trail, pipeline metrics.">
            <FieldTable rows={systemFields} />
          </SchemaSection>

          {/* Trade codes */}
          <SchemaSection id="tradecodes" title="Form 4 Trade Codes" subtitle="The trade_type field tells you what kind of insider activity occurred.">
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-card text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-mono">Code</th>
                    <th className="px-4 py-2 font-mono">Meaning</th>
                    <th className="px-4 py-2 font-mono">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeCodes.map((r) => (
                    <tr key={r.code} className="border-t border-border/60">
                      <td className="px-4 py-3">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">
                          {r.code}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.meaning}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${
                          r.strength === "high"  ? "text-green-400" :
                          r.strength === "low"   ? "text-yellow-500/80" :
                                                   "text-muted-foreground"
                        }`}>
                          {r.signal}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SchemaSection>

          {/* Form types */}
          <SchemaSection id="formtypes" title="Allowlisted Form Types" subtitle="38 form types are ingested. Everything else is filtered at the pipeline level.">
            <div className="space-y-4">
              {formTypeGroups.map((g) => (
                <div key={g.label}>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {g.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.types.map((t) => (
                      <code
                        key={t}
                        className="rounded border border-border bg-card px-2 py-0.5 font-mono text-xs text-foreground/80"
                      >
                        {t}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SchemaSection>

          {/* Field count summary */}
          <SchemaSection id="summary" title="Field Count Summary">
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-card text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-mono">Section</th>
                    <th className="px-4 py-2 text-right font-mono">Fields</th>
                  </tr>
                </thead>
                <tbody>
                  {fieldCounts.map((r) => (
                    <tr key={r.section} className="border-t border-border/60">
                      <td className="px-4 py-3 text-muted-foreground">{r.section}</td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">{r.count}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border">
                    <td className="px-4 py-3 font-semibold">Total</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-primary">
                      {fieldCounts.reduce((s, r) => s + r.count, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Includes 2 GENERATED columns:{" "}
              <code className="font-mono">is_amendment</code>,{" "}
              <code className="font-mono">ingestion_lag_ms</code>.
            </p>
          </SchemaSection>

        </main>
      </div>
    </div>
  );
}

// ─── Shared components ───────────────────────────────────────────────────────

function SchemaSection({
  id, title, subtitle, children,
}: {
  id: string; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      )}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function FieldTable({ rows }: { rows: { field: string; type: string; desc: string }[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-card text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-mono">Field</th>
            <th className="px-4 py-2 font-mono">Type</th>
            <th className="px-4 py-2 font-mono">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.field} className="border-t border-border/60">
              <td className="px-4 py-3">
                <code className="font-mono text-xs text-foreground">{r.field}</code>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                {r.type}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({
  children, variant = "info",
}: {
  children: React.ReactNode; variant?: "info" | "warn";
}) {
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${
      variant === "warn"
        ? "border-yellow-500/30 bg-yellow-500/5 text-yellow-200/80"
        : "border-primary/30 bg-primary/5 text-muted-foreground"
    }`}>
      {children}
    </div>
  );
}
