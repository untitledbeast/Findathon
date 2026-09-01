-- ============================================================
-- FINDATHON — TEAMSPACE CONSOLIDATED REPAIR MIGRATION
-- Releases 1, 2, and 3
-- Tables: teams, team_members, team_invitations, connections, user_blocks, team_projects, team_tasks
-- Columns: profiles.discoverable_for_teams, hackathons.min_team_size, hackathons.max_team_size
-- RPCs: create_team_with_owner, accept_team_invitation, transfer_team_ownership, leave_team_with_succession
-- Indexes, Constraints, and Row Level Security (RLS)
-- ============================================================

-- ------------------------------------------------------------
-- 1. BASE PROFILE & HACKATHON EXTENSIONS
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discoverable_for_teams BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.discoverable_for_teams IS 'Opt-in consent flag allowing Findathon Team Intelligence to suggest profile to developers looking for teammates.';

ALTER TABLE public.hackathons
  ADD COLUMN IF NOT EXISTS min_team_size INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_team_size INT DEFAULT 4;

-- ------------------------------------------------------------
-- 2. TEAMS TABLE
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 3. TEAM MEMBERS TABLE
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 4. TEAM INVITATIONS TABLE
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 5. SOCIAL CONNECTIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_low_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_high_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  initiator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  CONSTRAINT chk_canonical_user_order CHECK (user_low_id < user_high_id),
  CONSTRAINT chk_initiator_is_participant CHECK (initiator_user_id = user_low_id OR initiator_user_id = user_high_id),
  CONSTRAINT uq_connections_canonical_pair UNIQUE (user_low_id, user_high_id)
);

COMMENT ON TABLE public.connections IS 'User-to-user social connections with canonical user_low_id/user_high_id ordering.';

-- ------------------------------------------------------------
-- 6. USER BLOCKS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_no_self_block CHECK (blocker_user_id <> blocked_user_id),
  CONSTRAINT uq_user_blocks UNIQUE (blocker_user_id, blocked_user_id)
);

COMMENT ON TABLE public.user_blocks IS 'Unidirectional access-control barrier between users for privacy and abuse prevention.';

-- ------------------------------------------------------------
-- 7. TEAM PROJECTS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT,
  problem_statement TEXT,
  solution_approach TEXT,
  tech_stack TEXT[] NOT NULL DEFAULT '{}',
  repository_url TEXT,
  demo_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_team_projects_team UNIQUE (team_id)
);

COMMENT ON TABLE public.team_projects IS 'Hackathon project workspace holding project context, problem definition, solution approach, and repository URLs for a team.';

-- ------------------------------------------------------------
-- 8. TEAM TASKS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.team_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT chk_task_status CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
  CONSTRAINT chk_task_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

COMMENT ON TABLE public.team_tasks IS 'Task execution items assigned to active team members within a team project.';

