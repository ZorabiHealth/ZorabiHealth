-- Fix assign_store_order_to_pharmacy() missing GROUP BY clause
-- The original function in 20260621000015 omitted GROUP BY pp.id,
-- causing error 42803: 'column "pp.id" must appear in the GROUP BY clause'

create or replace function assign_store_order_to_pharmacy()
returns trigger as $$
declare
  v_pharmacy_id uuid;
begin
  select pp.id into v_pharmacy_id
  from pharmacy_profiles pp
  left join store_orders so on so.pharmacy_id = pp.id and so.status in ('PENDING', 'CONFIRMED')
  where pp.is_active = true
  group by pp.id
  order by count(so.id) asc nulls first
  limit 1;

  if v_pharmacy_id is not null then
    new.pharmacy_id := v_pharmacy_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;
