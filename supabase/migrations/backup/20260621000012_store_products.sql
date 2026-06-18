create table if not exists store_products (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  name          text not null,
  generic_name  text not null default '',
  manufacturer  text not null default '',
  category      text not null default 'General',
  description   text not null default '',
  composition   text not null default '',
  dosage        text not null default '',
  usage         text not null default '',
  side_effects  text not null default '',
  safety        jsonb not null default '[]',
  storage       text not null default '',
  price         numeric(10,2) not null default 0,
  mrp           numeric(10,2) not null default 0,
  image_url     text not null default '/images/placeholder.svg',
  is_pinned     boolean not null default false,
  is_active     boolean not null default true,
  in_stock      boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table store_products enable row level security;

-- Vendors can manage their own products; everyone can read active
drop policy if exists "Vendors can manage own products" on store_products;
create policy "Vendors can manage own products"
  on store_products for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Anyone can read active store products" on store_products;
create policy "Anyone can read active store products"
  on store_products for select
  using (is_active = true);

-- Also re-add to realtime publication (in case it was dropped by CASCADE)
alter publication supabase_realtime add table public.store_products;
