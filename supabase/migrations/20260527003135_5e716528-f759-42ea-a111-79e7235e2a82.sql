
-- 1. Enable RLS on sec_filings (admin/service-role bypasses; no client policies = deny)
ALTER TABLE public.sec_filings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sec_filings FROM anon, authenticated;
GRANT ALL ON public.sec_filings TO service_role;

-- 2. Webhooks: hide signing secret from client reads. Plaintext is shown once at
-- creation (generated client-side) and only the service role can read it afterward.
REVOKE SELECT (secret) ON public.webhooks FROM anon, authenticated;

-- 3. usage_logs: remove client INSERT policy (only service role writes audit logs)
DROP POLICY IF EXISTS "Users insert own logs" ON public.usage_logs;
REVOKE INSERT ON public.usage_logs FROM anon, authenticated;

-- 4. Lock down SECURITY DEFINER functions: only service role / triggers may call
REVOKE ALL ON FUNCTION public.rate_bucket_incr(uuid, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_bucket_incr(uuid, bigint) TO service_role;

REVOKE ALL ON FUNCTION public.guard_profile_privileged_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
