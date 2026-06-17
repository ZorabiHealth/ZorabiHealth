-- ============================================================
-- Fix store_orders: pharmacy vendors can read assigned orders
-- ============================================================
alter table store_orders add column if not exists pharmacy_id uuid references pharmacy_profiles(id);
drop policy if exists "Pharmacy can read assigned store orders" on store_orders;
create policy "Pharmacy can read assigned store orders"
  on store_orders for select
  using (pharmacy_id in (
    select id from pharmacy_profiles where user_id = auth.uid()
  ));

-- Pharmacy vendors can update status of assigned orders
drop policy if exists "Pharmacy can update assigned store orders" on store_orders;
create policy "Pharmacy can update assigned store orders"
  on store_orders for update
  using (pharmacy_id in (
    select id from pharmacy_profiles where user_id = auth.uid()
  ))
  with check (pharmacy_id in (
    select id from pharmacy_profiles where user_id = auth.uid()
  ));

-- ============================================================
-- Fix orders (v2 prescription orders): pharmacy access
-- ============================================================
drop policy if exists "Pharmacy can read assigned orders" on orders;
create policy "Pharmacy can read assigned orders"
  on orders for select
  using (pharmacy_id in (
    select id from pharmacy_profiles where user_id = auth.uid()
  ));

drop policy if exists "Pharmacy can update assigned orders" on orders;
create policy "Pharmacy can update assigned orders"
  on orders for update
  using (pharmacy_id in (
    select id from pharmacy_profiles where user_id = auth.uid()
  ));

-- ============================================================
-- Patient can read prescription orders (orders table)
-- ============================================================
drop policy if exists "Patient can read own prescription orders" on orders;
create policy "Patient can read own prescription orders"
  on orders for select
  using (patient_id = auth.uid());

-- ============================================================
-- Doctor can read orders they initiated
-- ============================================================
drop policy if exists "Doctor can read own initiated orders" on orders;
create policy "Doctor can read orders for their prescriptions"
  on orders for select
  using (prescription_id in (
    select id from prescriptions where doctor_id in (
      select id from doctor_profiles where user_id = auth.uid()
    )
  ));

-- ============================================================
-- pharmacy_profiles: public read for active profiles
-- ============================================================
drop policy if exists "Anyone can view active pharmacies" on pharmacy_profiles;
create policy "Anyone can view active pharmacies"
  on pharmacy_profiles for select
  using (is_active = true);

-- ============================================================
-- Vendor can update own pharmacy_profile
-- ============================================================
drop policy if exists "Vendor can update own profile" on pharmacy_profiles;
create policy "Vendor can update own profile"
  on pharmacy_profiles for update
  using (user_id = auth.uid());
