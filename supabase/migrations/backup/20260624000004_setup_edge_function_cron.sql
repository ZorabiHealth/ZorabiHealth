-- Schedule dispatch-notifications Edge Function via pg_cron
-- Replaces the net.http_post() approach (migration 000003).
-- The Edge Function URL is called directly by pg_cron.
-- Edge Functions are public by default, so no auth headers needed.

-- 1. Remove old cron schedules (from 000002 and 000003)
select cron.unschedule('dispatch-notifications');

-- 2. Schedule the Edge Function every 5 minutes
select cron.schedule(
  'dispatch-notifications',
  '*/5 * * * *',
  'https://vfpwwpzvkkegriuarsjt.supabase.co/functions/v1/dispatch-notifications'
);

-- 3. Drop the old PL/pgSQL helper (from 000003) since it's no longer needed
drop function if exists public.dispatch_notifications;

-- Verify:
-- select * from cron.job order by jobid desc limit 5;
