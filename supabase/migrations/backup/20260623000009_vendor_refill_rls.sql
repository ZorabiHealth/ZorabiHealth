-- Allow pharmacy vendors to read refill orders (for order fulfillment)
drop policy if exists "Pharmacies read refill orders" on refill_orders;
create policy "Pharmacies read refill orders"
  on refill_orders for select
  using (exists (
    select 1 from pharmacy_profiles where user_id = auth.uid()
  ));

-- Allow pharmacy vendors to read refill order events
drop policy if exists "Pharmacies read refill order events" on refill_order_events;
create policy "Pharmacies read refill order events"
  on refill_order_events for select
  using (exists (
    select 1 from refill_orders ro
    where ro.id = refill_order_id
    and exists (select 1 from pharmacy_profiles where user_id = auth.uid())
  ));
