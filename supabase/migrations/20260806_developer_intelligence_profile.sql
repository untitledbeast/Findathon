-- ============================================================
-- Migration: Developer Intelligence Profile & External Accounts
-- Tables: developer_profiles, developer_skill_evidence, developer_external_accounts
-- ============================================================

-- 1. Create developer_profiles table
CREATE TABLE IF NOT EXISTS public.developer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  top_languages JSONB NOT NULL DEFAULT '{}'::jsonb,
  top_skills JSONB NOT NULL DEFAULT '{}'::jsonb,
  interests TEXT[] NOT NULL DEFAULT '{}'::text[],
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  github_connected BOOLEAN NOT NULL DEFAULT FALSE,
  leetcode_connected BOOLEAN NOT NULL DEFAULT FALSE,
  linkedin_connected BOOLEAN NOT NULL DEFAULT FALSE,
  last_computed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.developer_profiles IS 'Aggregated developer intelligence, skills, and experience level per user.';

-- 2. Create developer_skill_evidence table
CREATE TABLE IF NOT EXISTS public.developer_skill_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('github', 'leetcode', 'findathon')),
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('repo', 'submission', 'project', 'activity')),
  external_id TEXT,
  url TEXT,
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  weight NUMERIC NOT NULL DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_evidence_user_source_external UNIQUE (user_id, source, evidence_type, external_id)
);

COMMENT ON TABLE public.developer_skill_evidence IS 'Granular signals extracted from external developer accounts and hackathon submissions.';

-- 3. Create developer_external_accounts table
CREATE TABLE IF NOT EXISTS public.developer_external_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('github', 'leetcode', 'linkedin')),
  provider_user_id TEXT,
  access_token_encrypted TEXT,   -- Application-layer AES-256-GCM encrypted
  refresh_token_encrypted TEXT,  -- Application-layer AES-256-GCM encrypted
  scopes TEXT[] DEFAULT '{}'::text[],
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'error')),
  UNIQUE (user_id, provider)
);

COMMENT ON TABLE public.developer_external_accounts IS 'Connected third-party developer accounts with encrypted OAuth tokens.';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dev_profiles_user_id ON public.developer_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_dev_evidence_user_id ON public.developer_skill_evidence (user_id);
CREATE INDEX IF NOT EXISTS idx_dev_evidence_source ON public.developer_skill_evidence (user_id, source);
CREATE INDEX IF NOT EXISTS idx_dev_ext_accounts_user_provider ON public.developer_external_accounts (user_id, provider);

-- 4. Enable Row-Level Security (RLS)
ALTER TABLE public.developer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_skill_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_external_accounts ENABLE ROW LEVEL SECURITY;

-- Clean existing policies if rerun
DROP POLICY IF EXISTS "Users can read own developer profile" ON public.developer_profiles;
DROP POLICY IF EXISTS "Users can insert own developer profile" ON public.developer_profiles;
DROP POLICY IF EXISTS "Users can update own developer profile" ON public.developer_profiles;

DROP POLICY IF EXISTS "Users can read own skill evidence" ON public.developer_skill_evidence;
DROP POLICY IF EXISTS "Users can insert own skill evidence" ON public.developer_skill_evidence;
DROP POLICY IF EXISTS "Users can update own skill evidence" ON public.developer_skill_evidence;
DROP POLICY IF EXISTS "Users can delete own skill evidence" ON public.developer_skill_evidence;

DROP POLICY IF EXISTS "Users can read own external accounts" ON public.developer_external_accounts;
DROP POLICY IF EXISTS "Users can insert own external accounts" ON public.developer_external_accounts;
DROP POLICY IF EXISTS "Users can update own external accounts" ON public.developer_external_accounts;
DROP POLICY IF EXISTS "Users can delete own external accounts" ON public.developer_external_accounts;

-- 5. RLS Policies: developer_profiles
CREATE POLICY "Users can read own developer profile" ON public.developer_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert own developer profile" ON public.developer_profiles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update own developer profile" ON public.developer_profiles
  FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 6. RLS Policies: developer_skill_evidence
CREATE POLICY "Users can read own skill evidence" ON public.developer_skill_evidence
  FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert own skill evidence" ON public.developer_skill_evidence
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update own skill evidence" ON public.developer_skill_evidence
  FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete own skill evidence" ON public.developer_skill_evidence
  FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 7. RLS Policies: developer_external_accounts
CREATE POLICY "Users can read own external accounts" ON public.developer_external_accounts
  FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert own external accounts" ON public.developer_external_accounts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update own external accounts" ON public.developer_external_accounts
  FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete own external accounts" ON public.developer_external_accounts
  FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 8. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
