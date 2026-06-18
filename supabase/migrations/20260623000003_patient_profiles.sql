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
