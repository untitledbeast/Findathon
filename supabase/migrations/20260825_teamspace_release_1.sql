-- ============================================================
-- Migration: TeamSpace Release 1
-- Tables: teams, team_members, team_invitations
-- Updates: profiles.discoverable_for_teams
-- RPCs: create_team_with_owner, accept_team_invitation
-- ============================================================

-- 1. Add opt-in discoverability setting to profiles (default false)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discoverable_for_teams BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.discoverable_for_teams IS 'Opt-in consent flag allowing Findathon Team Intelligence to suggest profile to developers looking for teammates.';

-- 1b. Ensure hackathons table has min_team_size and max_team_size
ALTER TABLE public.hackathons
  ADD COLUMN IF NOT EXISTS min_team_size INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_team_size INT DEFAULT 4;

-- 2. Create teams table (default private visibility)
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'forming' CHECK (status IN ('forming', 'active', 'locked', 'submitted', 'completed', 'archived')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  max_members INT NOT NULL DEFAULT 4 CHECK (max_members >= 1 AND max_members <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.teams IS 'Hackathon-specific teams for team formation and TeamSpace.';

-- 3. Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'lead', 'member')),
  membership_status TEXT NOT NULL DEFAULT 'active' CHECK (membership_status IN ('active', 'inactive', 'left', 'removed')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_team_members_team_user UNIQUE (team_id, user_id)
);

COMMENT ON TABLE public.team_members IS 'Team membership and role tracking.';

-- 4. Create team_invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  inviter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.team_invitations IS 'Invitations sent by team leads to prospective teammates.';

