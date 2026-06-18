-- Add missing INSERT/UPDATE policies for user_roles
-- All other RLS policies from 20260616 already applied successfully

create policy "Users insert own role"
  on user_roles for insert
  with check (auth.uid() = user_id);

create policy "Users update own role"
  on user_roles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
