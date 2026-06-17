-- Add doctor_name column to doctor_profiles for the doctor's personal name
-- (workspace_name is the clinic/hospital name, doctor_name is the individual doctor's name)

alter table doctor_profiles add column if not exists doctor_name text;

-- Backfill: for existing rows, use workspace_name as doctor_name if doctor_name is null
update doctor_profiles set doctor_name = workspace_name where doctor_name is null;

-- Make it not null after backfill
alter table doctor_profiles alter column doctor_name set not null;
