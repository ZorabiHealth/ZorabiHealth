-- Fix: notifications and medication_logs were dropped from supabase_realtime
-- publication by the CASCADE in 20260614_professional_schema.sql.
-- This broke Realtime subscriptions (postgres_changes) for both mobile and web.
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.medication_logs;
