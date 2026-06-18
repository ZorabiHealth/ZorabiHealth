alter table refill_orders alter column medication_id drop not null;
alter table refill_orders drop constraint if exists refill_orders_medication_id_fkey;
alter table refill_orders alter column vendor_id drop not null;
alter table refill_orders drop constraint if exists refill_orders_vendor_id_fkey;
