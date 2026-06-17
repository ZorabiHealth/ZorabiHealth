-- ════════════════════════════════════════════════════════════
-- ZorabiHealth Doctor Ecosystem v2
-- Appointments, Messages, Conversations, Availability, Storage
-- ════════════════════════════════════════════════════════════

-- ─── 1. Doctor Availability ────────────────────────────────
create table if not exists doctor_availability (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid not null references doctor_profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  is_available boolean not null default true,
  created_at  timestamptz not null default now(),
  unique(doctor_id, day_of_week, start_time)
);

create index if not exists idx_doc_avail_doctor on doctor_availability(doctor_id);

-- ─── 2. Time Off / Leaves ────────────────────────────────────
create table if not exists doctor_time_off (
  id         uuid primary key default gen_random_uuid(),
  doctor_id  uuid not null references doctor_profiles(id) on delete cascade,
  date       date not null,
  reason     text,
  created_at timestamptz not null default now(),
  unique(doctor_id, date)
);

-- ─── 3. Appointments ─────────────────────────────────────────
create table if not exists appointments (
  id              uuid primary key default gen_random_uuid(),
  doctor_id       uuid not null references doctor_profiles(id) on delete cascade,
  patient_id      uuid not null references auth.users(id) on delete cascade,
  scheduled_date  date not null,
  start_time      time not null,
  end_time        time not null,
  type            text not null default 'physical' check (type in ('video', 'physical', 'chat')),
  status          text not null default 'scheduled' check (status in ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  queue_position  integer,
  notes           text,
  meeting_link    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_appointments_doctor on appointments(doctor_id, scheduled_date);
create index if not exists idx_appointments_patient on appointments(patient_id, scheduled_date);
create index if not exists idx_appointments_status on appointments(status);

-- ─── 4. Conversations ────────────────────────────────────────
create table if not exists conversations (
  id                uuid primary key default gen_random_uuid(),
  doctor_id         uuid not null references auth.users(id) on delete cascade,
  patient_id        uuid not null references auth.users(id) on delete cascade,
  last_message      text,
  last_message_at   timestamptz,
  unread_doctor     integer not null default 0,
  unread_patient    integer not null default 0,
  created_at        timestamptz not null default now(),
  unique(doctor_id, patient_id)
);

create index if not exists idx_conv_doctor on conversations(doctor_id, last_message_at desc);
create index if not exists idx_conv_patient on conversations(patient_id, last_message_at desc);

-- ─── 5. Messages ─────────────────────────────────────────────
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  content         text,
  attachment_url  text,
  attachment_type text,
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);

create index if not exists idx_messages_conv on messages(conversation_id, created_at asc);

-- ─── 6. Prescription Documents (PDF storage tracking) ────────
create table if not exists prescription_documents (
  id               uuid primary key default gen_random_uuid(),
  prescription_id  uuid not null references prescriptions(id) on delete cascade,
  storage_path     text not null,
  file_name        text not null,
  file_size        integer,
  created_at       timestamptz not null default now()
);

create index if not exists idx_rx_docs_prescription on prescription_documents(prescription_id);

-- ─── 7. Doctor Workspace (Onboarding) ────────────────────────
-- Extends doctor_profiles with workspace fields
-- (We add columns to existing table via DO block to be idempotent)
do $$
begin
  -- Clinic / workspace name
  if not exists (select 1 from information_schema.columns where table_name = 'doctor_profiles' and column_name = 'workspace_name') then
    alter table doctor_profiles add column workspace_name text;
  end if;
  -- Consultation type offered
  if not exists (select 1 from information_schema.columns where table_name = 'doctor_profiles' and column_name = 'consultation_types') then
    alter table doctor_profiles add column consultation_types text[] default array['physical'];
  end if;
  -- Bio / description
  if not exists (select 1 from information_schema.columns where table_name = 'doctor_profiles' and column_name = 'bio') then
    alter table doctor_profiles add column bio text;
  end if;
  -- Languages spoken
  if not exists (select 1 from information_schema.columns where table_name = 'doctor_profiles' and column_name = 'languages') then
    alter table doctor_profiles add column languages text[] default array['English'];
  end if;
  -- Avatar / profile image storage path
  if not exists (select 1 from information_schema.columns where table_name = 'doctor_profiles' and column_name = 'avatar_url') then
    alter table doctor_profiles add column avatar_url text;
  end if;
  -- Onboarding completed flag
  if not exists (select 1 from information_schema.columns where table_name = 'doctor_profiles' and column_name = 'onboarding_completed') then
    alter table doctor_profiles add column onboarding_completed boolean not null default false;
  end if;
end $$;

-- ─── 8. Patient Medical History ─────────────────────────────
create table if not exists patient_medical_history (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references auth.users(id) on delete cascade,
  condition   text not null,
  diagnosed_date date,
  is_active   boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_pmh_patient on patient_medical_history(patient_id);

-- ─── 9. Clinical Note Templates ──────────────────────────────
create table if not exists clinical_note_templates (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid not null references doctor_profiles(id) on delete cascade,
  title       text not null,
  content     text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_cnt_doctor on clinical_note_templates(doctor_id);

-- ─── RLS Policies ──────────────────────────────────────────
alter table doctor_availability enable row level security;
alter table doctor_time_off enable row level security;
alter table appointments enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table prescription_documents enable row level security;
alter table patient_medical_history enable row level security;
alter table clinical_note_templates enable row level security;

-- Doctor Availability: manage own, anyone can read
drop policy if exists "Doctors manage own availability" on doctor_availability;
create policy "Doctors manage own availability"
  on doctor_availability for all
  using (doctor_id in (select id from doctor_profiles where user_id = auth.uid()))
  with check (doctor_id in (select id from doctor_profiles where user_id = auth.uid()));

drop policy if exists "Anyone can read availability" on doctor_availability;
create policy "Anyone can read availability"
  on doctor_availability for select to authenticated using (true);

-- Doctor Time Off: manage own, patients can read
drop policy if exists "Doctors manage own time off" on doctor_time_off;
create policy "Doctors manage own time off"
  on doctor_time_off for all
  using (doctor_id in (select id from doctor_profiles where user_id = auth.uid()))
  with check (doctor_id in (select id from doctor_profiles where user_id = auth.uid()));

drop policy if exists "Patients can read time off" on doctor_time_off;
create policy "Patients can read time off"
  on doctor_time_off for select to authenticated using (true);

-- Appointments: doctors and patients manage/read their own
drop policy if exists "Doctors manage appointments" on appointments;
create policy "Doctors manage appointments"
  on appointments for all
  using (doctor_id in (select id from doctor_profiles where user_id = auth.uid()))
  with check (doctor_id in (select id from doctor_profiles where user_id = auth.uid()));

drop policy if exists "Patients read own appointments" on appointments;
create policy "Patients read own appointments"
  on appointments for select
  using (auth.uid() = patient_id);

drop policy if exists "Patients insert own appointments" on appointments;
create policy "Patients insert own appointments"
  on appointments for insert
  with check (auth.uid() = patient_id);

drop policy if exists "Patients update own appointments" on appointments;
create policy "Patients update own appointments"
  on appointments for update
  using (auth.uid() = patient_id)
  with check (auth.uid() = patient_id);

-- Conversations: participants only
drop policy if exists "Participants manage conversations" on conversations;
create policy "Participants manage conversations"
  on conversations for all
  using (auth.uid() in (doctor_id, patient_id))
  with check (auth.uid() in (doctor_id, patient_id));

-- Messages: participants only
drop policy if exists "Participants manage messages" on messages;
create policy "Participants manage messages"
  on messages for all
  using (exists (select 1 from conversations where id = conversation_id and auth.uid() in (doctor_id, patient_id)))
  with check (exists (select 1 from conversations where id = conversation_id and auth.uid() in (doctor_id, patient_id)));

-- Prescription Documents: doctor and patient
drop policy if exists "Doctor and patient can read rx docs" on prescription_documents;
create policy "Doctor and patient can read rx docs"
  on prescription_documents for select
  using (exists (select 1 from prescriptions where id = prescription_id and (doctor_id = auth.uid() or patient_id = auth.uid())));

drop policy if exists "Doctors insert rx docs" on prescription_documents;
create policy "Doctors insert rx docs"
  on prescription_documents for insert
  with check (exists (select 1 from prescriptions where id = prescription_id and doctor_id = auth.uid()));

-- Patient Medical History: patient and their doctors
drop policy if exists "Patients manage own medical history" on patient_medical_history;
create policy "Patients manage own medical history"
  on patient_medical_history for all
  using (auth.uid() = patient_id)
  with check (auth.uid() = patient_id);

drop policy if exists "Doctors read patient medical history" on patient_medical_history;
create policy "Doctors read patient medical history"
  on patient_medical_history for select
  using (exists (select 1 from prescriptions where patient_id = patient_medical_history.patient_id and doctor_id = auth.uid()));

-- Clinical Note Templates
drop policy if exists "Doctors manage own templates" on clinical_note_templates;
create policy "Doctors manage own templates"
  on clinical_note_templates for all
  using (doctor_id in (select id from doctor_profiles where user_id = auth.uid()))
  with check (doctor_id in (select id from doctor_profiles where user_id = auth.uid()));

-- ─── Storage Bucket for Prescription PDFs ────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prescription_pdfs', 'prescription_pdfs', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

-- Storage RLS: doctors can upload, doctor and patient can read
drop policy if exists "Doctors upload prescription PDFs" on storage.objects;
create policy "Doctors upload prescription PDFs"
  on storage.objects for insert
  with check (
    bucket_id = 'prescription_pdfs' and
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'doctor')
  );

drop policy if exists "Doctor and patient read prescription PDFs" on storage.objects;
create policy "Doctor and patient read prescription PDFs"
  on storage.objects for select
  using (
    bucket_id = 'prescription_pdfs' and
    exists (
      select 1 from prescription_documents pd
      join prescriptions px on px.id = pd.prescription_id
      where pd.storage_path = name and (px.doctor_id = auth.uid() or px.patient_id = auth.uid())
    )
  );

-- ─── Timestamp Triggers ──────────────────────────────────────
drop trigger if exists update_appointments_modified on appointments;
create trigger update_appointments_modified
  before update on appointments
  for each row execute function update_modified_column();
