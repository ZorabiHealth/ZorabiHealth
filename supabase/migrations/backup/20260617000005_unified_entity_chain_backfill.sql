-- Backfill prescriptions with tracking IDs
update prescriptions
set tracking_id = 'ZR-RX-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
where tracking_id is null;

-- Backfill appointments with tracking IDs
update appointments
set tracking_id = 'ZR-APPT-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
where tracking_id is null;

-- UNIQUE constraints
alter table prescriptions add constraint prescriptions_tracking_id_key unique (tracking_id);
alter table appointments add constraint appointments_tracking_id_key unique (tracking_id);

-- FK CONSTRAINTS
do $$
begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'fk_prescriptions_appointment') then
    alter table prescriptions add constraint fk_prescriptions_appointment foreign key (appointment_id) references appointments(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'fk_medications_prescription') then
    alter table medications add constraint fk_medications_prescription foreign key (prescription_id) references prescriptions(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'fk_medications_prescription_item') then
    alter table medications add constraint fk_medications_prescription_item foreign key (prescription_item_id) references prescription_items(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'fk_refill_orders_prescription') then
    alter table refill_orders add constraint fk_refill_orders_prescription foreign key (prescription_id) references prescriptions(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'fk_orders_appointment') then
    alter table orders add constraint fk_orders_appointment foreign key (appointment_id) references appointments(id) on delete set null;
  end if;
end $$;

-- Trigger: auto-generate tracking ID on prescriptions INSERT
create or replace function trg_set_prescription_tracking_id()
returns trigger as $$
begin
  if new.tracking_id is null then
    new.tracking_id := 'ZR-RX-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_prescription_tracking_id on prescriptions;
create trigger set_prescription_tracking_id
  before insert on prescriptions
  for each row execute function trg_set_prescription_tracking_id();

-- Trigger: auto-generate tracking ID on appointments INSERT
create or replace function trg_set_appointment_tracking_id()
returns trigger as $$
begin
  if new.tracking_id is null then
    new.tracking_id := 'ZR-APPT-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_appointment_tracking_id on appointments;
create trigger set_appointment_tracking_id
  before insert on appointments
  for each row execute function trg_set_appointment_tracking_id();

-- Trigger: auto-create medications when prescription goes active
create or replace function trg_prescription_fill_to_medications()
returns trigger as $$
begin
  if new.status = 'active' and (old.status is distinct from 'active') then
    insert into medications (
      user_id, prescription_id, prescription_item_id,
      name, dosage, frequency, scheduled_times, start_date,
      current_stock, refill_at, prescribed_by, category, color, is_active
    )
    select
      new.patient_id, new.id, pi.id,
      pi.drug_name, pi.dosage,
      case
        when pi.frequency ilike '%twice%' then 'twice_daily'
        when pi.frequency ilike '%three%'  then 'three_times_daily'
        when pi.frequency ilike '%week%'   then 'weekly'
        when pi.frequency ilike '%prn%' or pi.frequency ilike '%as needed%' then 'as_needed'
        else 'daily'
      end,
      case
        when pi.frequency ilike '%twice%'  then '{08:00,20:00}'
        when pi.frequency ilike '%three%'  then '{08:00,14:00,20:00}'
        when pi.frequency ilike '%week%'   then '{09:00}'
        when pi.frequency ilike '%prn%' or pi.frequency ilike '%as needed%' then '{09:00}'
        else '{09:00}'
      end,
      coalesce(new.created_at, now())::date,
      pi.quantity, greatest(pi.quantity / 4, 7),
      (select full_name from doctor_profiles where id = new.doctor_id limit 1),
      coalesce((select category from drug_catalog where id = pi.drug_id limit 1), 'General'),
      (array['blue','emerald','violet','amber','rose'])[floor(random() * 5 + 1)], true
    from prescription_items pi
    where pi.prescription_id = new.id
    on conflict do nothing;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists prescription_fill_to_medications on prescriptions;
