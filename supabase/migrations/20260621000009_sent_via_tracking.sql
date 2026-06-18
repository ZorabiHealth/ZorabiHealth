-- Add retry_count to notification_delivery for tracking failed attempts
alter table notification_delivery add column if not exists retry_count integer not null default 0;

-- RPC to append transports to sent_via array (handles dedup)
create or replace function append_notification_sent_via(
  p_notification_id uuid,
  p_transports text[]
)
returns void
language plpgsql
security definer
as $$
begin
  update notifications
  set sent_via = (
    select array_agg(distinct t)
    from (
      select unnest(coalesce(sent_via, '{}'::text[]) || p_transports)
    ) as t
  )
  where id = p_notification_id;
end;
$$;
