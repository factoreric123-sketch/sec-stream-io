# Stripe Billing — Setup Guide

What's shipped in this commit, what you need to configure, and the exact dashboard wiring needed for the "Manage billing" button.

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
| `APP_BASE_URL` | `https://sec-stream-io.lovable.app` | Your deployed URL |

---

## Step 5 — Register the webhook in Stripe

1. Stripe dashboard → **Developers → Webhooks → Add endpoint**
2. **Endpoint URL:** `https://sec-stream-io.lovable.app/api/public/stripe-webhook`
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
function AccountPanel({ plan, renewalDate, email }: { plan: string; renewalDate: string; email: string }) {
  // ... existing code unchanged ...

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

  const handleSubscribe = async () => {
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

  return (
    <Card title="Account">
      {/* ... existing dl block unchanged ... */}
      {plan === "active" ? (
        <Button variant="outline" size="sm" className="mt-6 w-full" onClick={handleManage}>
          Manage billing
        </Button>
      ) : (
        <Button size="sm" className="mt-6 w-full" onClick={handleSubscribe}>
          Subscribe — $10/mo
        </Button>
      )}
    </Card>
  );
}
```

Make sure `supabase` is imported at the top of the file (it already should be —
`import { supabase } from "@/integrations/supabase/client"`).

---

## Step 8 — Test the flow

1. Sign up a fresh test account.
2. Click **Subscribe — $10/mo** → redirected to Stripe Checkout.
3. Pay with a real card (you said live mode).
4. On success → bounced back to `/dashboard?subscribed=1`.
5. Within a few seconds, Stripe fires `checkout.session.completed` → webhook → `profiles.plan = 'active'`.
6. Refresh dashboard → button now reads **Manage billing**.
7. Click **Manage billing** → Stripe Customer Portal opens.
8. Cancel from the portal → Stripe fires `customer.subscription.deleted` → `plan = 'canceled'`.

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
