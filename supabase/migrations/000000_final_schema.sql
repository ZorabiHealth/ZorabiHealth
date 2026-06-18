-- ===== 20260609_notifications.sql =====
-- ZorabiHealth Push Notification System
-- Run this in your Supabase SQL Editor

-- 1. Notification Devices (registered push endpoints)
-- Supports Web Push, FCM (Android), and APNs (iOS) transports
CREATE TABLE IF NOT EXISTS notification_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL DEFAULT 'Unknown',
  device_os TEXT DEFAULT NULL,            -- 'android', 'ios', 'windows', 'macos', 'linux'
  app_version TEXT DEFAULT NULL,           -- semantic version of the installed app
  transport TEXT NOT NULL DEFAULT 'web_push' CHECK (transport IN ('web_push', 'fcm', 'apns')),
  platform TEXT NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'android', 'ios')),
  push_endpoint TEXT,
  push_keys JSONB DEFAULT '{}',
  fcm_token TEXT,                          -- Firebase Cloud Messaging token (Android / iOS)
  apns_token TEXT,                         -- Apple Push Notification token
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Ensure at least one delivery address per device
  CONSTRAINT chk_device_has_token CHECK (
    (transport = 'web_push' AND push_endpoint IS NOT NULL) OR
    (transport = 'fcm' AND fcm_token IS NOT NULL) OR
    (transport = 'apns' AND apns_token IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_notification_devices_user ON notification_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_devices_active ON notification_devices(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_devices_transport ON notification_devices(transport);

ALTER TABLE notification_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own devices" ON notification_devices;
CREATE POLICY "Users can read own devices"
  ON notification_devices FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own devices" ON notification_devices;
CREATE POLICY "Users can insert own devices"
  ON notification_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own devices" ON notification_devices;
CREATE POLICY "Users can update own devices"
  ON notification_devices FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. Notifications (the actual notification content)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'system' CHECK (category IN ('medication', 'vital', 'appointment', 'system')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  sent_via TEXT[] DEFAULT '{}',           -- tracks which transports already received this: {'web_push', 'fcm'}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unscheduled ON notifications(scheduled_for) WHERE scheduled_for IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Notification Delivery (per-device delivery tracking)
-- Also records which transport was used for each delivery attempt
CREATE TABLE IF NOT EXISTS notification_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES notification_devices(id) ON DELETE CASCADE,
  transport TEXT NOT NULL DEFAULT 'web_push' CHECK (transport IN ('web_push', 'fcm', 'apns')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'clicked', 'failed', 'expired')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  UNIQUE(notification_id, device_id, transport)
);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_notif ON notification_delivery(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_device ON notification_delivery(device_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_status ON notification_delivery(status);

ALTER TABLE notification_delivery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own deliveries" ON notification_delivery;
CREATE POLICY "Users can read own deliveries"
  ON notification_delivery FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_id AND n.user_id = auth.uid()
    )
  );

-- 4. Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_reminders BOOLEAN NOT NULL DEFAULT true,
  vital_alerts BOOLEAN NOT NULL DEFAULT true,
  app_notifications BOOLEAN NOT NULL DEFAULT true,  -- mobile app push toggle
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own preferences" ON notification_preferences;
CREATE POLICY "Users can read own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own preferences" ON notification_preferences;
CREATE POLICY "Users can upsert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON notification_preferences;
CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);



-- ===== 20260610_add_missing_notification_devices_columns.sql =====
-- Add missing columns to notification_devices table
-- The original migration defined these but they may not have been applied

ALTER TABLE notification_devices
ADD COLUMN IF NOT EXISTS transport TEXT NOT NULL DEFAULT 'web_push'
  CHECK (transport IN ('web_push', 'fcm', 'apns'));

ALTER TABLE notification_devices
ADD COLUMN IF NOT EXISTS device_os TEXT DEFAULT NULL;

ALTER TABLE notification_devices
ADD COLUMN IF NOT EXISTS push_endpoint TEXT;

ALTER TABLE notification_devices
ADD COLUMN IF NOT EXISTS push_keys JSONB DEFAULT '{}';

ALTER TABLE notification_devices
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

ALTER TABLE notification_devices
ADD COLUMN IF NOT EXISTS apns_token TEXT;

ALTER TABLE notification_devices
ADD COLUMN IF NOT EXISTS app_version TEXT DEFAULT NULL;



-- ===== 20260611_user_pairings.sql =====
-- ZorabiHealth: User Pairings Table
-- Clean Supabase-only linkage between web and mobile accounts.
-- No FCM/push notification dependencies.

CREATE TABLE IF NOT EXISTS user_pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  web_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mobile_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL DEFAULT 'Mobile Device',
  paired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT uq_pairing UNIQUE (web_user_id, mobile_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_pairings_web_user ON user_pairings(web_user_id);
CREATE INDEX IF NOT EXISTS idx_user_pairings_mobile_user ON user_pairings(mobile_user_id);

ALTER TABLE user_pairings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_pairings'
      AND policyname = 'Users can read own pairings as web user'
  ) THEN
    CREATE POLICY "Users can read own pairings as web user"
      ON user_pairings FOR SELECT
      USING (auth.uid() = web_user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_pairings'
      AND policyname = 'Users can read own pairings as mobile user'
  ) THEN
    CREATE POLICY "Users can read own pairings as mobile user"
      ON user_pairings FOR SELECT
      USING (auth.uid() = mobile_user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_pairings'
      AND policyname = 'Service role can insert pairings'
  ) THEN
    CREATE POLICY "Service role can insert pairings"
      ON user_pairings FOR INSERT
      WITH CHECK (false);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_pairings'
      AND policyname = 'Service role can update pairings'
  ) THEN
    CREATE POLICY "Service role can update pairings"
      ON user_pairings FOR UPDATE
      USING (false);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_pairings'
      AND policyname = 'Service role can delete pairings'
  ) THEN
    CREATE POLICY "Service role can delete pairings"
      ON user_pairings FOR DELETE
      USING (false);
  END IF;
END
$$;

-- Enable Realtime for live UI updates on the web dashboard
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_pairings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.user_pairings;
  END IF;
END
$$;

-- ===== 20260618000001_vital_signs.sql =====
-- ============================================================
-- ZorabiHealth — Vital Signs Table
-- Date-wise vitals tracking per patient, linked to prescriptions
-- ============================================================

