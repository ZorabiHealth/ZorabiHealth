-- Add missing columns to notification_devices table
-- The original migration defined these but they may not have been applied

ALTER TABLE notification_devices
ADD COLUMN IF NOT EXISTS transport TEXT NOT NULL DEFAULT 'web_push'
  CHECK (transport IN ('web_push', 'fcm', 'apns'));

ALTER TABLE notification_devices
ADD COLUMN IF NOT EXISTS device_os TEXT DEFAULT NULL;

ALTER TABLE notification_devices
ADD COLUMN IF NOT EXISTS push_endpoint TEXT;

ALTER TABLE notification_devices
ADD COLUMN IF NOT EXISTS push_keys JSONB DEFAULT '{}';

ALTER TABLE notification_devices
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

ALTER TABLE notification_devices
ADD COLUMN IF NOT EXISTS apns_token TEXT;

ALTER TABLE notification_devices
ADD COLUMN IF NOT EXISTS app_version TEXT DEFAULT NULL;
