-- ZorabiHealth Push Notification System
-- Run this in your Supabase SQL Editor

-- 1. Notification Devices (registered push endpoints)
-- Supports Web Push, FCM (Android), and APNs (iOS) transports
CREATE TABLE IF NOT EXISTS notification_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL DEFAULT 'Unknown',
  device_os TEXT DEFAULT NULL,            -- 'android', 'ios', 'windows', 'macos', 'linux'
  app_version TEXT DEFAULT NULL,           -- semantic version of the installed app
  transport TEXT NOT NULL DEFAULT 'web_push' CHECK (transport IN ('web_push', 'fcm', 'apns')),
  platform TEXT NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'android', 'ios')),
  push_endpoint TEXT,
  push_keys JSONB DEFAULT '{}',
  fcm_token TEXT,                          -- Firebase Cloud Messaging token (Android / iOS)
  apns_token TEXT,                         -- Apple Push Notification token
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Ensure at least one delivery address per device
  CONSTRAINT chk_device_has_token CHECK (
    (transport = 'web_push' AND push_endpoint IS NOT NULL) OR
    (transport = 'fcm' AND fcm_token IS NOT NULL) OR
    (transport = 'apns' AND apns_token IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_notification_devices_user ON notification_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_devices_active ON notification_devices(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_devices_transport ON notification_devices(transport);

ALTER TABLE notification_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own devices"
  ON notification_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices"
  ON notification_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices"
  ON notification_devices FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. Notifications (the actual notification content)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'system' CHECK (category IN ('medication', 'vital', 'appointment', 'system')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  sent_via TEXT[] DEFAULT '{}',           -- tracks which transports already received this: {'web_push', 'fcm'}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unscheduled ON notifications(scheduled_for) WHERE scheduled_for IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Notification Delivery (per-device delivery tracking)
-- Also records which transport was used for each delivery attempt
CREATE TABLE IF NOT EXISTS notification_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES notification_devices(id) ON DELETE CASCADE,
  transport TEXT NOT NULL DEFAULT 'web_push' CHECK (transport IN ('web_push', 'fcm', 'apns')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'clicked', 'failed', 'expired')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  UNIQUE(notification_id, device_id, transport)
);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_notif ON notification_delivery(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_device ON notification_delivery(device_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_status ON notification_delivery(status);

ALTER TABLE notification_delivery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own deliveries"
  ON notification_delivery FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_id AND n.user_id = auth.uid()
    )
  );

-- 4. Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_reminders BOOLEAN NOT NULL DEFAULT true,
  vital_alerts BOOLEAN NOT NULL DEFAULT true,
  app_notifications BOOLEAN NOT NULL DEFAULT true,  -- mobile app push toggle
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);
