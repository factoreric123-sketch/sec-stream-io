# SECStream — Remaining work plan

Building everything in order, one phase per turn. You approve this once and I'll work through it.

Skipping email work per your answer (Supabase defaults are fine for now).

---

## Phase 1 — Critical: lock down the API

### 1. Structured error responses
First so everything else uses the new shape.

- New helper `apiError(code, message, status, details?)` in `src/server/apiAuth.server.ts`
- Standard JSON shape:
  ```
  { "error": { "code": "missing_param", "message": "...", "param": "ticker" } }
  ```
- Codes: `unauthorized`, `forbidden`, `plan_inactive`, `rate_limited`, `missing_param`, `invalid_param`, `not_found`, `internal_error`
- Update all 7 endpoints to use it
- Add `X-Request-Id` header (UUID) for support traceability

### 2. Plan enforcement
- In `handlePublicApi`, after auth, fetch the user's `profiles.plan`
- If `plan !== 'active'` → return 403 `plan_inactive` with renewal date
- Cache the plan check on the `api_keys` row check (single query with join) to avoid an extra round-trip
- Free trial logic: `profiles.renewal_date` in the future = active

### 3. Rate limiting (best-effort)
Caveat: no Redis on Lovable, so this counts requests in `usage_logs` per key for the last 60s. Adds ~10ms per request. Not bulletproof under concurrent bursts but catches the runaway-script case you're worried about.

- Add `rate_limit_per_min` column to `profiles` (default 60 free, configurable)
- In `handlePublicApi`, before serving: `SELECT count(*) FROM usage_logs WHERE user_id = ? AND created_at > now() - interval '1 minute'`
- If over limit → 429 `rate_limited` with `Retry-After` header and `X-RateLimit-*` headers on every response
- Add index: `CREATE INDEX usage_logs_user_recent ON usage_logs (user_id, created_at DESC)`

### 4. Pagination on list endpoints
Affects `/filings`, `/search`, `/insider`, `/fundamentals`, `/clusters`.

- Cursor-based using `filed_at + accession_no` (stable, no offset drift)
- Query params: `limit` (default 25, max 100), `cursor` (opaque base64 of `{filed_at, accession_no}`)
- Response wraps results: `{ data: [...], pagination: { next_cursor, has_more } }`
- This is a **breaking change** to the response shape — I'll bump endpoints to `/api/public/v1/...` (already there) and update playground + docs to match

---

## Phase 2 — Important: user-facing polish

### 5. Usage dashboard upgrade
Replace the simple bar chart with a real analytics panel.

- New section on `/dashboard`:
  - **Stat row**: Today / 7-day / 30-day / Success rate
  - **Time series**: requests/day for 30d (existing chart, kept)
  - **Endpoint breakdown**: top 5 endpoints by call count (table)
  - **Status breakdown**: 2xx / 4xx / 5xx counts with colored badges
  - **Latency**: p50, p95, p99 over 24h
  - **Recent errors table**: last 20 non-2xx requests with endpoint, status, time
- All driven by client-side queries to `usage_logs` (RLS already scopes to user)

### 6. API key management UI
Multi-key support so users can rotate without downtime.

- DB: drop the "delete all then insert" model in `regenerateKey`. Allow multiple active keys per user (already supported by schema, just needs UI).
- New "API Keys" section on dashboard:
  - Table: label, prefix•••last4, created, last used, [Reveal] [Copy] [Revoke]
  - "Create new key" with label input (e.g., "Production", "Staging")
  - Revoke = DELETE row, takes effect immediately
- Update `useAuth` to return `apiKeys: ApiKey[]` instead of `apiKey: ApiKey | null`
- Backwards compat: dashboard quickstart picks the first key

---

## Phase 3 — Nice-to-haves

### 7. Better SDK ergonomics
Not building full npm packages yet — just much better copy-paste examples.

- New `/docs/sdk` page (or section in `/docs`) with tabbed examples per endpoint:
  - `curl`, `Node.js (fetch)`, `Python (requests)`, `Python (httpx async)`
- Tiny TypeScript client snippet users can paste into their project:
  ```ts
  // 30 lines, no deps, copy into your project
  export class SECStream { constructor(key) {...} filings(opts) {...} }
  ```
- Downloadable `.ts` and `.py` files served from `/api/public/sdk/secstream.ts` etc.

### 8. Webhooks (watched-ticker filing alerts)
Lets users get notified when a new filing lands for tickers they care about.

- New tables:
  - `webhooks(id, user_id, url, secret, events[], active, created_at)` — events = `['filing.created']`
  - `webhook_deliveries(id, webhook_id, payload, status, response_code, attempted_at)` for debugging
  - `watched_tickers(user_id, ticker)` — which tickers each user wants alerts for
- Dashboard UI: add/remove webhooks, add/remove watched tickers, view recent deliveries
- Trigger: Postgres trigger on `sec_filings INSERT` calls `pg_notify` → a `/api/public/v1/_internal/dispatch-webhooks` endpoint (called by pg_cron every minute) reads pending notifications and POSTs to user URLs with HMAC-SHA256 signature
- Signature header: `X-SECStream-Signature: sha256=...` (Stripe-compatible pattern)
- Retry: 3 attempts with exponential backoff, then mark delivery failed

### 9. Admin dashboard (just for you)
Hardcoded email allowlist gate per your answer.

- `src/lib/admin.ts` exports `ADMIN_EMAILS = ['your@email.com']` and `isAdmin(user)` helper
- New route `/admin` — redirects to `/dashboard` if user not in allowlist
- Panels:
  - Total users, active subscriptions, MRR estimate
  - API call volume (24h, 7d, 30d) with chart
  - Top users by request count
  - Top endpoints by call count
  - Recent signups table
  - Recent errors across all users
- All queries hit `usage_logs`, `profiles`, `api_keys` server-side via `createServerFn` with admin email check

---

## Database migrations needed

```sql
-- Phase 1
ALTER TABLE profiles ADD COLUMN rate_limit_per_min int NOT NULL DEFAULT 60;
CREATE INDEX usage_logs_user_recent ON usage_logs (user_id, created_at DESC);

-- Phase 3 (webhooks)
CREATE TABLE webhooks (...);
CREATE TABLE webhook_deliveries (...);
CREATE TABLE watched_tickers (...);
-- + RLS policies + trigger on sec_filings
```

---

## Order of execution

I'll do these in 3 turns, asking for a quick check-in between phases:

1. **Turn 1 (Phase 1)**: error format + plan enforcement + rate limiting + pagination
2. **Turn 2 (Phase 2)**: usage dashboard + multi-key UI
3. **Turn 3 (Phase 3)**: SDK examples + webhooks + admin dashboard

Phase 3 is the biggest by far — webhooks alone is substantial. If you want, I can split that into its own approval after Phase 2.

## What I'm NOT doing (per your answers)
- Email customization (defaults stay)
- Payments / Stripe (you didn't list it; I'd recommend doing this before launch but separate convo)
- Real `/quote` market data (still returns Form 4 price proxy until you wire a market data source)

Ready to start Phase 1 on approval.
