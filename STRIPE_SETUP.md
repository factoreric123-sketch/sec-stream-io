# Stripe Billing + Freemium — Setup Guide

What's shipped, what you need to configure, and the exact wiring for the dashboard.

**Model:** new signups → `plan='free'` with **10 lifetime API calls**. After that → 402
Payment Required with an `upgrade_url`. Upgrade → Stripe Checkout → webhook flips `plan='active'`
→ unlimited.

---

## What's in this commit

| File | Purpose |
|---|---|
| `supabase/migrations/...stripe_billing.sql` | Adds `stripe_customer_id`, `stripe_subscription_id` to `profiles` + `stripe_events` dedup table |
| `src/routes/api/public/stripe-checkout.ts` | `POST` → returns Stripe Checkout URL |
| `src/routes/api/public/stripe-webhook.ts` | `POST` ← Stripe events → updates `profiles.plan` |
| `src/routes/api/public/v1/billing/portal.ts` | `POST` → returns Stripe Customer Portal URL |

---

## Step 1 — Install dependency

```bash
bun add stripe
# or: npm install stripe
```

Without this, the deploy will fail at build time.

---

## Step 2 — Apply the migration

```bash
supabase db push
```

Or paste `supabase/migrations/20260604074001_stripe_billing.sql` into the Supabase SQL editor.

---

## Step 3 — Create the product in Stripe

1. Stripe dashboard → **Products → Add product**
2. Name: `SECStream API` (or whatever)
3. Pricing: **Recurring**, $10/month
4. Copy the **Price ID** (`price_...`) — you'll need it next.

---

## Step 4 — Set environment variables

These go in your deployment environment (Lovable). They must NOT be committed to `.env` in git.

| Variable | Value | Where to get it |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe → Developers → API keys |
| `STRIPE_PRICE_ID` | `price_...` | From Step 3 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | From Step 5 |
| `APP_BASE_URL` | `https://sec-filing-api.com` | Your deployed URL |

---

## Step 5 — Register the webhook in Stripe

1. Stripe dashboard → **Developers → Webhooks → Add endpoint**
2. **Endpoint URL:** `https://sec-filing-api.com/api/public/stripe-webhook`
3. **Events to send:**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Click **Add endpoint**.
5. Reveal the **Signing secret** (`whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET` in Lovable.

---

## Step 6 — Enable Customer Portal

Stripe dashboard → **Settings → Billing → Customer portal**
- Activate it
- Allow: update payment method, cancel subscription, view invoices
- Save

Without this, the `/billing/portal` endpoint will 500.

---

## Step 7 — Wire the dashboard button

I can't edit `src/routes/dashboard.tsx` directly. The existing `AccountPanel` (around line 685) has:

```tsx
<Button variant="outline" size="sm" className="mt-6 w-full" disabled>
  Manage billing (coming soon)
</Button>
```

Replace it with this. If `plan === 'active'` show the Manage button; otherwise show Subscribe.

```tsx
function AccountPanel({
  plan, renewalDate, email, lifetimeUsed, freeQuota,
}: {
  plan: string;
  renewalDate: string | null;
  email: string;
  lifetimeUsed: number;
  freeQuota: number;
}) {
  const handleManage = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/public/v1/billing/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const { url, error } = await res.json();
    if (url) window.location.href = url;
    else alert(error ?? "Could not open billing portal");
  };

  const handleUpgrade = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/public/stripe-checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const { url, error } = await res.json();
    if (url) window.location.href = url;
    else alert(error ?? "Could not start checkout");
  };

  const isActive = plan === "active";
  const isFree   = plan === "free";
  const remaining = Math.max(freeQuota - lifetimeUsed, 0);

  return (
    <Card title="Account">
      <dl className="space-y-4 text-sm">
        <Row label="Email" value={<span className="font-mono text-xs">{email}</span>} />
        <Row
          label="Plan"
          value={
            <span className={isActive ? "text-success" : isFree ? "text-muted-foreground" : "text-destructive"}>
              {isActive ? "Premium" : isFree ? "Free" : plan}
            </span>
          }
        />
        {isFree && (
          <Row
            label="Usage"
            value={<span className="font-mono text-xs">{lifetimeUsed} / {freeQuota} calls</span>}
          />
        )}
        {isActive && renewalDate && (
          <Row label="Renews" value={new Date(renewalDate).toLocaleDateString()} />
        )}
      </dl>

      {isActive ? (
        <Button variant="outline" size="sm" className="mt-6 w-full" onClick={handleManage}>
          Manage billing
        </Button>
      ) : (
        <>
          {isFree && remaining > 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              {remaining} free {remaining === 1 ? "call" : "calls"} remaining.
              Upgrade for unlimited access.
            </p>
          )}
          {isFree && remaining === 0 && (
            <p className="mt-4 text-xs text-destructive">
              Free quota exhausted. Upgrade to continue using the API.
            </p>
          )}
          <Button size="sm" className="mt-4 w-full" onClick={handleUpgrade}>
            Upgrade to Premium — $10/mo
          </Button>
        </>
      )}
    </Card>
  );
}
```

Make sure `supabase` is imported at the top of the file (it already should be —
`import { supabase } from "@/integrations/supabase/client"`).

You'll also need to surface `lifetimeUsed` and `freeQuota` to this component.
Update the auth context (`src/lib/auth.tsx`) to load these alongside the existing
`plan` and `renewal_date`. Quick SQL:

```ts
const { data: profile } = await supabase
  .from("profiles")
  .select("email, plan, renewal_date, lifetime_request_count, free_quota")
  .eq("id", user.id)
  .single();
```

Then pass `profile.lifetime_request_count` and `profile.free_quota` into `<AccountPanel>`.

---

## Step 8 — Wire the quota check into the API auth pipeline

You'll need TWO edits to `src/server/apiAuth.server.ts` (I can't edit that
file directly due to system restrictions — apply by hand).

