-- ════════════════════════════════════════════════════════════
-- ZorabiHealth Ecosystem v2
-- Roles: patient, doctor, pharmacy_vendor
-- Tables: profiles, doctor_profiles, pharmacy_profiles,
--         drug_catalog, pharmacy_inventory,
--         prescriptions, prescription_items, orders
-- ════════════════════════════════════════════════════════════

-- ─── 1. User Roles ─────────────────────────────────────────
create table if not exists user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role    text not null check (role in ('patient', 'doctor', 'pharmacy_vendor')),
  created_at timestamptz not null default now()
);

-- ─── 2. Doctor Profiles ────────────────────────────────────
create table if not exists doctor_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references auth.users(id) on delete cascade,
  license_number      text not null unique,
  specialization      text not null,
  qualification       text not null,
  hospital_affiliation text,
  consultation_fee    numeric(10,2) default 0,
  is_verified         boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_doctor_profiles_user on doctor_profiles(user_id);
create index if not exists idx_doctor_profiles_specialization on doctor_profiles(specialization);

-- ─── 3. Pharmacy Profiles (replaces vendors) ────────────────
create table if not exists pharmacy_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users(id) on delete cascade,
  business_name     text not null,
  license_number    text not null unique,
  address           text not null,
  pincode           text not null,
  lat               double precision not null,
  lng               double precision not null,
  phone             text,
  operating_hours   text not null default 'Mon-Sat 09:00-21:00',
  delivery_radius_km double precision not null default 7.0,
  is_verified       boolean not null default false,
  is_active         boolean not null default true,
  rating            double precision not null default 4.5,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_pharmacy_profiles_user on pharmacy_profiles(user_id);
create index if not exists idx_pharmacy_profiles_pincode on pharmacy_profiles(pincode);
create index if not exists idx_pharmacy_profiles_active on pharmacy_profiles(is_active);

-- ─── 4. Drug Catalog (master database) ──────────────────────
create table if not exists drug_catalog (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  generic_name text,
  category    text default 'General',
  manufacturer text,
  created_at  timestamptz not null default now(),
  unique(name, manufacturer)
);

create index if not exists idx_drug_catalog_name on drug_catalog(name);
create index if not exists idx_drug_catalog_category on drug_catalog(category);

-- ─── 5. Pharmacy Inventory (pricing & stock per pharmacy) ────
create table if not exists pharmacy_inventory (
  id              uuid primary key default gen_random_uuid(),
  pharmacy_id     uuid not null references pharmacy_profiles(id) on delete cascade,
  drug_id         uuid not null references drug_catalog(id) on delete cascade,
  price_per_unit  numeric(10,2) not null check (price_per_unit >= 0),
  stock           integer not null default 0 check (stock >= 0),
  is_available    boolean not null default true,
  updated_at      timestamptz not null default now(),
  unique(pharmacy_id, drug_id)
);

create index if not exists idx_pharmacy_inventory_pharmacy on pharmacy_inventory(pharmacy_id);
create index if not exists idx_pharmacy_inventory_drug on pharmacy_inventory(drug_id);

