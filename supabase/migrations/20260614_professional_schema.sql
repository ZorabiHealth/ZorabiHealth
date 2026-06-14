-- ============================================================
-- ZorabiHealth — Professional Schema (2026-06-14)
-- Complete rewrite: proper FKs, RLS, no Firebase/FCM, no placeholders
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- 0. DROP EVERYTHING (in correct FK order)
-- ════════════════════════════════════════════════════════════
drop table if exists notification_delivery cascade;
drop table if exists notification_log cascade;
drop table if exists notifications cascade;
drop table if exists notification_preferences cascade;
drop table if exists notification_devices cascade;
drop table if exists pairing_codes cascade;
drop table if exists user_pairings cascade;
drop table if exists telegram_links cascade;
drop table if exists refill_order_events cascade;
drop table if exists refill_orders cascade;
drop table if exists vendors cascade;
drop table if exists medication_logs cascade;
drop table if exists medications cascade;
drop table if exists voice_messages cascade;
drop table if exists symptom_logs cascade;
drop table if exists wearable_alarms cascade;
drop table if exists sleep_sessions cascade;
drop table if exists daily_steps cascade;
drop table if exists nutrition_logs cascade;
drop table if exists workout_streaks cascade;
drop table if exists workout_schedule cascade;
drop table if exists workouts cascade;
drop table if exists user_settings cascade;
drop table if exists symptom_logs cascade;

-- ════════════════════════════════════════════════════════════
-- 1. CORE HEALTH — Medications
-- ════════════════════════════════════════════════════════════
create table medications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  generic_name  text,
  dosage        text not null,
  frequency     text not null check (frequency in ('daily','twice_daily','three_times_daily','weekly','as_needed')),
  scheduled_times text[] not null,
  start_date    date not null,
  end_date      date,
  refill_at     integer not null default 7 check (refill_at >= 0),
  current_stock integer not null default 30 check (current_stock >= 0),
  prescribed_by text,
  phone_for_alerts text,
  emergency_contact_name text,
  emergency_contact_phone text,
  alert_after_misses integer default 2 check (alert_after_misses > 0),
  vendor_preference text,
  is_active     boolean not null default true,
  color         text not null default 'blue',
  category      text not null default 'Other',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_meds_user_active on medications(user_id, is_active);
create index idx_meds_phone on medications(phone_for_alerts) where is_active = true;
create index idx_meds_category on medications(category);

-- ════════════════════════════════════════════════════════════
-- 2. CORE HEALTH — Medication Logs
-- ════════════════════════════════════════════════════════════
create table medication_logs (
  id             uuid primary key default gen_random_uuid(),
  medication_id  uuid not null references medications(id) on delete cascade,
  medication_name text not null,
  scheduled_at   timestamptz not null,
  taken_at       timestamptz,
  status         text not null check (status in ('taken','missed','snoozed','pending')),
  dose           text not null,
  note           text,
  alert_sent     boolean not null default false,
  snoozed_until  timestamptz,
  created_at     timestamptz not null default now()
);

create index idx_med_logs_lookup on medication_logs(medication_id, scheduled_at, status);
create index idx_med_logs_status on medication_logs(status, scheduled_at);

-- ════════════════════════════════════════════════════════════
-- 3. CORE HEALTH — Symptom Logs
-- ════════════════════════════════════════════════════════════
create table symptom_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  severity   text not null check (severity in ('Mild','Moderate','Severe')),
  notes      text not null default '',
  created_at timestamptz not null default now()
);

create index idx_symptom_logs_user on symptom_logs(user_id, created_at desc);

