-- =============================================================
-- Phase 4: Unified Notification Pipeline
-- Auto-create notifications from medication_logs events
-- Enables Realtime broadcast of medication alarms as notifications
-- =============================================================

-- 1. Function: create notification when a medication alarm fires
CREATE OR REPLACE FUNCTION handle_medication_alarm()
RETURNS trigger AS $$
BEGIN
  -- Only create a notification when a medication_log is inserted
  -- with status 'pending' (alarm just fired) or 'missed' (escalation)
  IF TG_OP = 'INSERT' AND NEW.status IN ('pending', 'missed') THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      body,
      data,
      category,
      priority,
      created_at
    ) VALUES (
      (SELECT user_id FROM public.medications WHERE id = NEW.medication_id),
      'Medication Reminder',
      'Time to take ' || NEW.medication_name || ' (' || NEW.dose || ')',
      jsonb_build_object(
        'medication_id', NEW.medication_id,
        'medication_log_id', NEW.id,
        'scheduled_at', NEW.scheduled_at,
        'category', 'medication'
      ),
      'medication',
      'high',
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger: fire on medication_logs insert
DROP TRIGGER IF EXISTS trg_medication_alarm_notification ON public.medication_logs;
CREATE TRIGGER trg_medication_alarm_notification
  AFTER INSERT ON public.medication_logs
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'missed'))
  EXECUTE FUNCTION handle_medication_alarm();

-- 3. Function: create notification when a vital alert threshold is crossed
-- (placeholder for future vitals integration)
CREATE OR REPLACE FUNCTION handle_vital_alert()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    body,
    data,
    category,
    priority,
    created_at
  ) VALUES (
    NEW.user_id,
    'Vital Alert',
    'Your vitals require attention. Please check the dashboard.',
    jsonb_build_object(
      'vital_type', TG_TABLE_NAME,
      'record_id', NEW.id,
      'category', 'vital'
    ),
    'vital',
    'high',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable Realtime for notifications table (if not already)
-- This allows the Realtime subscriptions in Phase 2 to work
ALTER PUBLICATION supabase_realtime ADD ONLY TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD ONLY TABLE public.medication_logs;
ALTER PUBLICATION supabase_realtime ADD ONLY TABLE public.medications;
ALTER PUBLICATION supabase_realtime ADD ONLY TABLE public.notification_devices;

-- 5. Index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
