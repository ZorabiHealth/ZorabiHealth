-- Add auto_refill_threshold column to pharmacy_inventory
alter table pharmacy_inventory add column if not exists auto_refill_threshold integer default 0;

-- Enable RLS on pharmacy_inventory if not already enabled
alter table pharmacy_inventory enable row level security;

-- Ensure RLS policy for pharmacy_inventory
drop policy if exists "Pharmacies manage own inventory" on pharmacy_inventory;
create policy "Pharmacies manage own inventory"
  on pharmacy_inventory for all
  using (
    exists (
      select 1 from pharmacy_profiles
      where pharmacy_profiles.id = pharmacy_inventory.pharmacy_id
      and pharmacy_profiles.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from pharmacy_profiles
      where pharmacy_profiles.id = pharmacy_inventory.pharmacy_id
      and pharmacy_profiles.user_id = auth.uid()
    )
  );

-- Allow authenticated users to read inventory (for patients browsing)
drop policy if exists "Authenticated users can view inventory" on pharmacy_inventory;
create policy "Authenticated users can view inventory"
  on pharmacy_inventory for select
  to authenticated
  using (true);

-- Enable RLS on drug_catalog
alter table drug_catalog enable row level security;

drop policy if exists "Authenticated users can view drug catalog" on drug_catalog;
create policy "Authenticated users can view drug catalog"
  on drug_catalog for select
  to authenticated
  using (true);

drop policy if exists "Pharmacies can add drugs to catalog" on drug_catalog;
create policy "Pharmacies can add drugs to catalog"
  on drug_catalog for insert
  to authenticated
  with check (true);

-- Enable RLS on pharmacy_profiles
alter table pharmacy_profiles enable row level security;

drop policy if exists "Users can view pharmacy profiles" on pharmacy_profiles;
create policy "Users can view pharmacy profiles"
  on pharmacy_profiles for select
  to authenticated
  using (true);

drop policy if exists "Pharmacies manage own profile" on pharmacy_profiles;
create policy "Pharmacies manage own profile"
  on pharmacy_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