-- ════════════════════════════════════════════════════════════
-- 4. PHARMACY — Vendors
-- ════════════════════════════════════════════════════════════
create table vendors (
  id               uuid primary key default gen_random_uuid(),
  business_name    text not null,
  license_no       text not null unique,
  email            text not null,
  phone            text,
  address          text not null,
  pincode          text not null,
  lat              double precision not null,
  lng              double precision not null,
  service_radius_km double precision not null default 7.0,
  operating_hours  text not null,
  is_active        boolean not null default true,
  is_verified      boolean not null default false,
  rating           double precision not null default 4.5,
  inventory        jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index idx_vendors_pincode on vendors(pincode);
create index idx_vendors_verified on vendors(is_verified, is_active);

-- ════════════════════════════════════════════════════════════
-- 5. PHARMACY — Refill Orders
-- ════════════════════════════════════════════════════════════
create table refill_orders (
  id                uuid primary key default gen_random_uuid(),
  tracking_id       text not null unique,
  user_id           uuid not null references auth.users(id) on delete cascade,
  medication_id     uuid references medications(id) on delete set null,
  medication_name   text not null,
  dosage            text not null,
  quantity          integer not null check (quantity > 0),
  vendor_id         uuid not null references vendors(id) on delete restrict,
  vendor_name       text not null,
  vendor_email      text not null,
  vendor_phone      text,
  patient_email     text not null,
  patient_phone     text,
  delivery_address  text not null,
  status            text not null check (status in ('PENDING','CONFIRMED','PREPARING','DISPATCHED','DELIVERED','CANCELLED')),
  total_price       numeric(10,2) not null,
  estimated_delivery date,
  idempotency_key   text unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_refill_orders_user on refill_orders(user_id);
create index idx_refill_orders_tracking on refill_orders(tracking_id);
create index idx_refill_orders_status on refill_orders(user_id, status);

-- ════════════════════════════════════════════════════════════
-- 6. PHARMACY — Refill Order Events
-- ════════════════════════════════════════════════════════════
create table refill_order_events (
  id        uuid primary key default gen_random_uuid(),
  order_id  uuid not null references refill_orders(id) on delete cascade,
  status    text not null,
  timestamp timestamptz not null default now(),
  note      text
);

create index idx_order_events_order on refill_order_events(order_id, timestamp desc);

-- ════════════════════════════════════════════════════════════
-- 7. VOICE — Messages
-- ════════════════════════════════════════════════════════════
create table voice_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  sender      text not null check (sender in ('user','assistant')),
  text        text not null,
  audio_url   text,
  intent      text,
  action_taken text,
  created_at  timestamptz not null default now()
);

create index idx_voice_messages_user on voice_messages(user_id, created_at desc);
create index idx_voice_messages_intent on voice_messages(user_id, intent);

-- ════════════════════════════════════════════════════════════
-- 8. WORKOUTS — Library
-- ════════════════════════════════════════════════════════════
create table workouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  category      text not null default 'general',
  duration_min  integer not null,
  calories_burn integer default 0,
  difficulty    text default 'beginner',
  exercises     jsonb default '[]'::jsonb,
  notes         text,
  is_template   boolean not null default false,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index idx_workouts_user on workouts(user_id, created_at desc);

-- ════════════════════════════════════════════════════════════
-- 9. WORKOUTS — Schedule
-- ════════════════════════════════════════════════════════════
create table workout_schedule (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  workout_id  uuid references workouts(id) on delete set null,
  title       text not null,
  scheduled_date date not null,
  scheduled_time time,
  duration_min integer,
  completed   boolean not null default false,
  notes       text,
  created_at  timestamptz not null default now()
);

create index idx_workout_schedule_user on workout_schedule(user_id, scheduled_date);

-- ════════════════════════════════════════════════════════════
-- 10. WORKOUTS — Nutrition Logs
-- ════════════════════════════════════════════════════════════
create table nutrition_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  meal_type   text default 'snack',
  calories    integer default 0,
  protein_g   double precision default 0,
  carbs_g     double precision default 0,
  fat_g       double precision default 0,
  logged_at   timestamptz not null default now(),
  notes       text
);

create index idx_nutrition_logs_user on nutrition_logs(user_id, logged_at desc);

-- ════════════════════════════════════════════════════════════
-- 11. WORKOUTS — Streaks
-- ════════════════════════════════════════════════════════════
create table workout_streaks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade unique,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_workout_date date,
  streak_days    jsonb default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════
-- 12. WEARABLE — Sleep Sessions
-- ════════════════════════════════════════════════════════════
create table sleep_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  duration    double precision not null,
  efficiency  double precision default 0,
  deep_sleep  double precision default 0,
  light_sleep double precision default 0,
  rem_sleep   double precision default 0,
  awake_min   double precision default 0,
  source      text default 'manual',
  created_at  timestamptz not null default now()
);

create index idx_sleep_user_date on sleep_sessions(user_id, date desc);

-- ════════════════════════════════════════════════════════════
-- 13. WEARABLE — Daily Steps
-- ════════════════════════════════════════════════════════════
create table daily_steps (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  date     date not null,
  steps    integer not null default 0,
  distance_km double precision default 0,
  source   text default 'manual',
  unique(user_id, date)
);

create index idx_daily_steps_user on daily_steps(user_id, date desc);

-- ════════════════════════════════════════════════════════════
-- 14. WEARABLE — Alarms
-- ════════════════════════════════════════════════════════════
create table wearable_alarms (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  time       time not null,
  label      text default 'Medication',
  enabled    boolean not null default true,
  repeat     text[] default '{}',
  smart_wake boolean default false,
  sound      text default 'Chime Chord',
  created_at timestamptz not null default now()
);

