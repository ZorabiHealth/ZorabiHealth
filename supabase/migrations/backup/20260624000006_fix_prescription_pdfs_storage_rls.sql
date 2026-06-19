-- ============================================================
-- Fix missing INSERT policy for prescription_pdfs storage bucket
-- 
-- The earlier migration 20260623000002_fix_patient_profiles_and_rls.sql
-- recreated the SELECT policy but dropped and never re-added
-- the INSERT policy, causing "new row violates row-level security
-- policy" when doctors try to upload prescription PDFs.
-- ============================================================

-- Add INSERT policy: doctors (via doctor_profiles lookup) can upload PDFs
drop policy if exists "Doctors upload prescription PDFs" on storage.objects;
create policy "Doctors upload prescription PDFs"
  on storage.objects for insert
  with check (
    bucket_id = 'prescription_pdfs'
    and exists (
      select 1 from doctor_profiles
      where user_id = auth.uid()
    )
  );

-- Also add UPDATE/DELETE policies so doctors can manage their uploads
drop policy if exists "Doctors manage prescription PDFs" on storage.objects;
create policy "Doctors manage prescription PDFs"
  on storage.objects for all
  using (
    bucket_id = 'prescription_pdfs'
    and exists (
      select 1 from prescription_documents pd
      join prescriptions px on px.id = pd.prescription_id
      where pd.storage_path = name
      and exists (select 1 from doctor_profiles where id = px.doctor_id and user_id = auth.uid())
    )
  )
  with check (
    bucket_id = 'prescription_pdfs'
    and exists (
      select 1 from doctor_profiles
      where user_id = auth.uid()
    )
  );
