-- Run this once in the Supabase SQL Editor
-- Requires pg_cron extension (enabled by default on Supabase)

-- Enable pg_cron if not already enabled
create extension if not exists pg_cron;

-- Schedule: every 5 minutes, call the Edge Function
select cron.schedule(
  'poll-sec-filings',           -- job name
  '*/5 * * * *',                -- every 5 minutes
  $$
  select net.http_post(
    url := 'https://cdosopezegatziozmhcu.supabase.co/functions/v1/poll-sec-filings',
    headers := '{"Authorization": "Bearer sb_secret_abeCfTbJwZ9liGz-qyi_ew_ZVgjx50i", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- To check the schedule is registered:
-- select * from cron.job;

-- To remove it later:
-- select cron.unschedule('poll-sec-filings');
