-- ZorabiHealth: Schedule notification dispatch via pg_cron
-- Calls the existing Vercel dispatch endpoint using net.http_post()
-- Requires: pg_net extension (Supabase Pro feature)
-- Replaces the Vercel cron job (removed from vercel.json).

-- 1. Enable extensions (idempotent)
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 2. Create a function that calls the Vercel dispatch endpoint
create or replace function public.dispatch_notifications()
returns void
language plpgsql
security definer
as $$
begin
  perform extensions.net.http_post(
    url := current_setting('app.vercel_url', true),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
end;
$$;

-- 3. Schedule it every 5 minutes
-- IMPORTANT: Before this works, run in SQL Editor:
--   alter database postgres set app.vercel_url = 'https://your-app.vercel.app/api/notifications/dispatch';
--   alter database postgres set app.cron_secret = 'your-cron-secret-value';
--   select pg_reload_conf();
select cron.schedule('dispatch-notifications', '*/5 * * * *', 'select public.dispatch_notifications();');

-- To remove:
--   select cron.unschedule('dispatch-notifications');
--   drop function if exists public.dispatch_notifications;
