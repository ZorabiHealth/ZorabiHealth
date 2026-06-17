create table if not exists pharmacy_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  license_number text unique,
  address text not null default '',
  city text not null default '',
  pincode text not null default '',
  phone text,
  email text,
  rating numeric(3,2) default 3.0,
  delivery_radius_km integer default 10,
  is_active boolean not null default false,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_pharmacy_profiles_user_id on pharmacy_profiles(user_id);
create index if not exists idx_pharmacy_profiles_pincode on pharmacy_profiles(pincode);
alter table pharmacy_profiles enable row level security;
create policy "Vendor can read own profile" on pharmacy_profiles for select using (user_id = auth.uid());
create policy "Vendor can update own profile" on pharmacy_profiles for update using (user_id = auth.uid());
create policy "Anyone can view active pharmacies" on pharmacy_profiles for select using (is_active = true and is_verified = true);
create table if not exists pharmacy_inventory (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references pharmacy_profiles(id) on delete cascade,
  drug_id uuid,
  drug_name text not null,
  stock integer not null default 0,
  price_per_unit numeric(10,2) not null default 0,
  auto_refill_threshold integer,
  updated_at timestamptz not null default now()
);
alter table pharmacy_inventory enable row level security;
create policy "Vendors manage own inventory" on pharmacy_inventory for all using (pharmacy_id in (select id from pharmacy_profiles where user_id = auth.uid()));