-- 5. Performance Indexes & Partial Unique Constraints
CREATE INDEX IF NOT EXISTS idx_teams_hackathon_id ON public.teams (hackathon_id);
CREATE INDEX IF NOT EXISTS idx_teams_owner_user_id ON public.teams (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON public.teams (status);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON public.team_members (user_id, membership_status);

CREATE INDEX IF NOT EXISTS idx_team_invitations_team_status ON public.team_invitations (team_id, status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_invitee_status ON public.team_invitations (invitee_user_id, status);

-- Enforce at most one pending invitation per user per team via partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_pending_invite
  ON public.team_invitations (team_id, invitee_user_id)
  WHERE status = 'pending';

-- 6. Atomic Database Function: create_team_with_owner
CREATE OR REPLACE FUNCTION public.create_team_with_owner(
  p_hackathon_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_max_members INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_hackathon RECORD;
  v_existing_team_id UUID;
  v_max_members INT;
  v_new_team RECORD;
BEGIN
  -- Authenticate caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  -- Validate name
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Team name is required' USING ERRCODE = 'P0002';
  END IF;

  -- Check hackathon exists and is approved
  SELECT id, max_team_size, status, end_date INTO v_hackathon
  FROM public.hackathons
  WHERE id = p_hackathon_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hackathon not found' USING ERRCODE = 'P0003';
  END IF;

  IF v_hackathon.status <> 'approved' THEN
    RAISE EXCEPTION 'Hackathon is not active or approved' USING ERRCODE = 'P0004';
  END IF;

  -- Determine effective team capacity
  IF p_max_members IS NOT NULL AND p_max_members >= 1 THEN
    v_max_members := LEAST(p_max_members, COALESCE(v_hackathon.max_team_size, 10));
  ELSE
    v_max_members := COALESCE(v_hackathon.max_team_size, 4);
  END IF;

  -- Verify user has no active team for this hackathon
  SELECT t.id INTO v_existing_team_id
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.user_id = v_user_id
    AND tm.membership_status = 'active'
    AND t.hackathon_id = p_hackathon_id
    AND t.status IN ('forming', 'active', 'locked', 'submitted')
  LIMIT 1;

  IF v_existing_team_id IS NOT NULL THEN
    RAISE EXCEPTION 'You already have an active team for this hackathon' USING ERRCODE = 'P0005';
  END IF;

  -- Create team atomically
  INSERT INTO public.teams (
    hackathon_id,
    owner_user_id,
    name,
    description,
    status,
    visibility,
    max_members
  ) VALUES (
    p_hackathon_id,
    v_user_id,
    trim(p_name),
    p_description,
    'forming',
    'private',
    v_max_members
  ) RETURNING * INTO v_new_team;

  -- Create owner membership atomically
  INSERT INTO public.team_members (
    team_id,
    user_id,
    role,
    membership_status
  ) VALUES (
    v_new_team.id,
    v_user_id,
    'owner',
    'active'
  );

  RETURN to_jsonb(v_new_team);
END;
$$;

-- 7. Atomic Database Function: accept_team_invitation
CREATE OR REPLACE FUNCTION public.accept_team_invitation(
  p_invitation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_invite RECORD;
  v_team RECORD;
  v_active_count INT;
  v_existing_team_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  -- Lock invitation row
  SELECT * INTO v_invite
  FROM public.team_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_invite.invitee_user_id <> v_user_id THEN
    RAISE EXCEPTION 'You are not the recipient of this invitation' USING ERRCODE = 'P0003';
  END IF;

  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation is no longer pending (current: %)', v_invite.status USING ERRCODE = 'P0004';
  END IF;

  IF v_invite.expires_at < NOW() THEN
    UPDATE public.team_invitations SET status = 'expired', updated_at = NOW() WHERE id = p_invitation_id;
    RAISE EXCEPTION 'Invitation has expired' USING ERRCODE = 'P0005';
  END IF;

  -- Lock team row
  SELECT * INTO v_team
  FROM public.teams
  WHERE id = v_invite.team_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated team not found' USING ERRCODE = 'P0006';
  END IF;

  IF v_team.status NOT IN ('forming', 'active') THEN
    RAISE EXCEPTION 'Team is locked or no longer accepting members' USING ERRCODE = 'P0007';
  END IF;

  -- Count active members
  SELECT COUNT(*) INTO v_active_count
  FROM public.team_members
  WHERE team_id = v_team.id AND membership_status = 'active';

  IF v_active_count >= v_team.max_members THEN
    RAISE EXCEPTION 'Team has reached its maximum capacity of % members', v_team.max_members USING ERRCODE = 'P0008';
  END IF;

  -- Verify invitee has no existing active team for this hackathon
  SELECT t.id INTO v_existing_team_id
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.user_id = v_user_id
    AND tm.membership_status = 'active'
    AND t.hackathon_id = v_team.hackathon_id
    AND t.status IN ('forming', 'active', 'locked', 'submitted')
    AND t.id <> v_team.id
  LIMIT 1;

  IF v_existing_team_id IS NOT NULL THEN
    RAISE EXCEPTION 'You are already an active member of another team for this hackathon' USING ERRCODE = 'P0009';
  END IF;

  -- Insert or reactivate membership atomically
  INSERT INTO public.team_members (
    team_id,
    user_id,
    role,
    membership_status,
    joined_at,
    updated_at
  ) VALUES (
    v_team.id,
    v_user_id,
    'member',
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (team_id, user_id) DO UPDATE SET
    membership_status = 'active',
    updated_at = NOW();

  -- Update invitation status
  UPDATE public.team_invitations
  SET status = 'accepted',
      responded_at = NOW(),
      updated_at = NOW()
  WHERE id = p_invitation_id;

  RETURN jsonb_build_object(
    'team_id', v_team.id,
    'user_id', v_user_id,
    'status', 'accepted',
    'member_count', v_active_count + 1
  );
END;
$$;

-- 8. Row Level Security (RLS)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Clean existing policies if rerun
DROP POLICY IF EXISTS "Members and owners can read teams" ON public.teams;
DROP POLICY IF EXISTS "Owners can update own teams" ON public.teams;
DROP POLICY IF EXISTS "Owners can delete own teams" ON public.teams;

DROP POLICY IF EXISTS "Team members can view team membership" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and leads can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Users can leave teams" ON public.team_members;

DROP POLICY IF EXISTS "Users can read relevant invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Team leads can create invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Invitees and inviters can update invitations" ON public.team_invitations;

-- RLS: Teams
CREATE POLICY "Members and owners can read teams" ON public.teams
  FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = teams.id AND user_id = auth.uid() AND membership_status = 'active'
    )
  );

CREATE POLICY "Owners can update own teams" ON public.teams
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners can delete own teams" ON public.teams
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

-- RLS: Team Members
CREATE POLICY "Team members can view team membership" ON public.team_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members m
      WHERE m.team_id = team_members.team_id AND m.user_id = auth.uid() AND m.membership_status = 'active'
    )
  );

CREATE POLICY "Users can leave teams" ON public.team_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS: Team Invitations
CREATE POLICY "Users can read relevant invitations" ON public.team_invitations
  FOR SELECT TO authenticated
  USING (
    inviter_user_id = auth.uid()
    OR invitee_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_invitations.team_id AND owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Team leads can create invitations" ON public.team_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    inviter_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_invitations.team_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'lead')
        AND membership_status = 'active'
    )
  );

CREATE POLICY "Invitees and inviters can update invitations" ON public.team_invitations
  FOR UPDATE TO authenticated
  USING (
    invitee_user_id = auth.uid()
    OR inviter_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_invitations.team_id AND owner_user_id = auth.uid()
    )
  );

-- Reload PostgREST schema
NOTIFY pgrst, 'reload schema';
