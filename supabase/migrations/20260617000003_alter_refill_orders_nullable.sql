alter table refill_orders alter column vendor_id drop not null;
alter table refill_orders alter column vendor_name drop not null;
alter table refill_orders alter column vendor_email drop not null;
alter table refill_orders alter column patient_email drop not null;
alter table refill_orders alter column delivery_address drop not null;
alter table refill_orders alter column total_price drop not null;
alter table refill_orders alter column idempotency_key drop not null;
