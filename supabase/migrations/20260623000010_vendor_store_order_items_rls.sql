-- Allow pharmacy vendors to read store_order_items for assigned orders
drop policy if exists "Pharmacy can read assigned store order items" on store_order_items;
create policy "Pharmacy can read assigned store order items"
  on store_order_items for select
  using (exists (
    select 1 from store_orders
    where store_orders.id = store_order_items.order_id
    and store_orders.pharmacy_id in (
      select id from pharmacy_profiles where user_id = auth.uid()
    )
  ));
