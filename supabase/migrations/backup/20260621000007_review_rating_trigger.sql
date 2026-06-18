create or replace function update_pharmacy_rating()
returns trigger as $$
begin
  update pharmacy_profiles
  set rating = (
    select coalesce(avg(rating)::numeric(3,2), 0)
    from product_reviews
    where pharmacy_id = coalesce(NEW.pharmacy_id, OLD.pharmacy_id)
  )
  where id = coalesce(NEW.pharmacy_id, OLD.pharmacy_id);
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_update_pharmacy_rating
  after insert or update or delete on product_reviews
  for each row execute function update_pharmacy_rating();
