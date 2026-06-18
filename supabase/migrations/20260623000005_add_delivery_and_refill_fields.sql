-- Add delivery address fields to patient_profiles
alter table patient_profiles add column if not exists delivery_address text;
alter table patient_profiles add column if not exists delivery_city text;
alter table patient_profiles add column if not exists delivery_pincode text;
alter table patient_profiles add column if not exists default_payment_method text not null default 'COD';

-- Add payment method + estimated delivery to refill_orders
alter table refill_orders add column if not exists payment_method text not null default 'COD';
alter table refill_orders add column if not exists estimated_delivery timestamptz;

-- Create refill_order_events table for timeline tracking
drop table if exists refill_order_events cascade;
create table refill_order_events (
  id                uuid primary key default gen_random_uuid(),
  refill_order_id   uuid not null references refill_orders(id) on delete cascade,
  status            text not null,
  note              text,
  timestamp         timestamptz not null default now()
);

create index if not exists idx_refill_order_events_order on refill_order_events(refill_order_id, timestamp);

alter table refill_order_events enable row level security;

drop policy if exists "Users read own refill order events" on refill_order_events;
create policy "Users read own refill order events"
  on refill_order_events for select
  using (exists (
    select 1 from refill_orders where id = refill_order_id and user_id = auth.uid()
  ));

drop policy if exists "Users insert own refill order events" on refill_order_events;
create policy "Users insert own refill order events"
  on refill_order_events for insert
  with check (exists (
    select 1 from refill_orders where id = refill_order_id and user_id = auth.uid()
  ));
