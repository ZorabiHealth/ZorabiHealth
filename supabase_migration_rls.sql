-- ============================================================
-- ZorabiHealth — RLS Policies & Schema Fixes Migration
-- Run this AFTER the base schema (supabase_schema.sql)
-- ============================================================

-- 1. Enable Row Level Security on all tables
alter table medications enable row level security;
alter table medication_logs enable row level security;
alter table vendors enable row level security;
alter table refill_orders enable row level security;
alter table refill_order_events enable row level security;
alter table voice_messages enable row level security;
alter table symptom_logs enable row level security;

-- 2. Drop existing policies before creating (idempotent)
drop policy if exists "Users can manage own medications" on medications;
drop policy if exists "Users can view own medication logs" on medication_logs;
drop policy if exists "Users can manage own voice messages" on voice_messages;
drop policy if exists "Users can manage own symptom logs" on symptom_logs;
drop policy if exists "Authenticated users can view vendors" on vendors;
drop policy if exists "Users can manage own refill orders" on refill_orders;
drop policy if exists "Users can view own refill order events" on refill_order_events;

-- 3. Medications: users manage their own
create policy "Users can manage own medications"
  on medications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Medication Logs: users can view logs linked to their meds
create policy "Users can view own medication logs"
  on medication_logs for select
  using (
    exists (
      select 1 from medications
      where medications.id = medication_logs.medication_id
      and medications.user_id = auth.uid()
    )
  );

-- Allow insert via the owning medication
create policy "Users can insert own medication logs"
  on medication_logs for insert
  with check (
    exists (
      select 1 from medications
      where medications.id = medication_id
      and medications.user_id = auth.uid()
    )
  );

-- 5. Vendors: visible to all authenticated users (public directory)
create policy "Authenticated users can view vendors"
  on vendors for select
  to authenticated
  using (true);

-- Allow insert by any authenticated user (pharmacy registration)
create policy "Authenticated users can insert vendors"
  on vendors for insert
  to authenticated
  with check (true);

-- 6. Refill Orders: users manage their own
create policy "Users can manage own refill orders"
  on refill_orders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 7. Refill Order Events: users can view events on their orders
create policy "Users can view own refill order events"
  on refill_order_events for select
  using (
    exists (
      select 1 from refill_orders
      where refill_orders.id = refill_order_events.order_id
      and refill_orders.user_id = auth.uid()
    )
  );

create policy "Users can insert own refill order events"
  on refill_order_events for insert
  with check (
    exists (
      select 1 from refill_orders
      where refill_orders.id = order_id
      and refill_orders.user_id = auth.uid()
    )
  );

-- 8. Voice Messages: users manage their own
create policy "Users can manage own voice messages"
  on voice_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 9. Symptom Logs: users manage their own
create policy "Users can manage own symptom logs"
  on symptom_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 10. Remove insecure default UUIDs and add proper FK constraints
-- NOTE: Run only after migrating existing data if any
-- ALTER TABLE medications ALTER COLUMN user_id DROP DEFAULT;
-- ALTER TABLE refill_orders ALTER COLUMN user_id DROP DEFAULT;
-- ALTER TABLE voice_messages ALTER COLUMN user_id DROP DEFAULT;
-- ALTER TABLE symptom_logs ALTER COLUMN user_id DROP DEFAULT;

-- 11. Add audio_url column to voice_messages (used by voice agent but missing from base schema)
alter table voice_messages add column if not exists audio_url text;

-- 12. Add user_id indexes for performance
create index if not exists idx_refill_orders_user_status on refill_orders(user_id, status);
create index if not exists idx_voice_messages_user_intent on voice_messages(user_id, intent);
create index if not exists idx_medication_logs_medication_status on medication_logs(medication_id, status);
create index if not exists idx_symptom_logs_user_severity on symptom_logs(user_id, severity);

-- 13. Full-text search index on voice messages
alter table voice_messages add column if not exists text_search tsvector
  generated always as (to_tsvector('english', coalesce(text, ''))) stored;
create index if not exists idx_voice_messages_text_search on voice_messages using gin(text_search);
