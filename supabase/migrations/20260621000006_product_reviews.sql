create table if not exists product_reviews (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid references store_orders(id) on delete set null,
  prescription_order_id uuid references orders(id) on delete set null,
  product_id      text,
  medication_id   uuid references medications(id) on delete set null,
  pharmacy_id     uuid not null references pharmacy_profiles(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  rating          integer not null check (rating >= 1 and rating <= 5),
  title           text default '',
  review          text default '',
  is_verified_purchase boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_reviews_pharmacy on product_reviews(pharmacy_id, created_at desc);
create index idx_reviews_product on product_reviews(product_id, created_at desc);
create index idx_reviews_medication on product_reviews(medication_id, created_at desc);
create index idx_reviews_user on product_reviews(user_id, created_at desc);

alter table product_reviews enable row level security;

create policy "Anyone can read reviews"
  on product_reviews for select
  using (true);

create policy "Users can create own reviews"
  on product_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reviews"
  on product_reviews for update
  using (auth.uid() = user_id);

create policy "Users can delete own reviews"
  on product_reviews for delete
  using (auth.uid() = user_id);
