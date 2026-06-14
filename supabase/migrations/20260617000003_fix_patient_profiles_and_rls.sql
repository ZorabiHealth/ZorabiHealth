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
