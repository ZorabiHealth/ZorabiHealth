-- Fix notification dispatch cron: call Vercel endpoint via net.http_post()
-- Replaces the previous Edge Function approach that had deployment issues.

-- 1. Remove old cron schedule (if any from previous migration)
select cron.unschedule('dispatch-notifications');

-- 2. Create function that POSTs to the Vercel dispatch endpoint
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

-- 3. Schedule every 5 minutes
select cron.schedule('dispatch-notifications', '*/5 * * * *', 'select public.dispatch_notifications();');

-- Setup required before this works:
--   alter database postgres set app.vercel_url = 'https://your-app.vercel.app/api/notifications/dispatch';
--   alter database postgres set app.cron_secret = 'your-cron-secret';
--   select pg_reload_conf();
