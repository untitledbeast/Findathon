-- ============================================================
-- Migration: TeamSpace Connections, Blocks & Ownership Succession
-- Tables: connections, user_blocks
-- RPCs: leave_team_with_succession, transfer_team_ownership
-- ============================================================

-- 1. Create connections table (canonical pair model)
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

-- 2. Create user_blocks table (unidirectional block barrier)
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_no_self_block CHECK (blocker_user_id <> blocked_user_id),
  CONSTRAINT uq_user_blocks UNIQUE (blocker_user_id, blocked_user_id)
);

COMMENT ON TABLE public.user_blocks IS 'Unidirectional access-control barrier between users for privacy and abuse prevention.';

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_connections_user_low_status ON public.connections (user_low_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_user_high_status ON public.connections (user_high_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_initiator_status ON public.connections (initiator_user_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_updated_at ON public.connections (updated_at);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks (blocker_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks (blocked_user_id);

-- 4. Enable Row-Level Security
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Clean existing policies if rerun
DROP POLICY IF EXISTS "Users can read own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can create connection requests" ON public.connections;
DROP POLICY IF EXISTS "Users can update own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON public.connections;

DROP POLICY IF EXISTS "Users can read own blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users can create own blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users can delete own blocks" ON public.user_blocks;

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

-- 5. Atomic RPC: transfer_team_ownership
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

  -- 2. Downgrade previous owner to member (or preserve lead if needed)
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

-- 6. Atomic RPC: leave_team_with_succession
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
  v_action TEXT;
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

  -- Disallow leaving locked or submitted teams without explicit admin/organizer intervention
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
  -- 3a. Search for active 'lead'
  SELECT * INTO v_successor
  FROM public.team_members
  WHERE team_id = p_team_id
    AND user_id <> v_user_id
    AND membership_status = 'active'
    AND role = 'lead'
  ORDER BY joined_at ASC
  LIMIT 1
  FOR UPDATE;

  -- 3b. If no lead, choose earliest joined active member
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

-- Reload schema
NOTIFY pgrst, 'reload schema';
