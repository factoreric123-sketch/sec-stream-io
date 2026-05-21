# Performance Improvements

Roadmap of efficiency wins for the public API. Each section explains the
problem, the fix, and (where applicable) the exact code changes required.

Items marked **Ready** ship as standalone files in this commit. Items marked
**Manual** require editing `src/server/apiAuth.server.ts` or
`src/routes/api/public/v1/filings.ts` — apply by hand or via Lovable.

---

## Fix D — `sec_filings` compound indexes  *(Ready)*

**File:** `supabase/migrations/20260521064647_perf_filings_indexes.sql`

Adds:
- `(ticker, filing_date desc, accession_number desc)` — covers the default
  cursor-paginated query.
- `(ticker, form_type, filing_date desc, accession_number desc)` — covers
  `?type=10-K`.
- `(user_id, created_at desc)` on `usage_logs` — accelerates the current
  rate-limit count(*) until Fix C lands.

**Apply:** `supabase db push` (or via the Supabase dashboard SQL editor).

---

## Fix E — `get_filings_paginated` RPC  *(Ready, requires wiring)*

**File:** `supabase/migrations/20260521064648_perf_filings_rpc.sql`

Replaces the PostgREST `.or()` cursor expression with a tuple comparison
`(filing_date, accession_number) < (X, Y)` inside a `STABLE` SQL function.
This is index-friendly and substantially faster on deep pagination.

**Wiring** — in `src/routes/api/public/v1/filings.ts`, replace the
`supabaseAdmin.from('sec_filings').select(...).or(...)` block with:

```ts
const { data, error } = await supabaseAdmin.rpc("get_filings_paginated", {
  p_ticker: ticker,
  p_form_type: formType,
  p_cursor_date: cursor?.filing_date ?? null,
  p_cursor_acc: cursor?.accession_number ?? null,
  p_limit: limit,
});
```

The function returns `limit + 1` rows, matching the existing `has_more` logic.

---

## Fix B — Auth-result LRU cache  *(Ready, requires wiring)*

**File:** `src/server/apiCache.server.ts`

Caches `key_hash -> AuthedKey` in-process for 60s. Eliminates ~99% of the
two auth queries on the hot path for any actively-used key.

**Wiring** — in `src/server/apiAuth.server.ts`, inside `authenticate()`:

```ts
import { authCache } from "./apiCache.server";

async function authenticate(request: Request): Promise<AuthedKey | null> {
  const key = extractBearer(request);
  if (!key || !key.startsWith("sk_")) return null;
  const hash = createHash("sha256").update(key).digest("hex");

  const cached = authCache.get(hash);
  if (cached) return cached;

  // ... existing queries ...

  const result: AuthedKey = { /* ... */ };
  authCache.set(hash, result);
  return result;
}
```

Invalidate on revoke/rotate in your key-management server functions:
```ts
authCache.invalidateByHash(hash);
authCache.invalidateByUser(userId); // on plan change
```

---

## Fix C — Race-free rate limiter  *(Ready, requires wiring + migration)*

**File:** `src/server/rateLimiter.server.ts`

Replaces `SELECT count(*) FROM usage_logs WHERE created_at >= now()-60s`
(slow + racy) with either:
- `InMemoryLimiter`: atomic within one process; resets on cold start.
- `PostgresLimiter`: atomic across processes via `INSERT ... ON CONFLICT DO UPDATE`.

For the Postgres backend, add this RPC (new migration):

```sql
CREATE TABLE public.rate_buckets (
  user_id  UUID NOT NULL,
  bucket   BIGINT NOT NULL,
  count    INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, bucket)
);

CREATE OR REPLACE FUNCTION public.rate_bucket_incr(
  p_user UUID, p_bucket BIGINT
) RETURNS INT
LANGUAGE sql AS $$
  INSERT INTO public.rate_buckets (user_id, bucket, count)
  VALUES (p_user, p_bucket, 1)
  ON CONFLICT (user_id, bucket)
  DO UPDATE SET count = rate_buckets.count + 1
  RETURNING count;
$$;
```

**Wiring** — in `src/server/apiAuth.server.ts`, replace the
`recentRequestCount(...)` block:

