-- =============================================================
-- ZorabiHealth: Pairing System + RLS Policies for all tables
-- Run this in your Supabase SQL Editor
-- =============================================================

-- 1. Pairing Codes Table (short-lived, one-time use)
CREATE TABLE IF NOT EXISTS pairing_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  claimed_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_pairing_codes_code ON pairing_codes(code);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_user ON pairing_codes(user_id);

ALTER TABLE pairing_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can access pairing_codes"
  ON pairing_codes
  USING (false);

-- 2. RLS for medications (mobile app reads/writes via anon key)
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own medications"
  ON medications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own medications"
  ON medications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medications"
  ON medications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own medications"
  ON medications FOR DELETE
  USING (auth.uid() = user_id);

-- 3. RLS for medication_logs
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own medication logs"
  ON medication_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM medications m
      WHERE m.id = medication_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert logs for own medications"
  ON medication_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM medications m
      WHERE m.id = medication_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own medication logs"
  ON medication_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM medications m
      WHERE m.id = medication_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own medication logs"
  ON medication_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM medications m
      WHERE m.id = medication_id AND m.user_id = auth.uid()
    )
  );

-- 4. RLS for vendors (public read for medication refills)
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read vendors"
  ON vendors FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert/update/delete vendors"
  ON vendors FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only service role can update vendors"
  ON vendors FOR UPDATE
  USING (false);

CREATE POLICY "Only service role can delete vendors"
  ON vendors FOR DELETE
  USING (false);

-- 5. RLS for refill_orders
ALTER TABLE refill_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own refill orders"
  ON refill_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own refill orders"
  ON refill_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. RLS for refill_order_events (via parent order)
ALTER TABLE refill_order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read events for own orders"
  ON refill_order_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM refill_orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

-- 7. RLS for voice_messages
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own voice messages"
  ON voice_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice messages"
  ON voice_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);