create trigger prescription_fill_to_medications
  after update of status on prescriptions
  for each row
  when (new.status = 'active')
  execute function trg_prescription_fill_to_medications();

-- Trigger: auto-link refill_order to prescription via medication
create or replace function trg_refill_order_link_prescription()
returns trigger as $$
begin
  if new.prescription_id is null and new.medication_id is not null then
    select prescription_id into new.prescription_id
    from medications where id = new.medication_id and prescription_id is not null limit 1;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists refill_order_link_prescription on refill_orders;
create trigger refill_order_link_prescription
  before insert on refill_orders
  for each row
  execute function trg_refill_order_link_prescription();

-- v_patient_journey VIEW
drop view if exists v_patient_journey cascade;
create view v_patient_journey as
select
  pp.id as patient_id, pp.full_name as patient_name, pp.email as patient_email,
  a.id as appointment_id, a.tracking_id as appointment_tracking_id, a.scheduled_date as appointment_date,
  a.status as appointment_status, a.type as appointment_type,
  dp.id as doctor_profile_id, dp.user_id as doctor_user_id, dp.specialization as doctor_specialization,
  coalesce(dp.workspace_name, dp.hospital_affiliation) as doctor_workspace,
  px.id as prescription_id, px.tracking_id as prescription_tracking_id, px.diagnosis as prescription_diagnosis,
  px.status as prescription_status, px.created_at as prescription_created_at,
  jsonb_agg(distinct jsonb_build_object('item_id', pi.id, 'drug_name', pi.drug_name, 'dosage', pi.dosage, 'frequency', pi.frequency, 'quantity', pi.quantity)) filter (where pi.id is not null) as prescription_items,
  jsonb_agg(distinct jsonb_build_object('medication_id', m.id, 'drug_name', m.name, 'dosage', m.dosage, 'current_stock', m.current_stock, 'is_active', m.is_active)) filter (where m.id is not null) as medications,
  jsonb_agg(distinct jsonb_build_object('order_id', ro.id, 'tracking_id', ro.tracking_id, 'status', ro.status, 'total_price', ro.total_price, 'vendor_name', ro.vendor_name, 'estimated_delivery', ro.estimated_delivery)) filter (where ro.id is not null) as refill_orders,
  jsonb_agg(distinct jsonb_build_object('order_id', o.id, 'tracking_id', o.tracking_id, 'status', o.status, 'total_amount', o.total_amount)) filter (where o.id is not null) as pharmacy_orders
from patient_profiles pp
left join appointments a on a.patient_id = pp.id
left join doctor_profiles dp on dp.id = a.doctor_id
left join prescriptions px on px.patient_id = pp.id
left join prescription_items pi on pi.prescription_id = px.id
left join medications m on m.prescription_id = px.id and m.user_id = pp.id
left join refill_orders ro on ro.prescription_id = px.id
left join orders o on o.prescription_id = px.id
group by pp.id, pp.full_name, pp.email, a.id, a.tracking_id, a.scheduled_date, a.status, a.type,
  dp.id, dp.user_id, dp.specialization, coalesce(dp.workspace_name, dp.hospital_affiliation),
  px.id, px.tracking_id, px.diagnosis, px.status, px.created_at;

grant select on v_patient_journey to authenticated;

-- trace_entity function
create or replace function trace_entity(p_entity_id uuid)
returns table (
  entity_type text, entity_id uuid, tracking_id text,
  patient_name text, patient_id uuid,
  appointment_id uuid, appointment_tracking_id text, doctor_name text,
  prescription_id uuid, prescription_tracking_id text,
  order_id uuid, order_tracking_id text, current_status text,
  full_chain jsonb
) language plpgsql as $$
declare
  v_entity_type text;
  v_tracking_id text;
