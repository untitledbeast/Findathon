-- ============================================================
-- Migration: Add LinkedIn as a valid evidence source and profile evidence type
-- Tables: developer_skill_evidence
-- ============================================================

-- 1. Update source check constraint on developer_skill_evidence
DO $$
BEGIN
  -- Drop existing source check constraint if present
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'developer_skill_evidence_source_check'
  ) THEN
    ALTER TABLE public.developer_skill_evidence
      DROP CONSTRAINT developer_skill_evidence_source_check;
  END IF;

  -- Add updated check constraint including 'linkedin'
  ALTER TABLE public.developer_skill_evidence
    ADD CONSTRAINT developer_skill_evidence_source_check
    CHECK (source IN ('github', 'leetcode', 'findathon', 'linkedin'));
END $$;

-- 2. Update evidence_type check constraint to include 'profile'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'developer_skill_evidence_evidence_type_check'
  ) THEN
    ALTER TABLE public.developer_skill_evidence
      DROP CONSTRAINT developer_skill_evidence_evidence_type_check;
  END IF;

  ALTER TABLE public.developer_skill_evidence
    ADD CONSTRAINT developer_skill_evidence_evidence_type_check
    CHECK (evidence_type IN ('repo', 'submission', 'project', 'activity', 'profile'));
END $$;

-- 3. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
