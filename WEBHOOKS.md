# Webhooks — Push instead of poll

The fastest API request is the one your customers never make. Webhooks let
clients subscribe to events (new filings for a ticker, etc.) and receive an
HTTP POST when they happen, instead of polling `/v1/filings` on a timer.

This repo already ships the server side:
- `src/components/WebhooksPanel.tsx` — dashboard UI to create/list/delete subscriptions.
- `src/routes/api/public/v1/_internal/dispatch-webhooks.ts` — internal
  dispatcher invoked by the SEC poller.
- `supabase/functions/poll-sec-filings/index.ts` — cron that polls EDGAR and
  triggers dispatch when new filings land.

This doc is the **customer-facing guide** — how to set one up, what payloads
look like, and how to verify signatures.

---

## Why webhooks beat polling

Polling at 1 request/min/ticker means a customer tracking 50 tickers makes
**72,000 requests/day** just to check for changes. With webhooks they make
**0**, and they hear about new filings within seconds of EDGAR publishing
them instead of up to a minute later.

| | Polling | Webhooks |
|--|--|--|
| Customer requests/day (50 tickers) | 72,000 | 0 |
| Latency to new filing | up to 60s | <5s typical |
| Your server load | linear in customers | constant |
| Customer rate-limit headaches | yes | no |

---

## Creating a webhook (UI)

1. Go to `/dashboard` → **Webhooks** panel.
2. Click **Add endpoint**.
3. Enter:
   - **URL** — must be HTTPS in production.
   - **Tickers** — comma-separated, or leave blank for all.
   - **Form types** — e.g. `10-K, 10-Q, 8-K`. Blank = all.
4. Copy the **signing secret** shown once on creation. Store it in your env.

---

## Payload shape

`POST` to your endpoint with `Content-Type: application/json`:

```json
{
  "event": "filing.created",
  "id": "evt_01HZ...",
  "created_at": "2026-05-21T06:42:11.213Z",
  "data": {
    "accession_number": "0000320193-26-000045",
    "form_type": "10-K",
    "filing_date": "2026-05-21",
    "report_date": "2026-03-29",
    "ticker": "AAPL",
    "company_name": "Apple Inc.",
    "cik": "0000320193",
    "filing_url": "https://www.sec.gov/Archives/edgar/data/320193/...",
    "description": "Annual report"
  }
}
```

Headers your endpoint will receive:

```
Content-Type: application/json
X-SECStream-Event: filing.created
X-SECStream-Delivery: <uuid>
X-SECStream-Timestamp: <unix seconds>
X-SECStream-Signature: t=<unix seconds>,v1=<hex hmac>
```

---

## Verifying the signature

The signature scheme is HMAC-SHA256 over `<timestamp>.<raw body>` using your
signing secret. Standard Stripe-style. Reject if:
- `|now - timestamp| > 5 minutes` (replay protection)
- computed HMAC != `v1` value (constant-time compare)

### Node example

```js
import { createHmac, timingSafeEqual } from "crypto";

export function verify(rawBody, header, secret) {
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("=")),
  );
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > 300) {
    return false;
  }
  const expected = createHmac("sha256", secret)
    .update(`${t}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parts.v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
```

### Python example

```python
import hmac, hashlib, time

def verify(raw_body: bytes, header: str, secret: str) -> bool:
    parts = dict(p.split("=", 1) for p in header.split(","))
    t = int(parts["t"])
    if abs(time.time() - t) > 300:
        return False
    expected = hmac.new(
        secret.encode(), f"{t}.{raw_body.decode()}".encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, parts["v1"])
```

---

## Delivery guarantees

- **At-least-once.** Your endpoint may receive the same event more than once.
  Use `X-SECStream-Delivery` or `event.id` as an idempotency key on your end.
- **Order**: not guaranteed. Sort by `filing_date` / `created_at` if order matters.
- **Retries**: exponential backoff at 0s, 1m, 5m, 30m, 2h, 6h, 24h. After
  24h of failures, deliveries are paused and shown on the dashboard.
- **Success**: any 2xx response within 10s.
- **Failure**: non-2xx, timeout, or DNS error → retry.

---

## Testing locally

Use any of:
- `ngrok http 3000` and point the webhook at the ngrok URL.
- The **Send test event** button in the dashboard — sends a synthetic
  `filing.created` payload to your endpoint immediately.

---

## When polling still makes sense

- **Backfills**: paginating historical filings via `/v1/filings?cursor=...`.
- **Reconciliation**: a daily sweep to verify nothing was missed.
- **Ad-hoc queries**: one-off scripts.

For real-time monitoring, always prefer webhooks.
