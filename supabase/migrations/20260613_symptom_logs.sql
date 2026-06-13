-- =========================================================================
-- Outpatient Symptom Logs Table
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.symptom_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default '00000000-0000-0000-0000-000000000000',
    name text not null,
    severity text not null check (severity in ('Mild', 'Moderate', 'Severe')),
    notes text not null default '',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE INDEX IF NOT EXISTS idx_symptom_logs_user on public.symptom_logs(user_id, created_at desc);

-- Enable Row Level Security (RLS)
alter table public.symptom_logs enable row level security;

-- Policy for select
drop policy if exists "Allow select for user symptom logs" on public.symptom_logs;
create policy "Allow select for user symptom logs"
    on public.symptom_logs for select
    using (auth.uid() = user_id or user_id = '00000000-0000-0000-0000-000000000000');

-- Policy for insert
drop policy if exists "Allow insert for user symptom logs" on public.symptom_logs;
create policy "Allow insert for user symptom logs"
    on public.symptom_logs for insert
    with check (auth.uid() = user_id or user_id = '00000000-0000-0000-0000-000000000000');

-- Policy for delete
drop policy if exists "Allow delete for user symptom logs" on public.symptom_logs;
create policy "Allow delete for user symptom logs"
    on public.symptom_logs for delete
    using (auth.uid() = user_id or user_id = '00000000-0000-0000-0000-000000000000');
