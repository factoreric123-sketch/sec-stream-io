-- Stripe billing integration columns.
-- profiles.plan / renewal_date already exist; these wire them to a Stripe customer + subscription.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Lookup by stripe_customer_id is the hot path for webhook handlers.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_customer
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription
  ON public.profiles (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.stripe_customer_id IS
  'Stripe customer ID (cus_...). Set on first successful checkout.';
COMMENT ON COLUMN public.profiles.stripe_subscription_id IS
  'Active Stripe subscription ID (sub_...). NULL when no active subscription.';

-- Idempotency: prevent processing the same Stripe event twice.
CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id    TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_received
  ON public.stripe_events (received_at DESC);
