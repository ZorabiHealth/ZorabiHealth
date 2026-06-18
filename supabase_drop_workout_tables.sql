-- =========================================================================
-- ZorabiHealth — Drop Workout Feature Tables (Production Grade)
-- Drops all workout-related tables with proper dependency ordering,
-- index cleanup, and trigger removal.
-- =========================================================================

begin;

-- 1. Drop triggers first (dependencies on functions, not tables)
drop trigger if exists update_workouts_modtime on workouts;
drop trigger if exists update_workout_schedule_modtime on workout_schedule;
drop trigger if exists update_workout_streaks_modtime on workout_streaks;

-- 2. Drop indexes (optional but clean)
drop index if exists idx_workouts_user;
drop index if exists idx_workouts_bookmarked;
drop index if exists idx_workout_schedule_user_date;
drop index if exists idx_nutrition_logs_user_date;
drop index if exists idx_workout_streaks_user;

-- 3. Drop tables with cascade (handles any remaining FK references)
drop table if exists workout_streaks cascade;
drop table if exists nutrition_logs cascade;
drop table if exists workout_schedule cascade;
drop table if exists workouts cascade;

-- 4. (Optional) Remove the trigger function if no other tables depend on it
-- Uncomment only if you're sure no other feature uses this function:
-- drop function if exists update_modified_column() cascade;

commit;
