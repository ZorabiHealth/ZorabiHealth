-- ZorabiHealth: User Pairings Table
-- Clean Supabase-only linkage between web and mobile accounts.
-- No FCM/push notification dependencies.

CREATE TABLE IF NOT EXISTS user_pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  web_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mobile_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL DEFAULT 'Mobile Device',
  paired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT uq_pairing UNIQUE (web_user_id, mobile_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_pairings_web_user ON user_pairings(web_user_id);
CREATE INDEX IF NOT EXISTS idx_user_pairings_mobile_user ON user_pairings(mobile_user_id);

ALTER TABLE user_pairings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_pairings'
      AND policyname = 'Users can read own pairings as web user'
  ) THEN
    CREATE POLICY "Users can read own pairings as web user"
      ON user_pairings FOR SELECT
      USING (auth.uid() = web_user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_pairings'
      AND policyname = 'Users can read own pairings as mobile user'
  ) THEN
    CREATE POLICY "Users can read own pairings as mobile user"
      ON user_pairings FOR SELECT
      USING (auth.uid() = mobile_user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_pairings'
      AND policyname = 'Service role can insert pairings'
  ) THEN
    CREATE POLICY "Service role can insert pairings"
      ON user_pairings FOR INSERT
      WITH CHECK (false);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_pairings'
      AND policyname = 'Service role can update pairings'
  ) THEN
    CREATE POLICY "Service role can update pairings"
      ON user_pairings FOR UPDATE
      USING (false);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_pairings'
      AND policyname = 'Service role can delete pairings'
  ) THEN
    CREATE POLICY "Service role can delete pairings"
      ON user_pairings FOR DELETE
      USING (false);
  END IF;
END
$$;

-- Enable Realtime for live UI updates on the web dashboard
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_pairings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.user_pairings;
  END IF;
END
$$;
