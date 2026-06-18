-- =========================================================================
-- ZorabiHealth — Workout Feature Migration
-- Run this in your Supabase SQL Editor
-- =========================================================================

-- 1. Workouts Library Table
create table if not exists workouts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default '00000000-0000-0000-0000-000000000000',
    title text not null,
    category text not null check (category in ('HIIT', 'Strength', 'Focus', 'Agility')),
    body_area text not null check (body_area in ('Lower Leg', 'Upper Leg', 'Chest', 'Bicep')),
    difficulty text not null check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
    calories integer not null default 0,
    duration integer not null default 0,
    coach text not null default 'ZorabiHealth',
    is_bookmarked boolean not null default false,
    video_id text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_workouts_user on workouts(user_id, category);
create index if not exists idx_workouts_bookmarked on workouts(user_id, is_bookmarked) where is_bookmarked = true;

-- 2. Workout Daily Schedule Table
create table if not exists workout_schedule (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default '00000000-0000-0000-0000-000000000000',
    date date not null default current_date,
    time text not null,
    title text not null,
    type text not null default 'Custom Session',
    completed boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_workout_schedule_user_date on workout_schedule(user_id, date desc);

-- 3. Nutrition Logs Table
create table if not exists nutrition_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default '00000000-0000-0000-0000-000000000000',
    date date not null default current_date,
    name text not null,
    calories integer not null default 0,
    protein_g integer not null default 0,
    carbs_g integer not null default 0,
    fat_g integer not null default 0,
    emoji text not null default 'meal',
    time text not null default 'Today',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_nutrition_logs_user_date on nutrition_logs(user_id, date desc);

-- 4. Workout Streaks Table
create table if not exists workout_streaks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default '00000000-0000-0000-0000-000000000000' unique,
    current_streak integer not null default 0,
    longest_streak integer not null default 0,
    last_workout_date date,
    streak_days jsonb not null default '{}'::jsonb,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_workout_streaks_user on workout_streaks(user_id);

-- 5. Auto-update triggers (requires update_modified_column function to exist)
create or replace function update_modified_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists update_workouts_modtime on workouts;
create trigger update_workouts_modtime
    before update on workouts
    for each row execute function update_modified_column();

drop trigger if exists update_workout_schedule_modtime on workout_schedule;
create trigger update_workout_schedule_modtime
    before update on workout_schedule
    for each row execute function update_modified_column();

drop trigger if exists update_workout_streaks_modtime on workout_streaks;
create trigger update_workout_streaks_modtime
    before update on workout_streaks
    for each row execute function update_modified_column();
