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
