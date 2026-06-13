-- Fix missing columns in notification_preferences (safe to re-run)
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS app_notifications BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Create notifications table if missing
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
  sent_via TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create notification_delivery table if missing
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

ALTER TABLE notification_delivery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own deliveries" ON notification_delivery;
CREATE POLICY "Users can read own deliveries"
  ON notification_delivery FOR SELECT
  USING (EXISTS (SELECT 1 FROM notifications n WHERE n.id = notification_id AND n.user_id = auth.uid()));