begin
  if exists (select 1 from appointments where id = p_entity_id) then
    v_entity_type := 'appointment';
    select tracking_id into v_tracking_id from appointments where id = p_entity_id;
  elsif exists (select 1 from prescriptions where id = p_entity_id) then
    v_entity_type := 'prescription';
    select tracking_id into v_tracking_id from prescriptions where id = p_entity_id;
  elsif exists (select 1 from refill_orders where id = p_entity_id) then
    v_entity_type := 'refill_order';
    select tracking_id into v_tracking_id from refill_orders where id = p_entity_id;
  elsif exists (select 1 from orders where id = p_entity_id) then
    v_entity_type := 'pharmacy_order';
    select tracking_id into v_tracking_id from orders where id = p_entity_id;
  elsif exists (select 1 from medications where id = p_entity_id) then
    v_entity_type := 'medication';
    v_tracking_id := p_entity_id::text;
  elsif exists (select 1 from patient_profiles where id = p_entity_id) then
    v_entity_type := 'patient';
    v_tracking_id := p_entity_id::text;
  else
    v_entity_type := 'unknown';
  end if;

  return query
  select
    v_entity_type,
    coalesce(px.id, a.id, ro.id, o.id, m.id, pp.id),
    coalesce(px.tracking_id, a.tracking_id, ro.tracking_id, o.tracking_id, pp.id::text),
    pp.full_name, pp.id, a.id, a.tracking_id, dp.workspace_name,
    px.id, px.tracking_id, coalesce(ro.id, o.id), coalesce(ro.tracking_id, o.tracking_id),
    coalesce(px.status, a.status::text, ro.status, o.status, m.is_active::text),
    jsonb_build_object(
      'patient', jsonb_build_object('id', pp.id, 'name', pp.full_name, 'email', pp.email),
      'appointment', case when a.id is not null then jsonb_build_object('id', a.id, 'tracking_id', a.tracking_id, 'date', a.scheduled_date, 'status', a.status, 'type', a.type) else null end,
      'prescription', case when px.id is not null then jsonb_build_object('id', px.id, 'tracking_id', px.tracking_id, 'diagnosis', px.diagnosis, 'status', px.status, 'items', (select jsonb_agg(jsonb_build_object('drug_name', pi.drug_name, 'dosage', pi.dosage, 'frequency', pi.frequency, 'quantity', pi.quantity)) from prescription_items pi where pi.prescription_id = px.id)) else null end,
      'medications', case when exists (select 1 from medications where prescription_id = px.id or user_id = pp.id) then (select jsonb_agg(jsonb_build_object('id', m2.id, 'name', m2.name, 'dosage', m2.dosage, 'stock', m2.current_stock, 'active', m2.is_active)) from medications m2 where m2.prescription_id = px.id or m2.user_id = pp.id) else null end,
      'order', case when ro.id is not null then jsonb_build_object('id', ro.id, 'tracking_id', ro.tracking_id, 'status', ro.status, 'vendor', ro.vendor_name, 'total', ro.total_price, 'delivery', ro.delivery_address, 'estimated', ro.estimated_delivery) else case when o.id is not null then jsonb_build_object('id', o.id, 'tracking_id', o.tracking_id, 'status', o.status, 'total', o.total_amount, 'delivery', o.delivery_address) else null end end
    )
  from patient_profiles pp
  left join appointments a on a.patient_id = pp.id and (a.id = p_entity_id or a.patient_id = p_entity_id)
  left join doctor_profiles dp on dp.id = a.doctor_id
  left join prescriptions px on (px.patient_id = pp.id or px.id = p_entity_id)
  left join medications m on (m.prescription_id = px.id or m.id = p_entity_id) and m.user_id = pp.id
  left join refill_orders ro on (ro.prescription_id = px.id or ro.id = p_entity_id)
  left join orders o on (o.prescription_id = px.id or o.id = p_entity_id)
  where pp.id = p_entity_id or a.id = p_entity_id or px.id = p_entity_id or m.id = p_entity_id or ro.id = p_entity_id or o.id = p_entity_id
  limit 1;
end;
$$;
