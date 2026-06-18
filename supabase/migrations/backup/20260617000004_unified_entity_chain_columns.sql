-- ═══════════════════════════════════════════════════════════════════
-- Unified Entity Chain — Part 1: Columns, Indexes, FKs only
-- (No DO blocks or functions to avoid semicolon split issues)
-- ═══════════════════════════════════════════════════════════════════

-- 2a. prescriptions
alter table prescriptions add column if not exists appointment_id uuid;
alter table prescriptions add column if not exists tracking_id text;

-- 2b. medications
alter table medications add column if not exists prescription_id uuid;
alter table medications add column if not exists prescription_item_id uuid;

-- 2c. refill_orders
alter table refill_orders add column if not exists prescription_id uuid;

-- 2d. appointments (tracking_id for entity chain)
alter table appointments add column if not exists tracking_id text;

-- 2e. orders
alter table orders add column if not exists appointment_id uuid;

-- Indexes
create index if not exists idx_prescriptions_appointment on prescriptions(appointment_id) where appointment_id is not null;
create index if not exists idx_prescriptions_tracking on prescriptions(tracking_id) where tracking_id is not null;
create index if not exists idx_medications_prescription on medications(prescription_id) where prescription_id is not null;
create index if not exists idx_medications_prescription_item on medications(prescription_item_id) where prescription_item_id is not null;
create index if not exists idx_refill_orders_prescription on refill_orders(prescription_id) where prescription_id is not null;
create index if not exists idx_orders_appointment on orders(appointment_id) where appointment_id is not null;

-- Performance indexes
create index if not exists idx_prescriptions_status_patient on prescriptions(status, patient_id) where status = 'active';
create index if not exists idx_prescriptions_status_doctor on prescriptions(status, doctor_id) where status in ('active', 'draft');
create index if not exists idx_refill_orders_status_tracking on refill_orders(status, tracking_id);
create index if not exists idx_orders_status_tracking on orders(status, tracking_id);
create index if not exists idx_medications_active_user on medications(user_id, is_active) where is_active = true;

-- RLS policies
drop policy if exists "Doctors manage own prescriptions" on prescriptions;
create policy "Doctors manage own prescriptions"
  on prescriptions for all
  using (exists (select 1 from doctor_profiles where id = doctor_id and user_id = auth.uid()))
  with check (exists (select 1 from doctor_profiles where id = doctor_id and user_id = auth.uid()));

drop policy if exists "Patients read own prescriptions" on prescriptions;
create policy "Patients read own prescriptions"
  on prescriptions for select
  using (auth.uid() in (select id from patient_profiles where id = patient_id));

drop policy if exists "Users own medications" on medications;
create policy "Users own medications"
  on medications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Doctors read prescribed medications" on medications;
create policy "Doctors read prescribed medications"
  on medications for select
  using (exists (
    select 1 from prescriptions
    where id = prescription_id
    and exists (select 1 from doctor_profiles where id = doctor_id and user_id = auth.uid())
  ));

drop policy if exists "Pharmacies read medications for orders" on medications;
create policy "Pharmacies read medications for orders"
  on medications for select
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'pharmacy_vendor'));

drop policy if exists "Doctors read orders for their prescriptions" on orders;
create policy "Doctors read orders for their prescriptions"
  on orders for select
  using (exists (
    select 1 from prescriptions
    where id = prescription_id
    and exists (select 1 from doctor_profiles where id = doctor_id and user_id = auth.uid())
  ));
