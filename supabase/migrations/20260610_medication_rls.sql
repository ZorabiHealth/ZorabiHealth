-- ZorabiHealth Medication RLS Policies
-- Run this in your Supabase SQL Editor to enable mobile app access

-- 1. Medications table
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

-- 2. Medication Logs table
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
