-- Add messages and conversations to supabase_realtime publication
-- These were missing, breaking realtime chat

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
