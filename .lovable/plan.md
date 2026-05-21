
## Goal

User flow already exists end-to-end:
1. Sign up at `/signup` → profile + default API key auto-created
2. Copy `sk_live_...` from `/dashboard`
3. `curl -H "Authorization: Bearer sk_live_..." https://.../api/public/v1/filings?ticker=AAPL`

**The problem**: every public endpoint queries columns that don't exist on the real `sec_filings` table, so every call returns a 500. The real table only has:

`id, ticker, cik, company_name, accession_number, report_date, filing_date, form_type, filing_url, description, created_at`

No `accession_no`, no `filed_at`, no fundamentals columns (revenue, net_income, …), no insider columns, no clusters. The fancier endpoints (`/insider`, `/fundamentals`, `/clusters`, `/company`, `/quote`, `/filings/batch`) were built against a fantasy schema.

## Plan

### 1. Rewrite `/v1/filings` against the real columns
- Select `accession_number, form_type, filing_date, report_date, ticker, company_name, cik, filing_url, description`
- Order by `filing_date desc, accession_number desc`
- Cursor switches from `{filed_at, accession_no}` → `{filing_date, accession_number}` (update `Cursor` type in `apiAuth.server.ts`)
- Keep `?ticker=`, `?type=`, `?limit=`, `?fields=`, `?cursor=`, CSV output

### 2. Rewrite `/v1/search`
- Search `sec_filings` by `ticker ilike` + `company_name ilike`
- Drop `insider` scope (no insider data on this table)
- Return distinct `{ticker, company_name, cik}`

### 3. Rewrite `/v1/company?ticker=...`
- Return the latest row per ticker: `{ticker, company_name, cik, latest_filing_date, latest_form_type}`
- Plus a count of filings on file

### 4. Rewrite `/v1/filings/batch`
- POST `{tickers: string[], limit_per_ticker?: number, type?: string}`
- Same column projection as `/v1/filings`, grouped by ticker

### 5. Remove or stub endpoints with no backing data
Mark these as `501 Not Implemented` with a clear message (keeps URLs but stops 500s and stops misleading docs):
- `/v1/insider` — no insider transaction columns exist
- `/v1/fundamentals` — no financial columns exist
- `/v1/clusters` — no cluster columns exist
- `/v1/quote` — no price data exists

### 6. Update `/docs` and `/docs/sdk`
- Remove example responses referencing non-existent fields
- Show only `filings`, `search`, `company`, `filings/batch` as live; the others labeled "coming soon"
- Update the curl example on `/dashboard` onboarding wizard to a request that actually returns rows

### 7. Update landing/company pages
- `/companies/$ticker` already SSRs — update its loader to use the real columns so the page doesn't render blank

### Technical notes

- No DB migration needed — we are conforming code to the existing schema, not the other way around.
- `Cursor` type rename (`filed_at` → `filing_date`, `accession_no` → `accession_number`) is a 1-line change in `apiAuth.server.ts` plus callers.
- All endpoints keep the same auth/rate-limit/usage-log wrapper (`handlePublicApi`), so signup → key → call flow is unchanged.
- The `insider_form4_filings` table DOES have rich insider data — we can wire `/v1/insider` against it instead of stubbing if you want. Say the word and I'll include that in step 5.

### Out of scope (unless you confirm)
- Adding new ingestion (no fundamentals/quotes data to expose)
- Paid tier enforcement (already works as-is)
- Webhooks dispatch (already scaffolded, separate concern)

## Open question

Do you want `/v1/insider` wired against the real `insider_form4_filings` table (it has insider name, transaction code, shares, price, value)? Or stub it as "coming soon" like fundamentals/quote/clusters?
