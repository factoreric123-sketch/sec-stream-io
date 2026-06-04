-- Freemium model: new signups get 'free' plan with a 10-call lifetime quota.
-- Paid checkout via Stripe flips plan to 'active' (handled in stripe-webhook).

-- 1. Add quota tracking columns.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lifetime_request_count BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_quota             INT    NOT NULL DEFAULT 10;

COMMENT ON COLUMN public.profiles.lifetime_request_count IS
  'Total number of authenticated API requests this user has made. Only enforced for plan=free.';
COMMENT ON COLUMN public.profiles.free_quota IS
  'Lifetime free-tier API call cap. Default 10. Bypassed when plan=active.';

-- 2. Change the default plan for new signups from 'active' to 'free'.
ALTER TABLE public.profiles
  ALTER COLUMN plan SET DEFAULT 'free',
  ALTER COLUMN renewal_date DROP DEFAULT;

ALTER TABLE public.profiles
  ALTER COLUMN renewal_date DROP NOT NULL;

-- 3. Replace handle_new_user() trigger to create profile with plan=free + NULL renewal_date.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_key TEXT;
  prefix TEXT;
BEGIN
  -- Profile: free plan, no renewal date (set when they pay).
  INSERT INTO public.profiles (id, email, plan, renewal_date)
  VALUES (NEW.id, NEW.email, 'free', NULL);

  -- Provision their first API key.
  new_key := 'sk_live_' || encode(gen_random_bytes(24), 'hex');
  prefix := substring(new_key from 1 for 11);

  INSERT INTO public.api_keys (user_id, key_hash, key_prefix, key_last4, key_plaintext)
  VALUES (
    NEW.id,
    encode(digest(new_key, 'sha256'), 'hex'),
    prefix,
    right(new_key, 4),
    new_key
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- 4. RESET existing users to free tier.
-- Anyone currently marked 'active' without a stripe_customer_id was auto-granted
-- by the old trigger. Move them to free with a fresh 10-call quota.
UPDATE public.profiles
  SET plan = 'free',
      renewal_date = NULL,
      lifetime_request_count = 0
  WHERE plan = 'active'
    AND (stripe_customer_id IS NULL OR stripe_customer_id = '');

-- 5. Atomic quota check + increment RPC.
-- Returns the count AFTER incrementing. Caller compares to free_quota.
-- For paid users this still increments (for analytics) but the API auth path
-- ignores the result when plan='active'.
CREATE OR REPLACE FUNCTION public.consume_quota(p_user_id UUID)
RETURNS TABLE (
  new_count BIGINT,
  free_quota INT,
  plan TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.profiles
     SET lifetime_request_count = lifetime_request_count + 1
   WHERE id = p_user_id
   RETURNING lifetime_request_count, profiles.free_quota, profiles.plan;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_quota(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_quota(UUID) TO service_role;