### 8a. Allow `plan='free'` through the plan check

The existing `isPlanActive` only accepts `plan='active'`, which would block
free users entirely. Change it to also let free users pass — the quota
check (next step) will gate them.

**Find this function:**
```ts
function isPlanActive(plan: string, renewalDate: string | null): boolean {
  if (plan === "active") return true;
  if (renewalDate && new Date(renewalDate).getTime() > Date.now()) return true;
  return false;
}
```

**Replace with:**
```ts
function isPlanActive(plan: string, renewalDate: string | null): boolean {
  if (plan === "active") return true;
  if (plan === "free")   return true;   // free users gated by quota, not plan
  if (renewalDate && new Date(renewalDate).getTime() > Date.now()) return true;
  return false;
}
```

### 8b. Add the quota check

The migration adds an atomic `consume_quota` RPC. The new helper
`src/server/quota.server.ts` calls it.

**In `apiAuth.server.ts`, inside `handlePublicApi`, AFTER the plan-active
check (and after the scope check), BEFORE the rate-limit block, add:**

```ts
import { consumeQuota, quotaExhaustedResponse } from "./quota.server";

// ... existing plan + scope checks ...

// 2c. Free-tier quota enforcement.
const quota = await consumeQuota(auth.user_id);
if (quota && quota.plan === "free" && quota.new_count > quota.free_quota) {
  const latency = Date.now() - start;
  await logUsage(auth, endpoint, 402, latency);
  return jsonResponse(
    quotaExhaustedResponse(quota),
    402,
    { ...baseHeaders, "X-Response-Time-Ms": String(latency) },
  );
}
```

`consumeQuota` increments the counter atomically. The 402 is only returned
when `plan === 'free'` AND the count is over quota — paid users still get
their counter incremented (for analytics) but skip the gate.

---

## Step 9 — Test the flow

1. Sign up a fresh test account → profile created with `plan='free'`, `lifetime_request_count=0`, `free_quota=10`.
2. Dashboard shows **Plan: Free** and **Usage: 0 / 10 calls** plus **Upgrade to Premium — $10/mo** button.
3. Make 10 API calls with the new key → each one increments the counter and succeeds.
4. The 11th call returns:
   ```json
   {
     "error": {
       "code": "upgrade_required",
       "message": "Free-tier quota of 10 requests exceeded...",
       "details": {
         "used": 11,
         "quota": 10,
         "plan": "free",
         "upgrade_url": "https://sec-filing-api.com/dashboard?upgrade=1"
       }
     }
   }
   ```
   (HTTP 402 Payment Required.)
5. Click **Upgrade to Premium** → redirected to Stripe Checkout.
6. Pay with a real card.
7. On success → bounced back to `/dashboard?subscribed=1`.
8. Within a few seconds, Stripe fires `checkout.session.completed` → webhook → `plan='active'`.
9. Refresh dashboard → button now reads **Manage billing**. API works again.
10. Click **Manage billing** → Stripe Customer Portal opens.
11. Cancel from the portal → Stripe fires `customer.subscription.deleted` → `plan='canceled'` → API 402s again until they re-subscribe.

---

## Troubleshooting

**Webhook returns 400 "Invalid signature"**
→ `STRIPE_WEBHOOK_SECRET` is wrong or missing.

**Webhook returns 200 but plan didn't change**
→ Check `client_reference_id` was set on the checkout session. The webhook needs it to identify which user to update.

**Portal endpoint returns 404 "No active subscription found"**
→ User has no `stripe_customer_id` on their profile. Means the webhook hasn't fired yet, or fired but failed.

**Checkout works but webhook never fires**
→ In test mode, Stripe needs `stripe listen --forward-to localhost:.../stripe-webhook` running. In live mode, check the webhook log in Stripe dashboard.

**Webhook is slow / Stripe is retrying**
→ The handler returns 200 only AFTER the DB update completes. If Supabase is slow you'll see retries. Acceptable up to a few seconds.

---

## Security notes

- The webhook is **public** but signature-verified. Anyone can POST to it, but only Stripe knows the signing secret.
- `stripe-checkout` and `billing/portal` require a valid Supabase JWT (Bearer token from the user's login session). Don't expose them to the public API key flow.
- `STRIPE_SECRET_KEY` must never end up in client JS. It's read via `process.env` on the server only.
- Idempotency is handled via the `stripe_events` table — each event_id is processed at most once.
