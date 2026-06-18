-- Fix: add default uuid generation to patient_profiles.id
-- (needed for doctor-created patients where we don't set id explicitly)

alter table patient_profiles
  alter column id set default gen_random_uuid();
