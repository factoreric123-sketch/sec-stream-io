
-- 1. API keys: drop plaintext column
ALTER TABLE public.api_keys DROP COLUMN IF EXISTS key_plaintext;

-- 2. Stop auto-issuing a key on signup; only create the profile row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$function$;

-- 3. Lock down privileged profile fields
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE OR REPLACE FUNCTION public.guard_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.rate_limit_per_min IS DISTINCT FROM OLD.rate_limit_per_min
     OR NEW.renewal_date IS DISTINCT FROM OLD.renewal_date
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Cannot modify privileged profile fields (plan, rate_limit_per_min, renewal_date, id)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_privileged ON public.profiles;
CREATE TRIGGER profiles_guard_privileged
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_fields();

CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Enable RLS (deny-all by default) on internal bot tables
ALTER TABLE public.filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_scan_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insider_form4_filings ENABLE ROW LEVEL SECURITY;

-- 5. Remove public write policies on sec_filings (writes are server-side via service role)
DROP POLICY IF EXISTS "Allow insert" ON public.sec_filings;
DROP POLICY IF EXISTS "Allow update" ON public.sec_filings;

-- 6. Idempotency table for write endpoints
CREATE TABLE IF NOT EXISTS public.idempotency_records (
  key TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_hash TEXT NOT NULL,
  status INT NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
CREATE INDEX IF NOT EXISTS idx_idemp_created ON public.idempotency_records (created_at);
ALTER TABLE public.idempotency_records ENABLE ROW LEVEL SECURITY;
-- No policies = no access via anon/authenticated; service role bypasses RLS.

-- 7. Rate limiter bucket table + atomic increment RPC
CREATE TABLE IF NOT EXISTS public.rate_buckets (
  user_id UUID NOT NULL,
  bucket BIGINT NOT NULL,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, bucket)
);
ALTER TABLE public.rate_buckets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rate_bucket_incr(p_user UUID, p_bucket BIGINT)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.rate_buckets (user_id, bucket, count)
  VALUES (p_user, p_bucket, 1)
  ON CONFLICT (user_id, bucket)
  DO UPDATE SET count = rate_buckets.count + 1
  RETURNING count;
$$;