-- ─── 6. Prescriptions (doctor → patient) ────────────────────
create table if not exists prescriptions (
  id           uuid primary key default gen_random_uuid(),
  doctor_id    uuid not null references doctor_profiles(id) on delete cascade,
  patient_id   uuid not null references auth.users(id) on delete cascade,
  diagnosis    text,
  notes        text,
  status       text not null default 'draft' check (status in ('draft','active','filled','partially_filled','expired','cancelled')),
  ai_assisted  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_prescriptions_doctor on prescriptions(doctor_id, created_at desc);
create index if not exists idx_prescriptions_patient on prescriptions(patient_id, created_at desc);
create index if not exists idx_prescriptions_status on prescriptions(status);

-- ─── 7. Prescription Items ───────────────────────────────────
create table if not exists prescription_items (
  id               uuid primary key default gen_random_uuid(),
  prescription_id  uuid not null references prescriptions(id) on delete cascade,
  drug_id          uuid references drug_catalog(id) on delete set null,
  drug_name        text not null,
  dosage           text not null,
  frequency        text not null,
  duration         text not null,
  quantity         integer not null check (quantity > 0),
  notes            text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_prescription_items_prescription on prescription_items(prescription_id);

-- ─── 8. Orders (prescription → pharmacy) ─────────────────────
create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  prescription_id   uuid references prescriptions(id) on delete set null,
  pharmacy_id       uuid not null references pharmacy_profiles(id) on delete restrict,
  patient_id        uuid not null references auth.users(id) on delete cascade,
  status            text not null default 'pending' check (status in ('pending','confirmed','preparing','dispatched','delivered','cancelled')),
  total_amount      numeric(10,2) not null,
  delivery_address  text not null,
  tracking_id       text unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_orders_pharmacy on orders(pharmacy_id, created_at desc);
create index if not exists idx_orders_patient on orders(patient_id, created_at desc);
create index if not exists idx_orders_status on orders(status);

-- ─── 9. Order Timeline Events ────────────────────────────────
create table if not exists order_events (
  id        uuid primary key default gen_random_uuid(),
  order_id  uuid not null references orders(id) on delete cascade,
  status    text not null,
  note      text,
  timestamp timestamptz not null default now()
);

create index if not exists idx_order_events_order on order_events(order_id, timestamp desc);

-- ─── RLS Policies ──────────────────────────────────────────
alter table user_roles enable row level security;
alter table doctor_profiles enable row level security;
alter table pharmacy_profiles enable row level security;
alter table drug_catalog enable row level security;
alter table pharmacy_inventory enable row level security;
alter table prescriptions enable row level security;
alter table prescription_items enable row level security;
alter table orders enable row level security;
alter table order_events enable row level security;

-- User roles: read/insert/update own
drop policy if exists "Users read own role" on user_roles;
create policy "Users read own role"
  on user_roles for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own role" on user_roles;
create policy "Users insert own role"
  on user_roles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own role" on user_roles;
create policy "Users update own role"
  on user_roles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Doctor profiles: read own, update own, insert own
create policy "Doctors manage own profile"
  on doctor_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anyone can read doctor profiles"
  on doctor_profiles for select to authenticated using (true);

-- Pharmacy profiles: read all, manage own
create policy "Anyone can read pharmacy profiles"
  on pharmacy_profiles for select to authenticated using (true);

create policy "Pharmacies manage own profile"
  on pharmacy_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Drug catalog: read all authenticated
create policy "Anyone can read drug catalog"
  on drug_catalog for select to authenticated using (true);

create policy "Pharmacies can add drugs"
  on drug_catalog for insert to authenticated with check (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'pharmacy_vendor')
  );

-- Pharmacy inventory: read all, manage own
create policy "Anyone can read inventory"
  on pharmacy_inventory for select to authenticated using (true);

create policy "Pharmacies manage own inventory"
  on pharmacy_inventory for all
  using (exists (select 1 from pharmacy_profiles where id = pharmacy_id and user_id = auth.uid()))
  with check (exists (select 1 from pharmacy_profiles where id = pharmacy_id and user_id = auth.uid()));

-- Prescriptions: doctors manage, patients read own
create policy "Doctors manage own prescriptions"
  on prescriptions for all
  using (exists (select 1 from doctor_profiles where id = doctor_id and user_id = auth.uid()))
  with check (exists (select 1 from doctor_profiles where id = doctor_id and user_id = auth.uid()));

create policy "Patients read own prescriptions"
  on prescriptions for select
  using (auth.uid() = patient_id);

-- Prescription items: via prescription permissions
create policy "Users read prescription items via prescription"
  on prescription_items for select
  using (exists (
    select 1 from prescriptions
    where id = prescription_id and (patient_id = auth.uid() or
      exists (select 1 from doctor_profiles where id = doctor_id and user_id = auth.uid()))
  ));

create policy "Doctors manage prescription items"
  on prescription_items for insert
  with check (exists (
    select 1 from prescriptions
    where id = prescription_id and exists (select 1 from doctor_profiles where id = doctor_id and user_id = auth.uid())
  ));

-- Orders: patient and pharmacy can read, pharmacy updates
create policy "Patients read own orders"
  on orders for select
  using (auth.uid() = patient_id);

create policy "Pharmacies read and manage orders"
  on orders for all
  using (exists (select 1 from pharmacy_profiles where id = pharmacy_id and user_id = auth.uid()))
  with check (exists (select 1 from pharmacy_profiles where id = pharmacy_id and user_id = auth.uid()));

-- Order events: via order permissions
create policy "Users read order events via order"
  on order_events for select
  using (exists (
    select 1 from orders
    where id = order_id and (patient_id = auth.uid() or
      exists (select 1 from pharmacy_profiles where id = pharmacy_id and user_id = auth.uid()))
  ));

create policy "Pharmacies insert order events"
  on order_events for insert
  with check (exists (
    select 1 from orders
    where id = order_id and exists (select 1 from pharmacy_profiles where id = pharmacy_id and user_id = auth.uid())
  ));

-- Seed common drugs
insert into drug_catalog (name, generic_name, category, manufacturer) values
  ('Dolo 650mg', 'Paracetamol', 'Analgesic', 'Micro Labs'),
  ('Metformin 500mg', 'Metformin Hydrochloride', 'Antidiabetic', 'USV'),
  ('Atorvastatin 10mg', 'Atorvastatin Calcium', 'Statin', 'Pfizer'),
  ('Lisinopril 5mg', 'Lisinopril', 'ACE Inhibitor', 'AstraZeneca'),
  ('Amlodipine 5mg', 'Amlodipine Besylate', 'Calcium Channel Blocker', 'Pfizer'),
  ('Omeprazole 20mg', 'Omeprazole', 'Proton Pump Inhibitor', 'AstraZeneca'),
  ('Vitamin D3 60K', 'Cholecalciferol', 'Supplement', 'Sun Pharma'),
  ('Azithromycin 500mg', 'Azithromycin', 'Antibiotic', 'Pfizer'),
  ('Amoxicillin 500mg', 'Amoxicillin Trihydrate', 'Antibiotic', 'GSK'),
  ('Cetirizine 10mg', 'Cetirizine Hydrochloride', 'Antihistamine', 'Dr. Reddy''s'),
  ('Ibuprofen 400mg', 'Ibuprofen', 'NSAID', 'Abbott'),
  ('Losartan 50mg', 'Losartan Potassium', 'ARB', 'Merck')
on conflict (name, manufacturer) do nothing;

-- Triggers
create trigger update_doctor_profiles_modtime
  before update on doctor_profiles
  for each row execute function update_modified_column();

create trigger update_pharmacy_profiles_modtime
  before update on pharmacy_profiles
  for each row execute function update_modified_column();

create trigger update_prescriptions_modtime
  before update on prescriptions
  for each row execute function update_modified_column();

create trigger update_orders_modtime
  before update on orders
  for each row execute function update_modified_column();
