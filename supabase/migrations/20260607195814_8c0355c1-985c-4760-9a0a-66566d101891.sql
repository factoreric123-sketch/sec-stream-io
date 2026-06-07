-- Lock down SECURITY DEFINER functions: revoke EXECUTE from anon/authenticated/PUBLIC.
-- These are invoked from server-side code (service_role) or as triggers — clients should not call them via PostgREST.

REVOKE EXECUTE ON FUNCTION public.rate_bucket_incr(uuid, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_quota(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_profile_privileged_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Ensure service_role can still execute them.
GRANT EXECUTE ON FUNCTION public.rate_bucket_incr(uuid, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_quota(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_profile_privileged_fields() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;