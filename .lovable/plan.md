## Problems found

1. **Everyone is "active" by default.** `profiles.plan` defaults to `'active'`, so a brand‑new signup never sees an "Upgrade" button (the dashboard shows "Manage subscription" instead, which 404s because they have no Stripe customer). This is the biggest bug.
2. **`STRIPE_PRICE_ID` is read from env but never set.** `/api/public/stripe-checkout` will return 500 ("Server not configured"). The actual $10/mo price already exists: `price_1TeVlEA5UN3d5T9yfSUeC75g`.
3. **`STRIPE_WEBHOOK_SECRET` is not set.** Without it the webhook returns 500 and `profiles.plan` is never flipped to `active` after a successful checkout. The webhook endpoint also isn't registered in Stripe yet.
4. **Two parallel checkout implementations.** `src/lib/stripe.functions.ts` (server fn, hardcoded price) and `src/routes/api/public/stripe-checkout.ts` (route, env price) both exist. Dashboard uses the route. Delete the unused server fn to avoid drift.
5. **Signup UX.** Signup navigates straight to `/dashboard` and assumes the session is live. If Supabase "Confirm email" is on, navigation happens before the session exists → dashboard bounces to `/login`. Need to either confirm the project setting or show a "check your email" state.
6. **No post‑checkout feedback.** Stripe returns user to `/dashboard?checkout=success`, but the dashboard ignores the param and shows stale `plan=free` until the next reload (webhook runs async).
7. **Hardcoded production base URL.** `APP_BASE_URL` defaults to the published domain, so previews send users to the wrong success/cancel URL. Derive from the request `Origin`/`Host`.

## Fix plan

### 1. Database — make new users start on free tier
Migration:
- `ALTER TABLE profiles ALTER COLUMN plan SET DEFAULT 'free';`
- Backfill: set every existing row whose plan is `'active'` AND `stripe_customer_id IS NULL` to `'free'` (i.e. users who never paid).
- Confirm `handle_new_user()` doesn't set `plan` explicitly (it doesn't — default takes over).

### 2. Secrets / configuration
- Add `STRIPE_PRICE_ID = price_1TeVlEA5UN3d5T9yfSUeC75g` runtime secret.
- Add `STRIPE_WEBHOOK_SECRET` (whsec_…) — user must create a webhook endpoint in Stripe pointing at `https://sec-stream-io.lovable.app/api/public/stripe-webhook` for the events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`, then paste the signing secret.

### 3. Code fixes
- **`src/routes/api/public/stripe-checkout.ts`** — derive base URL from `request.headers.get('origin')` (fallback to `host` header, then `APP_BASE_URL`) so preview deployments work.
- **`src/routes/api/public/v1/billing/portal.ts`** — same dynamic origin.
- **`src/lib/stripe.functions.ts`** — delete (unused; dashboard calls the route).
- **`src/routes/dashboard.tsx`**
  - When `?checkout=success` is in URL: show success toast, strip the param, and re‑fetch the profile every 2s for up to ~20s until `plan === 'active'`.
  - When `?checkout=cancelled`: show an info toast and strip the param.
  - The upgrade button stays POST → JSON `{url}` → `window.location.href` (already correct).
- **`src/lib/auth.tsx`** — extend `Profile["plan"]` union to include `'free' | 'incomplete' | 'trialing'` so the existing webhook statuses round‑trip cleanly. The dashboard already keys its CTA off `plan === 'active'`, which is what we want.
- **`src/routes/signup.tsx`** — after `signup()`, check whether a session was returned. If yes (email confirmation disabled), navigate to `/dashboard`. If no, show "Check your email to confirm, then sign in" inline instead of navigating.

### 4. Verification checklist after deploy
- Sign up a brand‑new user → land on dashboard → see "Upgrade to Pro — $10/mo".
- Click upgrade → redirected to Stripe Checkout for $10/mo.
- Complete checkout with `4242 4242 4242 4242` → returned to `/dashboard?checkout=success` → toast appears → within ~5s plan flips to `active` and button becomes "Manage subscription".
- Click "Manage subscription" → Stripe Customer Portal opens.
- In Stripe dashboard, cancel the subscription → `customer.subscription.deleted` webhook → plan flips to `canceled`.

## Notes on what is intentionally NOT changing

- Keeping the Customer Portal and Checkout as `/api/public/*` server routes (correct shape for redirect handlers — they return a JSON `{ url }` and don't need to be RPC).
- Keeping the existing `stripe_events` idempotency table and `consume_quota` RPC (already in place).
- Not touching the Lovable‑managed Stripe integration — this stays on bring‑your‑own‑key Stripe since the secret is already configured.

## Open question

Does your Supabase project have **"Confirm email" turned on or off** under Auth → Providers → Email? If on, the signup flow has to show a "check your inbox" screen before any Stripe redirect is possible. If off, signup goes straight to dashboard and then to Stripe. Tell me which one you want and I'll wire the signup page accordingly.