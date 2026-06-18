-- Create Supabase storage bucket for pharmacy product images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pharmacy_products',
  'pharmacy_products',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- RLS: anyone can read (public bucket)
drop policy if exists "Anyone can view pharmacy product images" on storage.objects;
create policy "Anyone can view pharmacy product images"
  on storage.objects for select
  using (bucket_id = 'pharmacy_products');

-- RLS: authenticated users can upload to their own folder
drop policy if exists "Authenticated users can upload pharmacy images" on storage.objects;
create policy "Authenticated users can upload pharmacy images"
  on storage.objects for insert
  with check (
    bucket_id = 'pharmacy_products'
    and auth.role() = 'authenticated'
  );

-- RLS: owners can update/delete their own uploads
drop policy if exists "Users can update own pharmacy images" on storage.objects;
create policy "Users can update own pharmacy images"
  on storage.objects for update
  using (bucket_id = 'pharmacy_products' and owner = auth.uid())
  with check (bucket_id = 'pharmacy_products' and owner = auth.uid());

drop policy if exists "Users can delete own pharmacy images" on storage.objects;
create policy "Users can delete own pharmacy images"
  on storage.objects for delete
  using (bucket_id = 'pharmacy_products' and owner = auth.uid());
