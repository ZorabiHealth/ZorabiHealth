create table if not exists store_cart (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table store_cart enable row level security;

create policy "Users can manage their own cart"
  on store_cart for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
