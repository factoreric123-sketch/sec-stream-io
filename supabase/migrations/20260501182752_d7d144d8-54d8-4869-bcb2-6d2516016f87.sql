ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rate_limit_per_min integer NOT NULL DEFAULT 60;

CREATE INDEX IF NOT EXISTS usage_logs_user_recent
  ON public.usage_logs (user_id, created_at DESC);