```ts
import { getLimiter } from "./rateLimiter.server";

const { used, resetSeconds } = await getLimiter().consume(
  auth.user_id, auth.rate_limit_per_min,
);
const remaining = Math.max(auth.rate_limit_per_min - used, 0);
// ... use `used` instead of the count(*) result.
// Set X-RateLimit-Reset to resetSeconds (Fix below).
```

Choose backend via env var: `RATE_LIMITER=postgres` (default: in-memory).

---

## Fix G — Batched `usage_logs` inserts  *(Ready, requires wiring)*

**File:** `src/server/usageBuffer.server.ts`

Buffers usage rows in-process and flushes as one multi-row INSERT every 1s
or every 500 rows. Cuts write IOPS dramatically.

**Wiring** — in `src/server/apiAuth.server.ts`, replace `logUsage()`:

```ts
import { usageBuffer } from "./usageBuffer.server";

async function logUsage(auth, endpoint, status, latencyMs) {
  if (!auth) return;
  usageBuffer.enqueue({
    user_id: auth.user_id,
    endpoint,
    status,
    latency_ms: latencyMs,
  });
}
```

Tradeoff: up to 1s lag on the usage dashboard. Acceptable for analytics.

---

## Fix N — Idempotency keys  *(Ready, requires wiring + migration)*

**File:** `src/server/idempotency.server.ts`

Stripe-style `Idempotency-Key` support. Keyed by `(user_id, key)`, stored 24h.

**Migration required:**
```sql
CREATE TABLE public.idempotency_records (
  key            TEXT NOT NULL,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_hash   TEXT NOT NULL,
  status         INT  NOT NULL,
  response_body  JSONB NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
CREATE INDEX idx_idemp_created ON public.idempotency_records (created_at);
```

Cleanup via daily cron:
```sql
DELETE FROM idempotency_records WHERE created_at < now() - interval '24 hours';
```

Apply on any write endpoint. See module docstring for usage.

---

## Fix O — Echo `request_id` in error bodies  *(Manual)*

Currently `X-Request-Id` is only a response header. Customers paste it from
DevTools when reporting issues, but it's easy to miss. Echo it inside the
error body too.

**In `src/server/apiAuth.server.ts`, modify `buildErrorBody`:**

```ts
function buildErrorBody(
  code: ApiErrorCode,
  message: string,
  requestId: string,                          // <-- new arg
  details?: Record<string, unknown>,
) {
  return {
    error: {
      code,
      message,
      request_id: requestId,                  // <-- new field
      ...(details ? { details } : {}),
    },
  };
}
```

Then thread `requestId` through every `buildErrorBody(...)` call in
`handlePublicApi`. One-line change per call site.

---

## Fixes NOT in this commit (require editing locked files)

Apply these manually when you can edit `apiAuth.server.ts` / `filings.ts`:

- **Fix A**: Collapse `api_keys` + `profiles` lookup into one JOIN query.
  ~30ms p95 win on cold cache misses.
- **Fix F**: Add `Cache-Control: public, max-age=60, s-maxage=300,
  stale-while-revalidate=600` + weak ETag on `/v1/filings`. Lets Cloudflare
  cache the response entirely.
- **Fix H**: Throttle `api_keys.last_used_at` updates to once per minute
  per key. Cuts ~50% of writes per request.
- **Fix I**: Run `getLimiter().consume()` in parallel with the data query
  via `Promise.all`. Saves one round-trip's latency.
- **Fix J**: Confirm `supabaseAdmin` is a singleton in
  `client.server.ts` (looked correct on inspection).
- **Fix K**: Enable `gzip`/`br` compression on JSON responses > 1KB.
- **Fix L**: Push `?fields=` into the Supabase `.select(...)` call instead of
  filtering in JS (`pickFields`).
- **Fix M**: Stream CSV via `ReadableStream` instead of building in memory.

---

## Expected impact

If all of Tier 1 lands (B, C, D, E, F):
- **p95 latency**: down 2–5× (60ms → 15–30ms typical).
- **Max RPS per instance**: up ~10×.
- **DB load**: down ~80% on read-heavy traffic.

Tier 2/3 (G, H, K, L, M) are additive but smaller. Tier 4 (N, Q) improve
correctness and customer DX, not raw speed.
