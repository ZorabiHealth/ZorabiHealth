create table if not exists refill_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  medication_id text not null,
  medication_name text not null,
  dosage text,
  quantity integer not null default 30,
  frequency text default 'monthly',
  status text not null default 'ACTIVE',
  tracking_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_refill_orders_user_id on refill_orders(user_id);

alter table refill_orders enable row level security;

drop policy if exists "Users manage their own refill orders" on refill_orders;
create policy "Users manage their own refill orders"
  on refill_orders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
