REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (email) ON public.profiles TO authenticated;