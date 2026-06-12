## Scope

Skip items already done. Ship the remaining launch blockers + the additions Claude flagged.

### What I'll do

1. **Dynamic origin in checkout + portal routes**
   - `src/routes/api/public/stripe-checkout.ts` and `src/routes/api/public/v1/billing/portal.ts`: derive base URL from `request.headers.get("origin")` (fallback to `host` header, then `APP_BASE_URL` env, then a safe default). This makes preview, `sec-stream-io.lovable.app`, and `sec-filing-api.com` all work without env juggling.

2. **Delete dead code**
   - Remove `src/lib/stripe.functions.ts` (unused — real flow uses the server route).

3. **Terms of Service + Privacy Policy**
   - New routes `src/routes/terms.tsx` and `src/routes/privacy.tsx` with proper `head()` meta (title, description, canonical on `sec-filing-api.com`).
   - Content tailored to this product: $10/mo SEC filings API, Supabase + Stripe sub-processors, email + usage logs + IP for rate limiting, GDPR basics, cancellation = stop billing at period end, no refunds for partial months, acceptable use (rate limits, no scraping abuse, no resale of raw data).
   - Footer links + a "By creating an account you agree to the Terms and Privacy Policy" line under the signup button.

4. **Better 403 message in `src/server/apiAuth.server.ts`**
   - Distinguish three cases in `isPlanActive`/error builder:
     - `plan === 'free'` → "No active subscription. Subscribe at https://sec-filing-api.com/dashboard to get API access."
     - `plan === 'canceled'` → "Your subscription was canceled. Reactivate at https://sec-filing-api.com/dashboard to continue."
     - `plan === 'past_due'` (outside grace) → "Payment failed on your subscription. Update your card at https://sec-filing-api.com/dashboard."
   - Keep the `code: "plan_inactive"` machine-readable code stable.

5. **Domain refresh**
   - Update hardcoded `sec-stream-io.lovable.app` references in `STRIPE_SETUP.md`, `LOGO_WIRING.md`, `WEBHOOKS.md` to `sec-filing-api.com`.
   - Update `src/routes/__root.tsx` OpenGraph meta (`og:url`, `og:image`, `twitter:*`, canonical site) to use `sec-filing-api.com`.
   - CORS in `apiAuth.server.ts` is already `*` — leave it, just confirm.

### Explicitly skipped (already done)

- ~~Migration to default `plan='free'` + backfill~~ — applied in `20260605194452_*.sql` and `20260605195201_*.sql`.
- ~~Post-checkout polling on `/dashboard`~~ — already in `dashboard.tsx` lines 78–96 (polls every 2s, up to 15 tries, reloads on `active`).

### Not in this pass (call out, don't do)

- Actual $10 live charge acceptance test — you have to run this yourself after deploy; I can't execute a real card.
- Confirming `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` / `STRIPE_SECRET_KEY` / `APP_BASE_URL` are set in Project Secrets — you'll need to verify in Settings.

### Deliverable

After build mode, I'll paste the full diff of every changed file before you deploy.
