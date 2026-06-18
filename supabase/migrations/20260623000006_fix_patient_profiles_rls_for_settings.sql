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
