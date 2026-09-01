-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  hackathon_id UUID REFERENCES hackathons(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  max_members INT DEFAULT 4,
  status TEXT DEFAULT 'forming'
    CHECK (status IN ('forming','full','active','completed','disbanded')),
  required_skills TEXT[] DEFAULT '{}',
  is_open BOOLEAN DEFAULT TRUE,
  avatar_color TEXT DEFAULT '7C3AED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member'
    CHECK (role IN ('owner','member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Team invitations
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','cancelled')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, invited_user_id)
);

-- Developer discoverability (opt-in)
CREATE TABLE IF NOT EXISTS developer_visibility (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  is_discoverable BOOLEAN DEFAULT TRUE,
  looking_for_team BOOLEAN DEFAULT TRUE,
  preferred_roles TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Developer connections (follow/connect system)
CREATE TABLE IF NOT EXISTS developer_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_connections ENABLE ROW LEVEL SECURITY;

-- Teams: public read, own write
CREATE POLICY "read_teams" ON teams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "create_team" ON teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "owner_update_team" ON teams FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);
CREATE POLICY "owner_delete_team" ON teams FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Team members
CREATE POLICY "read_members" ON team_members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "join_team" ON team_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leave_team" ON team_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Invitations: invited user or sender can see
CREATE POLICY "read_own_invitations" ON team_invitations FOR SELECT TO authenticated
  USING (auth.uid() = invited_user_id OR auth.uid() = invited_by);
CREATE POLICY "send_invitation" ON team_invitations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = invited_by);
CREATE POLICY "respond_invitation" ON team_invitations FOR UPDATE TO authenticated
  USING (auth.uid() = invited_user_id OR auth.uid() = invited_by);

-- Visibility
CREATE POLICY "own_visibility" ON developer_visibility FOR ALL TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "public_read_visibility" ON developer_visibility FOR SELECT TO anon, authenticated
  USING (true);

-- Connections
CREATE POLICY "own_connections" ON developer_connections FOR ALL TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Auto-insert visibility row on profile creation
CREATE OR REPLACE FUNCTION create_developer_visibility()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO developer_visibility (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_developer_visibility();

-- Backfill visibility for existing users
INSERT INTO developer_visibility (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;