create index idx_wearable_alarms_user on wearable_alarms(user_id, enabled);

-- ════════════════════════════════════════════════════════════
-- 15. NOTIFICATIONS — Devices (NO FCM, NO Firebase)
-- Transport: web_push (browser), expo_push (mobile via Expo API)
-- ════════════════════════════════════════════════════════════
create table notification_devices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  device_name     text not null default 'Unknown',
  platform        text not null default 'web' check (platform in ('web','android','ios')),
  transport       text not null default 'web_push' check (transport in ('web_push','expo_push')),
  push_endpoint   text,
  push_keys       jsonb default '{}'::jsonb,
  expo_push_token text,
  is_active       boolean not null default true,
  last_active_at  timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  constraint chk_device_has_token check (
    (transport = 'web_push' and push_endpoint is not null) or
    (transport = 'expo_push' and expo_push_token is not null)
  )
);

create index idx_notif_devices_user on notification_devices(user_id);
create index idx_notif_devices_active on notification_devices(is_active);

-- ════════════════════════════════════════════════════════════
-- 16. NOTIFICATIONS — Inbox
-- ════════════════════════════════════════════════════════════
create table notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  body          text not null default '',
  data          jsonb not null default '{}'::jsonb,
  category      text not null default 'system' check (category in ('medication','vital','appointment','system','refill','workout')),
  priority      text not null default 'normal' check (priority in ('low','normal','high','critical')),
  scheduled_for timestamptz,
  expires_at    timestamptz,
  sent_via      text[] default '{}',
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id, created_at desc);
create index idx_notifications_unsent on notifications(scheduled_for) where scheduled_for is null and read_at is null;
create index idx_notifications_category on notifications(category);

-- ════════════════════════════════════════════════════════════
-- 17. NOTIFICATIONS — Delivery Tracking
-- ════════════════════════════════════════════════════════════
create table notification_delivery (
  id              uuid primary key default gen_random_uuid(),
  notification_id uuid not null references notifications(id) on delete cascade,
  device_id       uuid not null references notification_devices(id) on delete cascade,
  transport       text not null check (transport in ('web_push','expo_push')),
  status          text not null default 'pending' check (status in ('pending','sent','delivered','clicked','failed','expired')),
  error_message   text,
  sent_at         timestamptz,
  delivered_at    timestamptz,
  clicked_at      timestamptz,
  unique(notification_id, device_id, transport)
);

create index idx_notif_delivery_notif on notification_delivery(notification_id);
create index idx_notif_delivery_device on notification_delivery(device_id);
create index idx_notif_delivery_status on notification_delivery(status);

-- ════════════════════════════════════════════════════════════
-- 18. NOTIFICATIONS — Persistent Log (user-visible audit trail)
-- ════════════════════════════════════════════════════════════
create table notification_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  body        text not null default '',
  category    text not null default 'system',
  channel     text not null default 'in_app',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index idx_notif_log_user on notification_log(user_id, created_at desc);

-- ════════════════════════════════════════════════════════════
-- 19. NOTIFICATIONS — Preferences
-- ════════════════════════════════════════════════════════════
create table notification_preferences (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  medication_reminders boolean not null default true,
  vital_alerts        boolean not null default true,
  refill_alerts       boolean not null default true,
  workout_reminders   boolean not null default true,
  app_notifications   boolean not null default true,
  quiet_hours_start   time,
  quiet_hours_end     time,
  updated_at          timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════
-- 20. PAIRING — User Connections
-- ════════════════════════════════════════════════════════════
create table user_pairings (
  id             uuid primary key default gen_random_uuid(),
  web_user_id    uuid not null references auth.users(id) on delete cascade,
  mobile_user_id uuid not null references auth.users(id) on delete cascade,
  relationship   text default 'self',
  paired_at      timestamptz not null default now(),
  is_active      boolean not null default true,
  unique(web_user_id, mobile_user_id)
);

create index idx_pairings_web on user_pairings(web_user_id);
create index idx_pairings_mobile on user_pairings(mobile_user_id);

-- ════════════════════════════════════════════════════════════
-- 21. PAIRING — One-Time Codes
-- ════════════════════════════════════════════════════════════
create table pairing_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  claimed_at timestamptz
);

create index idx_pairing_codes_code on pairing_codes(code);
create index idx_pairing_codes_user on pairing_codes(user_id);

-- ════════════════════════════════════════════════════════════
-- 22. TELEGRAM — Bot Links
-- ════════════════════════════════════════════════════════════
create table telegram_links (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  chat_id         text not null,
  username        text,
  is_active       boolean not null default true,
  linked_at       timestamptz not null default now(),
  unique(chat_id)
);

