-- ============================================================
-- Migration: LinkedIn OIDC Integration & Evidence Hardening
-- Tables: developer_skill_evidence, developer_external_accounts
-- ============================================================

-- 1. Update developer_skill_evidence constraints to support linkedin and identity_profile
DO $$
BEGIN
  -- Drop existing check constraints if they exist
  ALTER TABLE public.developer_skill_evidence
    DROP CONSTRAINT IF EXISTS developer_skill_evidence_source_check,
    DROP CONSTRAINT IF EXISTS developer_skill_evidence_evidence_type_check;

  -- Add updated check constraints preserving all existing sources & types
  ALTER TABLE public.developer_skill_evidence
    ADD CONSTRAINT developer_skill_evidence_source_check
      CHECK (source IN ('github', 'leetcode', 'linkedin', 'findathon')),
    ADD CONSTRAINT developer_skill_evidence_evidence_type_check
      CHECK (evidence_type IN ('repo', 'submission', 'project', 'activity', 'identity_profile'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint update skipped or already applied: %', SQLERRM;
END $$;

-- 2. Add partial unique index for LinkedIn accounts (Enforcing 1:1 LinkedIn sub to Findathon account without breaking legacy providers)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dev_ext_accounts_linkedin_user_id
  ON public.developer_external_accounts (provider, provider_user_id)
  WHERE provider = 'linkedin' AND provider_user_id IS NOT NULL;

-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
