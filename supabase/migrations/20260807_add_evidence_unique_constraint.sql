-- ============================================================
-- Migration: Phase 3 - Add Unique Constraint to Developer Skill Evidence
-- Prevents duplicate evidence rows on account reconnect
-- ============================================================

-- 1. Deduplicate any existing identical evidence entries before applying unique constraint
DELETE FROM public.developer_skill_evidence a
USING public.developer_skill_evidence b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.source = b.source
  AND a.evidence_type = b.evidence_type
  AND COALESCE(a.external_id, '') = COALESCE(b.external_id, '');

-- 2. Add the unique constraint on (user_id, source, evidence_type, external_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_evidence_user_source_external'
  ) THEN
    ALTER TABLE public.developer_skill_evidence
      ADD CONSTRAINT uq_evidence_user_source_external
      UNIQUE (user_id, source, evidence_type, external_id);
  END IF;
END $$;

COMMENT ON CONSTRAINT uq_evidence_user_source_external ON public.developer_skill_evidence
  IS 'Enforces unique evidence entries per user, provider source, type, and external ID.';