create table if not exists vital_signs (
  id                     uuid primary key default gen_random_uuid(),
  patient_id             uuid not null references patient_profiles(id) on delete cascade,
  doctor_id              uuid not null references doctor_profiles(id) on delete cascade,
  prescription_id        uuid references prescriptions(id) on delete set null,
  blood_pressure_systolic  integer,
  blood_pressure_diastolic integer,
  heart_rate             integer,
  temperature            numeric(4,1),
  oxygen_saturation      integer,
  respiratory_rate       integer,
  weight                 numeric(5,1),
  height                 numeric(5,1),
  bmi                    numeric(4,1),
  symptoms               text,
  recorded_at            timestamptz not null default now(),
  created_at             timestamptz not null default now()
);

create index if not exists idx_vital_signs_patient on vital_signs(patient_id, recorded_at desc);
create index if not exists idx_vital_signs_doctor on vital_signs(doctor_id, recorded_at desc);
create index if not exists idx_vital_signs_prescription on vital_signs(prescription_id);

alter table vital_signs enable row level security;

-- Doctors who have the patient can insert/read
create policy "Doctors manage vital signs"
  on vital_signs for all
  using (
    exists (select 1 from doctor_profiles where id = doctor_id and user_id = auth.uid())
  )
  with check (
    exists (select 1 from doctor_profiles where id = doctor_id and user_id = auth.uid())
  );

-- Patients can read their own vitals
create policy "Patients read own vital signs"
  on vital_signs for select
  using (auth.uid() in (select id from patient_profiles where id = patient_id));