-- ------------------------------------------------------------
-- 9. PERFORMANCE INDEXES & CONSTRAINTS
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_teams_hackathon_id ON public.teams (hackathon_id);
CREATE INDEX IF NOT EXISTS idx_teams_owner_user_id ON public.teams (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON public.teams (status);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON public.team_members (user_id, membership_status);

CREATE INDEX IF NOT EXISTS idx_team_invitations_team_status ON public.team_invitations (team_id, status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_invitee_status ON public.team_invitations (invitee_user_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_pending_invite
  ON public.team_invitations (team_id, invitee_user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_connections_user_low_status ON public.connections (user_low_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_user_high_status ON public.connections (user_high_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_initiator_status ON public.connections (initiator_user_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_updated_at ON public.connections (updated_at);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks (blocker_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks (blocked_user_id);

CREATE INDEX IF NOT EXISTS idx_team_projects_team_id ON public.team_projects (team_id);
CREATE INDEX IF NOT EXISTS idx_team_projects_created_by ON public.team_projects (created_by);

CREATE INDEX IF NOT EXISTS idx_team_tasks_team_status ON public.team_tasks (team_id, status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_tasks_project_status ON public.team_tasks (project_id, status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_tasks_assigned_to ON public.team_tasks (assigned_to) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_tasks_due_at ON public.team_tasks (due_at) WHERE due_at IS NOT NULL AND archived_at IS NULL;

-- ------------------------------------------------------------
-- 10. RPC: create_team_with_owner
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 11. RPC: accept_team_invitation
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 12. RPC: transfer_team_ownership
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_team_ownership(
  p_team_id UUID,
  p_new_owner_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_team RECORD;
  v_new_owner RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  IF v_user_id = p_new_owner_user_id THEN
    RAISE EXCEPTION 'You are already the owner of this team' USING ERRCODE = 'P0002';
  END IF;

  -- Lock team row
  SELECT * INTO v_team
  FROM public.teams
  WHERE id = p_team_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team not found' USING ERRCODE = 'P0003';
  END IF;

  IF v_team.owner_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Only the current team owner can transfer ownership' USING ERRCODE = 'P0004';
  END IF;

  IF v_team.status IN ('archived', 'completed') THEN
    RAISE EXCEPTION 'Cannot transfer ownership of an % team', v_team.status USING ERRCODE = 'P0005';
  END IF;

  -- Verify target user is active team member
  SELECT * INTO v_new_owner
  FROM public.team_members
  WHERE team_id = p_team_id
    AND user_id = p_new_owner_user_id
    AND membership_status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user must be an active member of the team' USING ERRCODE = 'P0006';
  END IF;

  -- 1. Update team owner_user_id
  UPDATE public.teams
  SET owner_user_id = p_new_owner_user_id,
      updated_at = NOW()
  WHERE id = p_team_id;

  -- 2. Downgrade previous owner to member
  UPDATE public.team_members
  SET role = 'member',
      updated_at = NOW()
  WHERE team_id = p_team_id AND user_id = v_user_id;

  -- 3. Upgrade new owner to owner role
  UPDATE public.team_members
  SET role = 'owner',
      updated_at = NOW()
  WHERE team_id = p_team_id AND user_id = p_new_owner_user_id;

  RETURN jsonb_build_object(
    'team_id', p_team_id,
    'previous_owner_id', v_user_id,
    'new_owner_id', p_new_owner_user_id,
    'status', 'transferred'
  );
END;
$$;

-- ------------------------------------------------------------
-- 13. RPC: leave_team_with_succession
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leave_team_with_succession(
  p_team_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_team RECORD;
  v_member RECORD;
  v_active_members_count INT;
  v_successor RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  -- Lock team row
  SELECT * INTO v_team
  FROM public.teams
  WHERE id = p_team_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team not found' USING ERRCODE = 'P0002';
  END IF;

  -- Lock member row
  SELECT * INTO v_member
  FROM public.team_members
  WHERE team_id = p_team_id AND user_id = v_user_id AND membership_status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not an active member of this team' USING ERRCODE = 'P0003';
  END IF;

  IF v_team.status IN ('locked', 'submitted') THEN
    RAISE EXCEPTION 'Cannot leave a team that is %', v_team.status USING ERRCODE = 'P0004';
  END IF;

  -- Count remaining active members
  SELECT COUNT(*) INTO v_active_members_count
  FROM public.team_members
  WHERE team_id = p_team_id AND membership_status = 'active';

  -- Case 1: Member is not owner -> regular departure
  IF v_team.owner_user_id <> v_user_id THEN
    UPDATE public.team_members
    SET membership_status = 'left',
        updated_at = NOW()
    WHERE team_id = p_team_id AND user_id = v_user_id;

    RETURN jsonb_build_object(
      'team_id', p_team_id,
      'user_id', v_user_id,
      'action', 'left',
      'team_status', v_team.status
    );
  END IF;

  -- Case 2: Member is owner and is the LAST member -> archive team
  IF v_active_members_count <= 1 THEN
    UPDATE public.team_members
    SET membership_status = 'left',
        updated_at = NOW()
    WHERE team_id = p_team_id AND user_id = v_user_id;

    UPDATE public.teams
    SET status = 'archived',
        updated_at = NOW()
    WHERE id = p_team_id;

    RETURN jsonb_build_object(
      'team_id', p_team_id,
      'user_id', v_user_id,
      'action', 'left_and_archived',
      'team_status', 'archived'
    );
  END IF;

  -- Case 3: Member is owner and other active members exist -> deterministic succession
  SELECT * INTO v_successor
  FROM public.team_members
  WHERE team_id = p_team_id
    AND user_id <> v_user_id
    AND membership_status = 'active'
    AND role = 'lead'
  ORDER BY joined_at ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT * INTO v_successor
    FROM public.team_members
    WHERE team_id = p_team_id
      AND user_id <> v_user_id
      AND membership_status = 'active'
    ORDER BY joined_at ASC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No eligible successor found' USING ERRCODE = 'P0005';
  END IF;

  -- Transfer ownership to successor
  UPDATE public.teams
  SET owner_user_id = v_successor.user_id,
      updated_at = NOW()
  WHERE id = p_team_id;

  UPDATE public.team_members
  SET role = 'owner',
      updated_at = NOW()
  WHERE team_id = p_team_id AND user_id = v_successor.user_id;

  -- Mark departing owner as 'left'
  UPDATE public.team_members
  SET membership_status = 'left',
      updated_at = NOW()
  WHERE team_id = p_team_id AND user_id = v_user_id;

  RETURN jsonb_build_object(
    'team_id', p_team_id,
    'user_id', v_user_id,
    'action', 'left_with_succession',
    'new_owner_id', v_successor.user_id,
    'team_status', v_team.status
  );
END;
$$;

-- ------------------------------------------------------------
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Users can read own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can create connection requests" ON public.connections;
DROP POLICY IF EXISTS "Users can update own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON public.connections;

DROP POLICY IF EXISTS "Users can read own blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users can create own blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users can delete own blocks" ON public.user_blocks;

DROP POLICY IF EXISTS "Active team members can read team project" ON public.team_projects;
DROP POLICY IF EXISTS "Active team members can create team project" ON public.team_projects;
DROP POLICY IF EXISTS "Team owners and leads can update team project" ON public.team_projects;
DROP POLICY IF EXISTS "Team owners can delete team project" ON public.team_projects;

DROP POLICY IF EXISTS "Active team members can read team tasks" ON public.team_tasks;
DROP POLICY IF EXISTS "Active team members can create team tasks" ON public.team_tasks;
DROP POLICY IF EXISTS "Active team members can update team tasks" ON public.team_tasks;
DROP POLICY IF EXISTS "Team owners and leads can delete team tasks" ON public.team_tasks;

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

-- RLS: Connections
CREATE POLICY "Users can read own connections" ON public.connections
  FOR SELECT TO authenticated
  USING (auth.uid() = user_low_id OR auth.uid() = user_high_id);

CREATE POLICY "Users can create connection requests" ON public.connections
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = initiator_user_id
    AND (auth.uid() = user_low_id OR auth.uid() = user_high_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks
      WHERE (blocker_user_id = user_low_id AND blocked_user_id = user_high_id)
         OR (blocker_user_id = user_high_id AND blocked_user_id = user_low_id)
    )
  );

CREATE POLICY "Users can update own connections" ON public.connections
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_low_id OR auth.uid() = user_high_id)
  WITH CHECK (auth.uid() = user_low_id OR auth.uid() = user_high_id);

CREATE POLICY "Users can delete own connections" ON public.connections
  FOR DELETE TO authenticated
  USING (auth.uid() = user_low_id OR auth.uid() = user_high_id);

-- RLS: User Blocks
CREATE POLICY "Users can read own blocks" ON public.user_blocks
  FOR SELECT TO authenticated
  USING (auth.uid() = blocker_user_id);

CREATE POLICY "Users can create own blocks" ON public.user_blocks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_user_id);

CREATE POLICY "Users can delete own blocks" ON public.user_blocks
  FOR DELETE TO authenticated
  USING (auth.uid() = blocker_user_id);

-- RLS: Team Projects
CREATE POLICY "Active team members can read team project" ON public.team_projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_projects.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.membership_status = 'active'
    )
  );

CREATE POLICY "Active team members can create team project" ON public.team_projects
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_projects.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.membership_status = 'active'
    )
  );

CREATE POLICY "Team owners and leads can update team project" ON public.team_projects
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_projects.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'lead')
        AND team_members.membership_status = 'active'
    )
  );

CREATE POLICY "Team owners can delete team project" ON public.team_projects
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_projects.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'owner'
        AND team_members.membership_status = 'active'
    )
  );

-- RLS: Team Tasks
CREATE POLICY "Active team members can read team tasks" ON public.team_tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_tasks.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.membership_status = 'active'
    )
  );

CREATE POLICY "Active team members can create team tasks" ON public.team_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_tasks.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.membership_status = 'active'
    )
  );

CREATE POLICY "Active team members can update team tasks" ON public.team_tasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_tasks.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.membership_status = 'active'
    )
  );

CREATE POLICY "Team owners and leads can delete team tasks" ON public.team_tasks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_tasks.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'lead')
        AND team_members.membership_status = 'active'
    )
  );

-- ------------------------------------------------------------
-- 15. POSTGREST SCHEMA RELOAD
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
