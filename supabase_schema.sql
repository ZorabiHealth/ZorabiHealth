-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Drop existing tables if they exist
drop table if exists voice_messages cascade;
drop table if exists refill_order_events cascade;
drop table if exists refill_orders cascade;
drop table if exists vendors cascade;
drop table if exists medication_logs cascade;
drop table if exists medications cascade;

-- 3. Medications Table
create table medications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default '00000000-0000-0000-0000-000000000000',
    name text not null,
    generic_name text,
    dosage text not null,
    frequency text not null check (frequency in ('daily', 'twice_daily', 'three_times_daily', 'weekly', 'as_needed')),
    scheduled_times text[] not null, -- Array of local times e.g. ['08:00', '20:00']
    start_date date not null,
    end_date date,
    refill_at integer not null default 7 check (refill_at >= 0),
    current_stock integer not null default 30 check (current_stock >= 0),
    prescribed_by text,
    phone_for_alerts text, -- E.164 target phone
    emergency_contact_name text,
    emergency_contact_phone text,
    alert_after_misses integer default 2 check (alert_after_misses > 0),
    vendor_preference text,
    is_active boolean not null default true,
    color text not null default 'blue',
    category text not null default 'Other',
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for user lookup and active status
create index idx_medications_user_active on medications(user_id, is_active);
create index idx_medications_phone on medications(phone_for_alerts) where is_active = true;

-- 4. Medication Logs Table
create table medication_logs (
    id uuid primary key default gen_random_uuid(),
    medication_id uuid not null references medications(id) on delete cascade,
    medication_name text not null,
    scheduled_at timestamp with time zone not null,
    taken_at timestamp with time zone,
    status text not null check (status in ('taken', 'missed', 'snoozed', 'pending')),
    dose text not null,
    note text,
    alert_sent boolean not null default false,
    snoozed_until timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for calendar schedules and status queries
create index idx_medication_logs_lookup on medication_logs(medication_id, scheduled_at, status);

-- 5. Pharmacy Vendors Table
create table vendors (
    id uuid primary key default gen_random_uuid(),
    business_name text not null,
    license_no text not null unique,
    email text not null,
    phone text,
    address text not null,
    pincode text not null,
    lat double precision not null,
    lng double precision not null,
    service_radius_km double precision not null default 7.0,
    operating_hours text not null,
    is_active boolean not null default true,
    is_verified boolean not null default false,
    rating double precision not null default 4.5,
    inventory jsonb not null default '{}'::jsonb, -- Store stock and price maps: {"Metformin 500mg": {"stock": 100, "pricePerUnit": 8}}
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_vendors_pincode on vendors(pincode);

-- 6. Refill Orders Table
create table refill_orders (
    id uuid primary key default gen_random_uuid(),
    tracking_id text not null unique, -- ZH-YYYYMMDD-XXXX
    user_id uuid not null default '00000000-0000-0000-0000-000000000000',
    medication_id uuid references medications(id) on delete set null,
    medication_name text not null,
    dosage text not null,
    quantity integer not null check (quantity > 0),
    vendor_id uuid not null references vendors(id) on delete restrict,
    vendor_name text not null,
    vendor_email text not null,
    vendor_phone text,
    patient_email text not null,
    patient_phone text,
    delivery_address text not null,
    status text not null check (status in ('PENDING', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED', 'CANCELLED')),
    total_price numeric(10, 2) not null,
    estimated_delivery date,
    idempotency_key text unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_refill_orders_user on refill_orders(user_id);
create index idx_refill_orders_tracking on refill_orders(tracking_id);

-- 7. Refill Order Events (Timeline History)
create table refill_order_events (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references refill_orders(id) on delete cascade,
    status text not null,
    timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
    note text
);

create index idx_order_events_order on refill_order_events(order_id, timestamp desc);

-- 8. Voice Sessions / Messages Table
create table voice_messages (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default '00000000-0000-0000-0000-000000000000',
    sender text not null check (sender in ('user', 'assistant')),
    text text not null,
    intent text,
    action_taken text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_voice_messages_user on voice_messages(user_id, created_at desc);

-- 9. Automatic updated_at trigger logic
create or replace function update_modified_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_medications_modtime
    before update on medications
    for each row execute function update_modified_column();

create trigger update_refill_orders_modtime
    before update on refill_orders
    for each row execute function update_modified_column();

