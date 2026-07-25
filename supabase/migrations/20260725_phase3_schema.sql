-- Phase 3 Supabase Database Migration

-- 1. Add missing columns to hackathons
ALTER TABLE hackathons
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS save_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prize_pool TEXT,
  ADD COLUMN IF NOT EXISTS registration_fee TEXT,
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'offline'
    CHECK (mode IN ('online', 'offline', 'hybrid')),
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'open'
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'open')),
  ADD COLUMN IF NOT EXISTS has_certificate BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_hiring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Add role to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
    CHECK (role IN ('user', 'organizer', 'moderator', 'admin'));

-- 3. Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  organization_quality INT CHECK (organization_quality BETWEEN 1 AND 5),
  prize_transparency INT CHECK (prize_transparency BETWEEN 1 AND 5),
  mentorship INT CHECK (mentorship BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hackathon_id, user_id)
);

-- 4. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL,
  user_id UUID,
  hackathon_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Full-text search vector index and trigger
CREATE INDEX IF NOT EXISTS hackathons_search_idx
  ON hackathons USING gin(search_vector);

UPDATE hackathons SET search_vector =
  to_tsvector('english',
    coalesce(title, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(location_city, '') || ' ' ||
    coalesce(location_college, '') || ' ' ||
    coalesce(organizer, '') || ' ' ||
    coalesce(array_to_string(tags, ' '), '')
  );

CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.location_city, '') || ' ' ||
    coalesce(NEW.location_college, '') || ' ' ||
    coalesce(NEW.organizer, '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '')
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hackathons_search_vector_update ON hackathons;
CREATE TRIGGER hackathons_search_vector_update
  BEFORE INSERT OR UPDATE ON hackathons
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- 7. View count RPC
CREATE OR REPLACE FUNCTION increment_view_count(hackathon_id UUID)
RETURNS VOID AS $$
  UPDATE hackathons SET view_count = view_count + 1
  WHERE id = hackathon_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- 8. Row Level Security (RLS) policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reviews" ON reviews;
CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Auth users create reviews" ON reviews;
CREATE POLICY "Auth users create reviews"
  ON reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own reviews" ON reviews;
CREATE POLICY "Users manage own reviews"
  ON reviews FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- 9. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE hackathons;
