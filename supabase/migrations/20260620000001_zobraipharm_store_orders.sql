-- ZorabiPharm Store Orders
-- Links pharmacy store purchases to authenticated users

create table if not exists store_orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  tracking_id       text not null unique,
  customer_name     text not null,
  phone             text not null,
  address           text not null,
  city              text not null,
  pincode           text not null,
  status            text not null default 'PENDING'
                    check (status in ('PENDING','CONFIRMED','PREPARING','DISPATCHED','DELIVERED','CANCELLED')),
  total             numeric(10,2) not null default 0,
  estimated_delivery timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists store_order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references store_orders(id) on delete cascade,
  product_id        text,
  product_name      text not null,
  product_price     numeric(10,2) not null,
  quantity          integer not null check (quantity > 0)
);

create table if not exists store_order_events (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references store_orders(id) on delete cascade,
  status            text not null,
  note              text,
  timestamp         timestamptz not null default now()
);

create index if not exists idx_store_orders_user on store_orders(user_id, created_at desc);
create index if not exists idx_store_orders_tracking on store_orders(tracking_id);
create index if not exists idx_store_order_items_order on store_order_items(order_id);
create index if not exists idx_store_order_events_order on store_order_events(order_id, timestamp);

-- Enable RLS
alter table store_orders enable row level security;
alter table store_order_items enable row level security;
alter table store_order_events enable row level security;

-- Users can read their own orders
create policy "Users read own store orders"
  on store_orders for select
  using (auth.uid() = user_id);

-- Authenticated users can insert their own orders
create policy "Users insert own store orders"
  on store_orders for insert
  with check (auth.uid() = user_id);

-- Users read own order items
create policy "Users read own store order items"
  on store_order_items for select
  using (exists (
    select 1 from store_orders where id = order_id and user_id = auth.uid()
  ));

-- Users insert items for own orders
create policy "Users insert store order items"
  on store_order_items for insert
  with check (exists (
    select 1 from store_orders where id = order_id and user_id = auth.uid()
  ));

-- Users read own order events
create policy "Users read own store order events"
  on store_order_events for select
  using (exists (
    select 1 from store_orders where id = order_id and user_id = auth.uid()
  ));

-- Users insert events for own orders
create policy "Users insert store order events"
  on store_order_events for insert
  with check (exists (
    select 1 from store_orders where id = order_id and user_id = auth.uid()
  ));