-- ===== 20260619000001_add_doctor_name.sql =====
-- Add doctor_name column to doctor_profiles for the doctor's personal name
-- (workspace_name is the clinic/hospital name, doctor_name is the individual doctor's name)

alter table doctor_profiles add column if not exists doctor_name text;

-- Backfill: for existing rows, use workspace_name as doctor_name if doctor_name is null
update doctor_profiles set doctor_name = workspace_name where doctor_name is null;

-- Make it not null after backfill
alter table doctor_profiles alter column doctor_name set not null;



-- ===== 20260620000001_zobraipharm_store_orders.sql =====
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



-- ===== 20260621000001_remove_telegram.sql =====
-- Migration: Remove Telegram Integration
-- Drops the unused telegram_links table from the schema.

drop table if exists telegram_links cascade;



-- ===== 20260621000005_pharmacy_rls_fixes.sql =====
-- ============================================================
-- Fix store_orders: pharmacy vendors can read assigned orders
-- ============================================================
alter table store_orders add column if not exists pharmacy_id uuid references pharmacy_profiles(id);
drop policy if exists "Pharmacy can read assigned store orders" on store_orders;
create policy "Pharmacy can read assigned store orders"
  on store_orders for select
  using (pharmacy_id in (
    select id from pharmacy_profiles where user_id = auth.uid()
  ));

-- Pharmacy vendors can update status of assigned orders
drop policy if exists "Pharmacy can update assigned store orders" on store_orders;
create policy "Pharmacy can update assigned store orders"
  on store_orders for update
  using (pharmacy_id in (
    select id from pharmacy_profiles where user_id = auth.uid()
  ))
  with check (pharmacy_id in (
    select id from pharmacy_profiles where user_id = auth.uid()
  ));

-- ============================================================
-- Fix orders (v2 prescription orders): pharmacy access
-- ============================================================
drop policy if exists "Pharmacy can read assigned orders" on orders;
create policy "Pharmacy can read assigned orders"
  on orders for select
  using (pharmacy_id in (
    select id from pharmacy_profiles where user_id = auth.uid()
  ));

drop policy if exists "Pharmacy can update assigned orders" on orders;
create policy "Pharmacy can update assigned orders"
  on orders for update
  using (pharmacy_id in (
    select id from pharmacy_profiles where user_id = auth.uid()
  ));

-- ============================================================
-- Patient can read prescription orders (orders table)
-- ============================================================
drop policy if exists "Patient can read own prescription orders" on orders;
create policy "Patient can read own prescription orders"
  on orders for select
  using (patient_id = auth.uid());

-- ============================================================
-- Doctor can read orders they initiated
-- ============================================================
drop policy if exists "Doctor can read own initiated orders" on orders;
create policy "Doctor can read orders for their prescriptions"
  on orders for select
  using (prescription_id in (
    select id from prescriptions where doctor_id in (
      select id from doctor_profiles where user_id = auth.uid()
    )
  ));

-- ============================================================
-- pharmacy_profiles: public read for active profiles
-- ============================================================
drop policy if exists "Anyone can view active pharmacies" on pharmacy_profiles;
create policy "Anyone can view active pharmacies"
  on pharmacy_profiles for select
  using (is_active = true);

-- ============================================================
-- Vendor can update own pharmacy_profile
-- ============================================================
drop policy if exists "Vendor can update own profile" on pharmacy_profiles;
create policy "Vendor can update own profile"
  on pharmacy_profiles for update
  using (user_id = auth.uid());



-- ===== 20260621000006_product_reviews.sql =====
create table if not exists product_reviews (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid references store_orders(id) on delete set null,
  prescription_order_id uuid references orders(id) on delete set null,
  product_id      text,
  medication_id   uuid references medications(id) on delete set null,
  pharmacy_id     uuid not null references pharmacy_profiles(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  rating          integer not null check (rating >= 1 and rating <= 5),
  title           text default '',
  review          text default '',
  is_verified_purchase boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_reviews_pharmacy on product_reviews(pharmacy_id, created_at desc);
create index idx_reviews_product on product_reviews(product_id, created_at desc);
create index idx_reviews_medication on product_reviews(medication_id, created_at desc);
create index idx_reviews_user on product_reviews(user_id, created_at desc);

alter table product_reviews enable row level security;

create policy "Anyone can read reviews"
  on product_reviews for select
  using (true);

create policy "Users can create own reviews"
  on product_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reviews"
  on product_reviews for update
  using (auth.uid() = user_id);

create policy "Users can delete own reviews"
  on product_reviews for delete
  using (auth.uid() = user_id);



-- ===== 20260621000007_review_rating_trigger.sql =====
create or replace function update_pharmacy_rating()
returns trigger as $$
begin
  update pharmacy_profiles
  set rating = (
    select coalesce(avg(rating)::numeric(3,2), 0)
    from product_reviews
    where pharmacy_id = coalesce(NEW.pharmacy_id, OLD.pharmacy_id)
  )
  where id = coalesce(NEW.pharmacy_id, OLD.pharmacy_id);
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_update_pharmacy_rating
  after insert or update or delete on product_reviews
  for each row execute function update_pharmacy_rating();



-- ===== 20260621000008_pairing_code_unique.sql =====
-- Add unique constraint on pairing_codes(code) where claimed_at IS NULL
-- This prevents TOCTOU race conditions during code generation
create unique index if not exists idx_pairing_codes_unclaimed_code
  on pairing_codes(code)
  where claimed_at is null;



-- ===== 20260621000009_sent_via_tracking.sql =====
-- Add retry_count to notification_delivery for tracking failed attempts
alter table notification_delivery add column if not exists retry_count integer not null default 0;

-- RPC to append transports to sent_via array (handles dedup)
create or replace function append_notification_sent_via(
  p_notification_id uuid,
  p_transports text[]
)
returns void
language plpgsql
security definer
as $$
begin
  update notifications
  set sent_via = (
    select array_agg(distinct t)
    from (
      select unnest(coalesce(sent_via, '{}'::text[]) || p_transports)
    ) as t
  )
  where id = p_notification_id;
end;
$$;



-- ===== 20260621000010_pairing_realtime_fix.sql =====
-- Fix: user_pairings was dropped from supabase_realtime publication
-- when 20260614_professional_schema.sql recreated it with CASCADE.
-- Re-add it so the web dashboard gets live updates when pairing succeeds.
alter publication supabase_realtime add table public.user_pairings;

-- Add device_name column so the actual phone name is stored and displayed
alter table user_pairings add column if not exists device_name text default 'Mobile Device';



-- ===== 20260621000011_realtime_tables_fix.sql =====
-- Fix: notifications and medication_logs were dropped from supabase_realtime
-- publication by the CASCADE in 20260614_professional_schema.sql.
-- This broke Realtime subscriptions (postgres_changes) for both mobile and web.
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.medication_logs;



-- ===== 20260621000012_store_products.sql =====
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



-- ===== 20260621000013_pharmacy_product_images.sql =====
-- Create Supabase storage bucket for pharmacy product images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pharmacy_products',
  'pharmacy_products',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- RLS: anyone can read (public bucket)
drop policy if exists "Anyone can view pharmacy product images" on storage.objects;
create policy "Anyone can view pharmacy product images"
  on storage.objects for select
  using (bucket_id = 'pharmacy_products');

-- RLS: authenticated users can upload to their own folder
drop policy if exists "Authenticated users can upload pharmacy images" on storage.objects;
create policy "Authenticated users can upload pharmacy images"
  on storage.objects for insert
  with check (
    bucket_id = 'pharmacy_products'
    and auth.role() = 'authenticated'
  );

-- RLS: owners can update/delete their own uploads
drop policy if exists "Users can update own pharmacy images" on storage.objects;
create policy "Users can update own pharmacy images"
  on storage.objects for update
  using (bucket_id = 'pharmacy_products' and owner = auth.uid())
  with check (bucket_id = 'pharmacy_products' and owner = auth.uid());

drop policy if exists "Users can delete own pharmacy images" on storage.objects;
create policy "Users can delete own pharmacy images"
  on storage.objects for delete
  using (bucket_id = 'pharmacy_products' and owner = auth.uid());



-- ===== 20260621000014_seed_store_products.sql =====
-- Seed initial store products using existing static image paths.
-- These display on /zobraipharm via fetchStoreProducts() which reads store_products.
-- Vendors can later replace images via the product form (uploads to pharmacy_products bucket).
insert into store_products (name, generic_name, manufacturer, category, description, composition, dosage, usage, side_effects, safety, storage, price, mrp, image_url, is_pinned, in_stock) values
(
  'Dolo 650mg', 'Paracetamol', 'Micro Labs', 'Analgesic',
  'Dolo 650mg is a trusted analgesic and antipyretic used for relief of fever, headache, body aches, and mild to moderate pain.',
  'Each tablet contains Paracetamol IP 650mg',
  '1 tablet every 6 hours as needed. Max 4 tablets in 24 hours.',
  'Fever, Headache, Toothache, Menstrual cramps, Muscular aches, Cold & flu symptoms',
  'Nausea, rash, liver damage with overdose (>4000mg/day)',
  '["Do not exceed 4 tablets in 24 hours","Avoid alcohol while taking this medication","Consult doctor if symptoms persist beyond 3 days","Not recommended in severe hepatic impairment"]',
  'Store below 30°C, protect from light and moisture',
  32, 35, '/images/pharmacy/dolo-650mg.png', true, true
),
(
  'Metformin 500mg', 'Metformin Hydrochloride', 'USV', 'Antidiabetic',
  'Metformin 500mg is a first-line medication for type 2 diabetes that helps control blood sugar levels by improving insulin sensitivity.',
  'Each tablet contains Metformin Hydrochloride IP 500mg',
  '1 tablet twice daily with meals.',
  'Type 2 diabetes management, Blood sugar control, Insulin resistance',
  'Nausea, diarrhea, metallic taste, vitamin B12 deficiency with long-term use',
  '["Take with food to reduce stomach upset","Monitor blood sugar regularly","Avoid alcohol","Consult doctor if vomiting or dehydration occurs"]',
  'Store below 25°C, protect from moisture',
  18, 22, '/images/pharmacy/metformin-500mg.png', true, true
),
(
  'Atorvastatin 10mg', 'Atorvastatin Calcium', 'Zydus Cadila', 'Statin',
  'Atorvastatin 10mg is a cholesterol-lowering medication that reduces LDL cholesterol and triglycerides while increasing HDL cholesterol.',
  'Each tablet contains Atorvastatin Calcium IP 10mg',
  '1 tablet once daily, preferably at the same time each day.',
  'High cholesterol management, Cardiovascular disease prevention, LDL reduction',
  'Muscle pain, joint pain, headache, increased liver enzymes (rare)',
  '["Report unexplained muscle pain or weakness","Avoid grapefruit juice","Regular liver function monitoring required","Do not stop without consulting your doctor"]',
  'Store below 30°C, protect from light',
  45, 52, '/images/pharmacy/atorvastatin-10mg.png', true, true
),
(
  'Amlodipine 5mg', 'Amlodipine Besylate', 'Pfizer', 'Calcium Channel Blocker',
  'Amlodipine 5mg is a calcium channel blocker used for treating high blood pressure and coronary artery disease.',
  'Each tablet contains Amlodipine Besylate IP 5mg',
  '1 tablet once daily.',
  'Hypertension, Coronary artery disease, Angina prevention',
  'Swelling in ankles/feet, dizziness, flushing, palpitations',
  '["Avoid grapefruit juice","May cause dizziness — avoid driving initially","Do not stop suddenly","Monitor blood pressure regularly"]',
  'Store below 25°C, protect from light',
  28, 35, '/images/pharmacy/amlodipine-5mg.png', true, true
),
(
  'Omeprazole 20mg', 'Omeprazole', 'Dr. Reddys', 'Proton Pump Inhibitor',
  'Omeprazole 20mg reduces stomach acid production and is used for treating GERD, gastric ulcers, and acid reflux.',
  'Each capsule contains Omeprazole IP 20mg',
  '1 capsule once daily before a meal, preferably in the morning.',
  'GERD, Gastric ulcers, Acid reflux, Zollinger-Ellison syndrome, Heartburn',
  'Headache, nausea, abdominal pain, vitamin B12 deficiency with long-term use',
  '["Take before meals for best effect","Do not crush or chew the capsule","Long-term use may increase fracture risk","Consult doctor if symptoms persist after 2 weeks"]',
  'Store below 25°C, protect from moisture',
  24, 30, '/images/pharmacy/omeprazole-20mg.png', true, true
),
(
  'Vitamin D3 60K', 'Cholecalciferol', 'Abbott', 'Supplement',
  'Vitamin D3 60K is a high-potency vitamin D supplement for treating vitamin D deficiency and maintaining bone health.',
  'Each capsule contains Cholecalciferol IP 60000 IU',
  '1 capsule once weekly for 8 weeks, then once monthly as maintenance.',
  'Vitamin D deficiency, Osteoporosis, Bone health, Immune support',
  'Rare at recommended dosage. Overdose may cause hypercalcemia — nausea, weakness, kidney stones.',
  '["Do not exceed recommended dosage","Take with a meal containing fat for better absorption","Monitor calcium levels if on long-term therapy","Keep out of reach of children"]',
  'Store below 25°C, protect from light and moisture',
  80, 95, '/images/pharmacy/vitamin-d3-60k.png', true, true
),
(
  'Cetirizine 10mg', 'Cetirizine Hydrochloride', 'Cipla', 'Antihistamine',
  'Cetirizine 10mg is an antihistamine used for relief of allergic symptoms including hay fever, hives, and runny nose.',
  'Each tablet contains Cetirizine Hydrochloride IP 10mg',
  '1 tablet once daily in the evening.',
  'Allergic rhinitis, Hay fever, Hives, Allergic skin reactions, Itching',
  'Drowsiness, dry mouth, fatigue, headache',
  '["May cause drowsiness — avoid driving","Avoid alcohol","Do not exceed 1 tablet in 24 hours","Not recommended for children under 6 years"]',
  'Store below 25°C, protect from moisture',
  15, 18, '/images/pharmacy/cetirizine-10mg.png', true, true
),
(
  'Ibuprofen 400mg', 'Ibuprofen', 'GSK', 'NSAID',
  'Ibuprofen 400mg is a non-steroidal anti-inflammatory drug used for pain relief, fever reduction, and anti-inflammatory effects.',
  'Each tablet contains Ibuprofen IP 400mg',
  '1 tablet every 6-8 hours as needed. Max 3 tablets in 24 hours.',
  'Muscle pain, Joint pain, Dental pain, Menstrual cramps, Fever, Inflammation',
  'Stomach upset, heartburn, nausea, dizziness. Long-term use may cause gastric ulcers or kidney issues.',
  '["Take with food or milk","Avoid on an empty stomach","Do not exceed 1200mg in 24 hours","Avoid alcohol","Consult doctor before long-term use"]',
  'Store below 30°C, protect from light',
  22, 28, '/images/pharmacy/ibuprofen-400mg.png', true, true
),
(
  'Losartan 50mg', 'Losartan Potassium', 'Merck', 'ARB',
  'Losartan 50mg is an angiotensin receptor blocker used for treating hypertension and protecting kidney function in diabetic patients.',
  'Each tablet contains Losartan Potassium IP 50mg',
  '1 tablet once daily.',
  'Hypertension, Diabetic nephropathy, Stroke prevention, Heart failure',
  'Dizziness, fatigue, low blood pressure, hyperkalemia',
  '["Monitor blood pressure regularly","Avoid potassium supplements unless prescribed","May cause dizziness — avoid driving initially","Stay hydrated"]',
  'Store below 25°C, protect from moisture',
  35, 42, '/images/pharmacy/losartan-50mg.png', true, true
),
(
  'Lisinopril 5mg', 'Lisinopril', 'AstraZeneca', 'ACE Inhibitor',
  'Lisinopril 5mg is an ACE inhibitor used for treating hypertension, heart failure, and improving survival after heart attack.',
  'Each tablet contains Lisinopril IP 5mg',
  '1 tablet once daily.',
  'Hypertension, Heart failure, Post-myocardial infarction, Diabetic nephropathy',
  'Dry cough, dizziness, headache, hyperkalemia, angioedema (rare)',
  '["Monitor blood pressure and potassium levels","May cause persistent dry cough","Avoid pregnancy","Report swelling of face or lips immediately"]',
  'Store below 25°C, protect from moisture',
  30, 38, '/images/pharmacy/lisinopril-5mg.png', true, true
),
(
  'Azithromycin 500mg', 'Azithromycin', 'Sun Pharma', 'Antibiotic',
  'Azithromycin 500mg is a macrolide antibiotic used for treating respiratory, skin, and certain bacterial infections.',
  'Each tablet contains Azithromycin IP 500mg',
  '1 tablet once daily for 3 days, or as prescribed by physician.',
  'Respiratory tract infections, Skin infections, Ear infections, Sexually transmitted infections',
  'Nausea, abdominal pain, diarrhea, headache, taste disturbance',
  '["Complete the full course of treatment","Take on an empty stomach 1 hour before or 2 hours after food","Avoid alcohol","Do not share antibiotics"]',
  'Store below 25°C, protect from moisture',
  55, 65, '/images/pharmacy/azithromycin-500mg.png', true, true
),
(
  'Amoxicillin 500mg', 'Amoxicillin', 'Alkem', 'Antibiotic',
  'Amoxicillin 500mg is a penicillin-type antibiotic used for treating bacterial infections including respiratory, urinary, and skin infections.',
  'Each capsule contains Amoxicillin IP 500mg',
  '1 capsule three times daily for 7-14 days, or as prescribed.',
  'Respiratory infections, Urinary tract infections, Skin infections, Dental infections, Throat infections',
  'Nausea, vomiting, diarrhea, rash, allergic reactions in penicillin-sensitive individuals',
  '["Complete the full course","Report any skin rash or breathing difficulty immediately","May reduce oral contraceptive effectiveness","Avoid if allergic to penicillin"]',
  'Store below 25°C, protect from moisture',
  42, 50, '/images/pharmacy/amoxicillin-500mg.png', true, true
) on conflict do nothing;



-- ===== 20260621000015_pharmacy_orders_system.sql =====
-- ============================================================
-- 20260621000015 — Pharmacy Orders System
--
-- Creates unified prescription→pharmacy order flow:
--   orders (prescription fulfillment)
--   order_events (status timeline)
-- Connects doctor prescriptions → pharmacy orders
-- Connects patient refill_orders → pharmacy visibility
-- Assigns store_orders to pharmacies via service area
-- ============================================================

-- ─── 1. Orders table (prescription fulfillment) ─────────────
create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  prescription_id   uuid references prescriptions(id) on delete set null,
  pharmacy_id       uuid references pharmacy_profiles(id) on delete set null,
  patient_id        uuid references patient_profiles(id) on delete set null,
  doctor_id         uuid references doctor_profiles(id) on delete set null,
  tracking_id       text not null unique default 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || floor(random() * 9000 + 1000)::text,
  status            text not null default 'PENDING' check (status in ('PENDING','CONFIRMED','PREPARING','DISPATCHED','DELIVERED','CANCELLED')),
  total_amount      numeric(10,2) not null default 0,
  delivery_address  text,
  delivery_city     text,
  delivery_pincode  text,
  patient_phone     text,
  patient_email     text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── 2. Order events table ──────────────────────────────────
create table if not exists order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  status      text not null,
  note        text,
  timestamp   timestamptz not null default now()
);

-- ─── 3. Indexes ─────────────────────────────────────────────
create index if not exists idx_orders_pharmacy_id on orders(pharmacy_id);
create index if not exists idx_orders_patient_id on orders(patient_id);
create index if not exists idx_orders_prescription_id on orders(prescription_id);
create index if not exists idx_orders_tracking_id on orders(tracking_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_order_events_order_id on order_events(order_id);

-- ─── 4. Enable RLS ─────────────────────────────────────────
alter table orders enable row level security;
alter table order_events enable row level security;

-- ─── 5. RLS: Pharmacies can read/update assigned orders ─────
drop policy if exists "Pharmacies can read assigned orders" on orders;
create policy "Pharmacies can read assigned orders" on orders
  for select using (
    pharmacy_id in (
      select id from pharmacy_profiles where user_id = auth.uid()
    )
  );

drop policy if exists "Pharmacies can update assigned orders" on orders;
create policy "Pharmacies can update assigned orders" on orders
  for update using (
    pharmacy_id in (
      select id from pharmacy_profiles where user_id = auth.uid()
    )
  );

drop policy if exists "Patients can read own orders" on orders;
create policy "Patients can read own orders" on orders
  for select using (
    patient_id = (select id from patient_profiles where created_by = auth.uid() limit 1)
    or
    patient_id in (select id from patient_profiles where id = auth.uid())
  );

drop policy if exists "Pharmacies can read order events" on order_events;
create policy "Pharmacies can read order events" on order_events
  for select using (
    order_id in (select id from orders where pharmacy_id in (
      select id from pharmacy_profiles where user_id = auth.uid()
    ))
  );

drop policy if exists "Pharmacies can insert order events" on order_events;
create policy "Pharmacies can insert order events" on order_events
  for insert with check (
    order_id in (select id from orders where pharmacy_id in (
      select id from pharmacy_profiles where user_id = auth.uid()
    ))
  );

-- ─── 6. Auto-create order when prescription finalized ───────
-- Trigger: when a prescription is finalized (status = 'active'),
-- auto-create an order for the nearest pharmacy
create or replace function auto_create_order_from_prescription()
returns trigger as $$
begin
  if new.status = 'active' then
    -- Find a pharmacy to assign (pick first available)
    insert into orders (
      prescription_id,
      patient_id,
      doctor_id,
      status,
      total_amount,
      delivery_address,
      created_at,
      updated_at
    )
    select
      new.id,
      new.patient_id,
      new.doctor_id,
      'PENDING',
      0,
      'To be confirmed',
      now(),
      now()
    on conflict do nothing;

    -- Auto-create the first order event
    insert into order_events (order_id, status, note)
    select id, 'PENDING', 'Prescription finalized by doctor'
    from orders
    where prescription_id = new.id
    limit 1;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_prescription_to_order on prescriptions;
create trigger trg_prescription_to_order
  after update of status on prescriptions
  for each row
  when (new.status = 'active')
  execute function auto_create_order_from_prescription();

-- ─── 7. Auto-create order when refill order is placed ───────
-- Trigger: auto-link refill_orders to pharmacy via pharmacy_profiles
create or replace function auto_assign_refill_to_pharmacy()
returns trigger as $$
begin
  -- If the refill_order has a vendor_id, try to match to pharmacy_profiles
  if new.vendor_id is not null then
    -- This links the refill to the pharmacy via the notification mechanism
    -- The actual order creation happens in the refill_orders table
    null;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- ─── 8. Store orders: assign to pharmacies via geo-proximity
-- This can be expanded later for automatic assignment
create or replace function assign_store_order_to_pharmacy()
returns trigger as $$
declare
  v_pharmacy_id uuid;
begin
  -- Simple round-robin: pick the pharmacy with fewest pending orders
  select pp.id into v_pharmacy_id
  from pharmacy_profiles pp
  left join store_orders so on so.pharmacy_id = pp.id and so.status in ('PENDING', 'CONFIRMED')
  where pp.is_active = true
  group by pp.id
  order by count(so.id) asc nulls first
  limit 1;

  if v_pharmacy_id is not null then
    new.pharmacy_id := v_pharmacy_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_assign_store_order on store_orders;
create trigger trg_assign_store_order
  before insert on store_orders
  for each row
  when (new.pharmacy_id is null)
  execute function assign_store_order_to_pharmacy();

-- ─── 9. Sync refill_orders to be visible (add to realtime) ──
-- Ensure refill_orders is in the realtime publication
alter publication supabase_realtime add table if not exists orders;
alter publication supabase_realtime add table if not exists order_events;



-- ===== 20260622000001_fix_assign_store_order_trigger.sql =====
-- Fix assign_store_order_to_pharmacy() missing GROUP BY clause
-- The original function in 20260621000015 omitted GROUP BY pp.id,
-- causing error 42803: 'column "pp.id" must appear in the GROUP BY clause'

create or replace function assign_store_order_to_pharmacy()
returns trigger as $$
declare
  v_pharmacy_id uuid;
begin
  select pp.id into v_pharmacy_id
  from pharmacy_profiles pp
  left join store_orders so on so.pharmacy_id = pp.id and so.status in ('PENDING', 'CONFIRMED')
  where pp.is_active = true
  group by pp.id
  order by count(so.id) asc nulls first
  limit 1;

  if v_pharmacy_id is not null then
    new.pharmacy_id := v_pharmacy_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;



-- ===== 20260622000002_store_cart.sql =====


-- ===== 20260623000001_doctor_profile_storage.sql =====


-- ===== 20260623000002_fix_patient_profiles_and_rls.sql =====
-- ============================================================
-- Fix migration: patient_profiles DEFAULT, RLS, indexes
-- Fix all `doctor_id = auth.uid()` → proper doctor_profiles lookup
-- ============================================================

-- 1. Fix patient_profiles.id DEFAULT
alter table patient_profiles
  alter column id set default gen_random_uuid();

-- 2. Add email index for patient search
create index if not exists idx_patient_profiles_email
  on patient_profiles using btree (email);

-- 3. Fix "Anyone can read" → only doctors who created the patient
drop policy if exists "Anyone can read patient_profiles" on patient_profiles;
drop policy if exists "Doctors read own patients" on patient_profiles;
create policy "Doctors read own patients"
  on patient_profiles for select
  using (
    created_by in (select id from doctor_profiles where user_id = auth.uid())
    or id = auth.uid()
    or auth.uid() in (select id from doctor_profiles)
  );

-- 4. Fix prescription_documents select: doctor_id → doctor_profiles lookup
drop policy if exists "Doctor and patient can read rx docs" on prescription_documents;
create policy "Doctor and patient can read rx docs"
  on prescription_documents for select
  using (exists (
    select 1 from prescriptions
    where id = prescription_id
    and (
      exists (select 1 from doctor_profiles where id = doctor_id and user_id = auth.uid())
      or patient_id = auth.uid()
      or patient_id in (select id from patient_profiles where id = prescriptions.patient_id)
    )
  ));

-- 5. Fix prescription_documents insert: doctor_id → doctor_profiles lookup
drop policy if exists "Doctors insert rx docs" on prescription_documents;
create policy "Doctors insert rx docs"
  on prescription_documents for insert
  with check (exists (
    select 1 from prescriptions
    where id = prescription_id
    and exists (select 1 from doctor_profiles where id = doctor_id and user_id = auth.uid())
  ));

-- 6. Fix patient_medical_history doctors read: doctor_id → doctor_profiles lookup
drop policy if exists "Doctors read patient medical history" on patient_medical_history;
create policy "Doctors read patient medical history"
  on patient_medical_history for select
  using (exists (
    select 1 from prescriptions
    where patient_id = patient_medical_history.patient_id
    and exists (select 1 from doctor_profiles where id = doctor_id and user_id = auth.uid())
  ));

-- 7. Fix storage objects RLS: doctor_id → doctor_profiles lookup
drop policy if exists "Doctor and patient read prescription PDFs" on storage.objects;
create policy "Doctor and patient read prescription PDFs"
  on storage.objects for select
  using (
    bucket_id = 'prescription_pdfs'
    and exists (
      select 1 from prescription_documents pd
      join prescriptions px on px.id = pd.prescription_id
      where pd.storage_path = name
      and (
        exists (select 1 from doctor_profiles where id = px.doctor_id and user_id = auth.uid())
        or px.patient_id = auth.uid()
        or px.patient_id in (select id from patient_profiles where id = px.patient_id)
      )
    )
  );

-- 8. Fix conversations RLS: doctor_id → auth.users(id) is correct here
-- (conversations.doctor_id references auth.users(id), not doctor_profiles(id))
-- But patient_id now references patient_profiles, update accordingly
drop policy if exists "Participants manage conversations" on conversations;
create policy "Participants manage conversations"
  on conversations for all
  using (
    auth.uid() = doctor_id
    or auth.uid() in (select id from patient_profiles where id = patient_id)
  )
  with check (
    auth.uid() = doctor_id
    or auth.uid() in (select id from patient_profiles where id = patient_id)
  );

-- 9. Add index on conversations(doctor_id, patient_id) for faster lookups
create index if not exists idx_conversations_pair
  on conversations using btree (doctor_id, patient_id);

-- 10. Add updated_at trigger to pharmacy_inventory (PG17-safe pattern)
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'update_pharmacy_inventory_modtime'
    and tgrelid = 'pharmacy_inventory'::regclass
  ) then
    create trigger update_pharmacy_inventory_modtime
      before update on pharmacy_inventory
      for each row execute function update_modified_column();
  end if;
end $$;



-- ===== 20260623000003_patient_profiles.sql =====
-- Patient Profiles: allows doctors to create patients manually
-- without requiring the patient to have an auth.users account yet.
-- Real auth users also get a patient_profiles row (id = auth.users.id).

-- 1. Create patient_profiles table
create table if not exists patient_profiles (
  id          uuid primary key,
  full_name   text not null,
  email       text,
  phone       text,
  created_by  uuid references doctor_profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- 2. Seed patient_profiles with existing auth.users who have role='patient'
insert into patient_profiles (id, full_name, email, created_at)
select
  ur.user_id,
  coalesce(au.raw_user_meta_data->>'full_name', au.email, 'Patient ' || substring(ur.user_id::text, 1, 6)) as full_name,
  au.email,
  coalesce(au.created_at, now())
from user_roles ur
left join auth.users au on au.id = ur.user_id
where ur.role = 'patient'
  and not exists (select 1 from patient_profiles pp where pp.id = ur.user_id)
on conflict (id) do nothing;

-- 3. Update existing FK constraints: drop auth.users FK, add patient_profiles FK
-- First verify the constraint names exist before dropping
do $$
begin
  if exists (select 1 from information_schema.table_constraints where constraint_name = 'prescriptions_patient_id_fkey' and table_name = 'prescriptions') then
    alter table prescriptions drop constraint prescriptions_patient_id_fkey;
  end if;
  if exists (select 1 from information_schema.table_constraints where constraint_name = 'appointments_patient_id_fkey' and table_name = 'appointments') then
    alter table appointments drop constraint appointments_patient_id_fkey;
  end if;
  if exists (select 1 from information_schema.table_constraints where constraint_name = 'conversations_patient_id_fkey' and table_name = 'conversations') then
    alter table conversations drop constraint conversations_patient_id_fkey;
  end if;
  if exists (select 1 from information_schema.table_constraints where constraint_name = 'patient_medical_history_patient_id_fkey' and table_name = 'patient_medical_history') then
    alter table patient_medical_history drop constraint patient_medical_history_patient_id_fkey;
  end if;
end $$;

alter table only prescriptions
  add constraint prescriptions_patient_id_fkey
  foreign key (patient_id) references patient_profiles(id) on delete cascade;

alter table only appointments
  add constraint appointments_patient_id_fkey
  foreign key (patient_id) references patient_profiles(id) on delete cascade;

alter table only conversations
  add constraint conversations_patient_id_fkey
  foreign key (patient_id) references patient_profiles(id) on delete cascade;

alter table only patient_medical_history
  add constraint patient_medical_history_patient_id_fkey
  foreign key (patient_id) references patient_profiles(id) on delete cascade;

-- 4. Indexes
create index if not exists idx_patient_profiles_name on patient_profiles using btree (full_name);
create index if not exists idx_patient_profiles_creator on patient_profiles using btree (created_by);

-- 5. RLS
alter table patient_profiles enable row level security;

drop policy if exists "Doctors manage patient profiles" on patient_profiles;
create policy "Doctors manage patient profiles"
  on patient_profiles for all
  using (created_by in (select id from doctor_profiles where user_id = auth.uid()))
  with check (created_by in (select id from doctor_profiles where user_id = auth.uid()));

drop policy if exists "Patients read own profile" on patient_profiles;
create policy "Patients read own profile"
  on patient_profiles for select
  using (auth.uid() = id);

drop policy if exists "Anyone can read patient_profiles" on patient_profiles;
create policy "Anyone can read patient_profiles"
  on patient_profiles for select
  to authenticated
  using (true);

-- 6. Update RLS policies on dependent tables to reference patient_profiles

drop policy if exists "Patients read own prescriptions" on prescriptions;
create policy "Patients read own prescriptions"
  on prescriptions for select
  using (auth.uid() in (select id from patient_profiles where id = patient_id));

drop policy if exists "Patients read own appointments" on appointments;
create policy "Patients read own appointments"
  on appointments for select
  using (auth.uid() in (select id from patient_profiles where id = patient_id));

drop policy if exists "Patients insert own appointments" on appointments;
create policy "Patients insert own appointments"
  on appointments for insert
  with check (auth.uid() in (select id from patient_profiles where id = patient_id));

drop policy if exists "Patients update own appointments" on appointments;
create policy "Patients update own appointments"
  on appointments for update
  using (auth.uid() in (select id from patient_profiles where id = patient_id))
  with check (auth.uid() in (select id from patient_profiles where id = patient_id));

drop policy if exists "Participants manage conversations" on conversations;
create policy "Participants manage conversations"
  on conversations for all
  using (auth.uid() in (doctor_id, (select id from patient_profiles where id = patient_id)))
  with check (auth.uid() in (doctor_id, (select id from patient_profiles where id = patient_id)));

drop policy if exists "Patients manage own medical history" on patient_medical_history;
create policy "Patients manage own medical history"
  on patient_medical_history for all
  using (auth.uid() in (select id from patient_profiles where id = patient_id))
  with check (auth.uid() in (select id from patient_profiles where id = patient_id));

-- Messages RLS already works via conversation participants

-- Prescription docs RLS
drop policy if exists "Doctor and patient can read rx docs" on prescription_documents;
create policy "Doctor and patient can read rx docs"
  on prescription_documents for select
  using (exists (
    select 1 from prescriptions
    where id = prescription_id
    and (doctor_id = auth.uid() or patient_id in (select id from patient_profiles where id = patient_id))
  ));

-- Storage bucket RLS
drop policy if exists "Doctor and patient read prescription PDFs" on storage.objects;
create policy "Doctor and patient read prescription PDFs"
  on storage.objects for select
  using (
    bucket_id = 'prescription_pdfs'
    and exists (
      select 1 from prescription_documents pd
      join prescriptions px on px.id = pd.prescription_id
      where pd.storage_path = name
      and (px.doctor_id = auth.uid() or px.patient_id in (select id from patient_profiles where id = px.patient_id))
    )
  );



-- ===== 20260623000004_fix_refill_medication_fk.sql =====
alter table refill_orders alter column medication_id drop not null;
alter table refill_orders drop constraint if exists refill_orders_medication_id_fkey;
alter table refill_orders alter column vendor_id drop not null;
alter table refill_orders drop constraint if exists refill_orders_vendor_id_fkey;



-- ===== 20260623000005_add_delivery_and_refill_fields.sql =====
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



-- ===== 20260623000006_fix_patient_profiles_rls_for_settings.sql =====
-- Allow patients to manage (insert/update) their own patient_profiles row.
-- Previously only SELECT was granted to auth.uid() = id, so settings save (upsert) was silently rejected.

drop policy if exists "Patients manage own profile" on patient_profiles;
create policy "Patients manage own profile"
  on patient_profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Patients update own profile" on patient_profiles;
create policy "Patients update own profile"
  on patient_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);



-- ===== 20260623000007_add_patient_profile_fields.sql =====
alter table patient_profiles add column if not exists age text;
alter table patient_profiles add column if not exists height text;
alter table patient_profiles add column if not exists weight text;



-- ===== 20260623000008_link_medications_to_products.sql =====
-- Link medications to store products for auto-refill pricing and product info
alter table medications add column if not exists product_id uuid references store_products(id) on delete set null;
create index if not exists idx_medications_product on medications(product_id) where product_id is not null;

-- Also add product_id to refill_orders for traceability
alter table refill_orders add column if not exists product_id uuid;



-- ===== 20260623000009_vendor_refill_rls.sql =====
-- Allow pharmacy vendors to read refill orders (for order fulfillment)
drop policy if exists "Pharmacies read refill orders" on refill_orders;
create policy "Pharmacies read refill orders"
  on refill_orders for select
  using (exists (
    select 1 from pharmacy_profiles where user_id = auth.uid()
  ));

-- Allow pharmacy vendors to read refill order events
drop policy if exists "Pharmacies read refill order events" on refill_order_events;
create policy "Pharmacies read refill order events"
  on refill_order_events for select
  using (exists (
    select 1 from refill_orders ro
    where ro.id = refill_order_id
    and exists (select 1 from pharmacy_profiles where user_id = auth.uid())
  ));



-- ===== 20260623000010_vendor_store_order_items_rls.sql =====
-- Allow pharmacy vendors to read store_order_items for assigned orders
drop policy if exists "Pharmacy can read assigned store order items" on store_order_items;
create policy "Pharmacy can read assigned store order items"
  on store_order_items for select
  using (exists (
    select 1 from store_orders
    where store_orders.id = store_order_items.order_id
    and store_orders.pharmacy_id in (
      select id from pharmacy_profiles where user_id = auth.uid()
    )
  ));



-- ===== 20260623000011_realtime_messages.sql =====
-- Add messages and conversations to supabase_realtime publication
-- These were missing, breaking realtime chat

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;



-- ===== 20260624000001_add_followup_date.sql =====
-- Add followup_date column to prescriptions table
alter table if exists prescriptions
  add column if not exists followup_date date;



-- ===== 20260624000002_setup_cron_dispatch.sql =====
-- ZorabiHealth: Schedule notification dispatch via pg_cron
-- Calls the existing Vercel dispatch endpoint using net.http_post()
-- Requires: pg_net extension (Supabase Pro feature)
-- Replaces the Vercel cron job (removed from vercel.json).

-- 1. Enable extensions (idempotent)
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 2. Create a function that calls the Vercel dispatch endpoint
create or replace function public.dispatch_notifications()
returns void
language plpgsql
security definer
as $$
begin
  perform extensions.net.http_post(
    url := current_setting('app.vercel_url', true),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
end;
$$;

-- 3. Schedule it every 5 minutes
-- IMPORTANT: Before this works, run in SQL Editor:
--   alter database postgres set app.vercel_url = 'https://your-app.vercel.app/api/notifications/dispatch';
--   alter database postgres set app.cron_secret = 'your-cron-secret-value';
--   select pg_reload_conf();
select cron.schedule('dispatch-notifications', '*/5 * * * *', 'select public.dispatch_notifications();');

-- To remove:
--   select cron.unschedule('dispatch-notifications');
--   drop function if exists public.dispatch_notifications;



-- ===== 20260624000003_fix_cron_dispatch.sql =====
-- Fix notification dispatch cron: call Vercel endpoint via net.http_post()
-- Replaces the previous Edge Function approach that had deployment issues.

-- 1. Remove old cron schedule (if any from previous migration)
select cron.unschedule('dispatch-notifications');

-- 2. Create function that POSTs to the Vercel dispatch endpoint
create or replace function public.dispatch_notifications()
returns void
language plpgsql
security definer
as $$
begin
  perform extensions.net.http_post(
    url := current_setting('app.vercel_url', true),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
end;
$$;

-- 3. Schedule every 5 minutes
select cron.schedule('dispatch-notifications', '*/5 * * * *', 'select public.dispatch_notifications();');

-- Setup required before this works:
--   alter database postgres set app.vercel_url = 'https://your-app.vercel.app/api/notifications/dispatch';
--   alter database postgres set app.cron_secret = 'your-cron-secret';
--   select pg_reload_conf();



-- ===== 20260624000004_setup_edge_function_cron.sql =====
-- Schedule dispatch-notifications Edge Function via pg_cron
-- Replaces the net.http_post() approach (migration 000003).
-- The Edge Function URL is called directly by pg_cron.
-- Edge Functions are public by default, so no auth headers needed.

-- 1. Remove old cron schedules (from 000002 and 000003)
select cron.unschedule('dispatch-notifications');

-- 2. Schedule the Edge Function every 5 minutes
select cron.schedule(
  'dispatch-notifications',
  '*/5 * * * *',
  'https://vfpwwpzvkkegriuarsjt.supabase.co/functions/v1/dispatch-notifications'
);

-- 3. Drop the old PL/pgSQL helper (from 000003) since it's no longer needed
drop function if exists public.dispatch_notifications;

-- Verify:
-- select * from cron.job order by jobid desc limit 5;



-- ===== 20260624000005_medication_pairing_access.sql =====
-- Allow paired mobile users to read a patient's medications and reminder logs.
-- Doctors and pharmacy users are still excluded unless they are explicitly paired.

drop policy if exists "Paired mobile can read medications" on medications;
create policy "Paired mobile can read medications"
  on medications for select
  using (
    exists (
      select 1
      from user_pairings
      where is_active = true
        and web_user_id = medications.user_id
        and mobile_user_id = auth.uid()
    )
  );

drop policy if exists "Paired mobile can read medication logs" on medication_logs;
create policy "Paired mobile can read medication logs"
  on medication_logs for select
  using (
    exists (
      select 1
      from medications m
      where m.id = medication_logs.medication_id
        and (
          m.user_id = auth.uid()
          or exists (
            select 1
            from user_pairings
            where is_active = true
              and web_user_id = m.user_id
              and mobile_user_id = auth.uid()
          )
        )
    )
  );



