-- Fix: user_pairings was dropped from supabase_realtime publication
-- when 20260614_professional_schema.sql recreated it with CASCADE.
-- Re-add it so the web dashboard gets live updates when pairing succeeds.
alter publication supabase_realtime add table public.user_pairings;

-- Add device_name column so the actual phone name is stored and displayed
alter table user_pairings add column if not exists device_name text default 'Mobile Device';
