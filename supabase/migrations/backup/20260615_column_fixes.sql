-- Fix mismatched columns after professional schema migration

-- workouts: add body_area and is_bookmarked that the UI uses
alter table workouts add column if not exists body_area text default 'full';
alter table workouts add column if not exists is_bookmarked boolean not null default false;

-- notification_devices: add device_os and app_version that mobile registration sends
alter table notification_devices add column if not exists device_os text;
alter table notification_devices add column if not exists app_version text;
