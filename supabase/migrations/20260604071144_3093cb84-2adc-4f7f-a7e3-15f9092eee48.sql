-- Hide webhook signing secret from clients via column-level privileges.
-- The SELECT RLS policy still lets users read their own rows, but the
-- 'secret' column is no longer selectable by anon/authenticated.
REVOKE SELECT ON public.webhooks FROM anon, authenticated;
GRANT SELECT (id, user_id, url, label, active, events, created_at, last_delivery_at)
  ON public.webhooks TO authenticated;
-- INSERT/UPDATE/DELETE remain governed by RLS; re-grant write privileges.
GRANT INSERT, UPDATE, DELETE ON public.webhooks TO authenticated;