create index idx_telegram_user on telegram_links(user_id);

-- ════════════════════════════════════════════════════════════
-- 23. USER — Settings
-- ════════════════════════════════════════════════════════════
create table user_settings (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  theme           text default 'light',
  timezone        text default 'UTC',
  language        text default 'en',
  emergency_contact text,
  emergency_phone text,
  updated_at      timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════
-- 24. TRIGGERS — Auto-update updated_at
-- ════════════════════════════════════════════════════════════
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

create trigger update_workout_streaks_modtime
  before update on workout_streaks
  for each row execute function update_modified_column();

create trigger update_notification_preferences_modtime
  before update on notification_preferences
  for each row execute function update_modified_column();

-- ════════════════════════════════════════════════════════════
-- 25. RLS POLICIES — Every table protected
-- ════════════════════════════════════════════════════════════

-- Enable RLS on all tables
alter table medications enable row level security;
alter table medication_logs enable row level security;
alter table symptom_logs enable row level security;
alter table vendors enable row level security;
alter table refill_orders enable row level security;
alter table refill_order_events enable row level security;
alter table voice_messages enable row level security;
alter table workouts enable row level security;
alter table workout_schedule enable row level security;
alter table nutrition_logs enable row level security;
alter table workout_streaks enable row level security;
alter table sleep_sessions enable row level security;
alter table daily_steps enable row level security;
alter table wearable_alarms enable row level security;
alter table notification_devices enable row level security;
alter table notifications enable row level security;
alter table notification_delivery enable row level security;
alter table notification_log enable row level security;
alter table notification_preferences enable row level security;
alter table user_pairings enable row level security;
alter table pairing_codes enable row level security;
alter table telegram_links enable row level security;
alter table user_settings enable row level security;

-- Medications: user owns their records
create policy "Users own medications"
  on medications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Medication Logs: via owning medication
create policy "Users read own medication logs"
  on medication_logs for select
  using (exists (select 1 from medications where id = medication_id and user_id = auth.uid()));

create policy "Users insert own medication logs"
  on medication_logs for insert
  with check (exists (select 1 from medications where id = medication_id and user_id = auth.uid()));

create policy "Users update own medication logs"
  on medication_logs for update
  using (exists (select 1 from medications where id = medication_id and user_id = auth.uid()));

-- Symptom Logs
create policy "Users own symptom logs"
  on symptom_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Vendors: read for all authenticated, insert for any authenticated
create policy "Anyone can read vendors"
  on vendors for select to authenticated using (true);

create policy "Authenticated users can register vendors"
  on vendors for insert to authenticated with check (true);

-- Refill Orders
create policy "Users own refill orders"
  on refill_orders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Refill Order Events: via owning order
create policy "Users read own refill events"
  on refill_order_events for select
  using (exists (select 1 from refill_orders where id = order_id and user_id = auth.uid()));

create policy "Users insert own refill events"
  on refill_order_events for insert
  with check (exists (select 1 from refill_orders where id = order_id and user_id = auth.uid()));

-- Voice Messages
create policy "Users own voice messages"
  on voice_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Workouts
create policy "Users own workouts"
  on workouts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Workout Schedule
create policy "Users own workout schedule"
  on workout_schedule for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Nutrition Logs
create policy "Users own nutrition logs"
  on nutrition_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Workout Streaks
create policy "Users own workout streaks"
  on workout_streaks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Sleep Sessions
create policy "Users own sleep sessions"
  on sleep_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Daily Steps
create policy "Users own daily steps"
  on daily_steps for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Wearable Alarms
create policy "Users own wearable alarms"
  on wearable_alarms for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notification Devices
create policy "Users own notification devices"
  on notification_devices for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notifications
create policy "Users read own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users insert own notifications"
  on notifications for insert
  with check (auth.uid() = user_id);

-- Notification Delivery: via owning notification
create policy "Users read own delivery"
  on notification_delivery for select
  using (exists (select 1 from notifications where id = notification_id and user_id = auth.uid()));

-- Notification Log
create policy "Users own notification log"
  on notification_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notification Preferences
create policy "Users own notification preferences"
  on notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- User Pairings
create policy "Users read own pairings"
  on user_pairings for select
  using (auth.uid() in (web_user_id, mobile_user_id));

create policy "Users insert own pairings"
  on user_pairings for insert
  with check (auth.uid() in (web_user_id, mobile_user_id));

-- Pairing Codes: service-role only
create policy "Service role only for pairing codes"
  on pairing_codes for all
  using (false);

-- Telegram Links
create policy "Users own telegram links"
  on telegram_links for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- User Settings
create policy "Users own settings"
  on user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
