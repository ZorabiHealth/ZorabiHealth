-- ============================================================
-- Migration: Doctor profile photos & signatures storage
-- Adds columns to doctor_profiles, creates storage bucket
-- ============================================================

-- 1. Add photo and signature columns to doctor_profiles
alter table doctor_profiles
  add column if not exists avatar_url text,
  add column if not exists signature_url text;

-- 2. Create storage bucket for doctor assets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('doctor_assets', 'doctor_assets', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- 3. Enable RLS on storage.objects if not already
-- (already enabled by default in Supabase)

-- Allow authenticated users to read doctor assets (public bucket)
drop policy if exists "Anyone can view doctor assets" on storage.objects;
create policy "Anyone can view doctor assets"
  on storage.objects for select
  using (bucket_id = 'doctor_assets');

-- Allow doctors to upload their own assets
drop policy if exists "Doctors upload own assets" on storage.objects;
create policy "Doctors upload own assets"
  on storage.objects for insert
  with check (
    bucket_id = 'doctor_assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow doctors to update/delete their own assets
drop policy if exists "Doctors manage own assets" on storage.objects;
create policy "Doctors manage own assets"
  on storage.objects for all
  using (
    bucket_id = 'doctor_assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'doctor_assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
