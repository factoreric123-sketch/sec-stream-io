
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS lifetime_request_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_quota INTEGER NOT NULL DEFAULT 10;

CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.stripe_events TO service_role;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_quota(p_user_id uuid)
RETURNS TABLE(new_count integer, free_quota integer, plan text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET lifetime_request_count = lifetime_request_count + 1
   WHERE id = p_user_id;

  RETURN QUERY
    SELECT p.lifetime_request_count, p.free_quota, p.plan
      FROM public.profiles p
     WHERE p.id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_quota(uuid) TO service_role, authenticated;

-- Allow service_role (webhooks) to update privileged fields; still block normal users.
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.rate_limit_per_min IS DISTINCT FROM OLD.rate_limit_per_min
     OR NEW.renewal_date IS DISTINCT FROM OLD.renewal_date
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.lifetime_request_count IS DISTINCT FROM OLD.lifetime_request_count
     OR NEW.free_quota IS DISTINCT FROM OLD.free_quota
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Cannot modify privileged profile fields';
  END IF;
  RETURN NEW;
END;
$$;
