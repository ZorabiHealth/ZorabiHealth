ALTER TABLE public.daily_steps
  DROP CONSTRAINT IF EXISTS daily_steps_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS daily_steps_user_id_date_key
  ON public.daily_steps (user_id, date);
