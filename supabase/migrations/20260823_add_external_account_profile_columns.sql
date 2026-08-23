-- Migration: Add name, email, profile_picture columns to developer_external_accounts
-- These columns store LinkedIn (and future provider) profile metadata.
-- Tokens remain encrypted; these fields hold non-secret display data.

ALTER TABLE public.developer_external_accounts
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Ensure unique constraint exists for (user_id, provider)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_user_provider'
  ) THEN
    ALTER TABLE public.developer_external_accounts
      ADD CONSTRAINT unique_user_provider UNIQUE (user_id, provider);
  END IF;
END $$;
