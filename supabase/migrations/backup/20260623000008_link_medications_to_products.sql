-- Link medications to store products for auto-refill pricing and product info
alter table medications add column if not exists product_id uuid references store_products(id) on delete set null;
create index if not exists idx_medications_product on medications(product_id) where product_id is not null;

-- Also add product_id to refill_orders for traceability
alter table refill_orders add column if not exists product_id uuid;
