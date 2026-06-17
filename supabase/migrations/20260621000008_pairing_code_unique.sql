-- Add unique constraint on pairing_codes(code) where claimed_at IS NULL
-- This prevents TOCTOU race conditions during code generation
create unique index if not exists idx_pairing_codes_unclaimed_code
  on pairing_codes(code)
  where claimed_at is null;
