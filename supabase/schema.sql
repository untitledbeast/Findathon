-- =====================================================================
-- FINDATHON — ENTERPRISE DATABASE MIGRATION SCRIPT
-- Enable PostGIS, Spatial Indexes, Lifecycle States, Universities & Organizers
-- =====================================================================

-- 1. Enable PostGIS Extension for spatial operations
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add spatial metadata & lifecycle columns to hackathons table
ALTER TABLE hackathons 
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS geo_point GEOGRAPHY(POINT, 4326),
  ADD COLUMN IF NOT EXISTS geohash TEXT,
  ADD COLUMN IF NOT EXISTS plus_code TEXT,
  ADD COLUMN IF NOT EXISTS place_id TEXT,
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS prize_pool TEXT,
  ADD COLUMN IF NOT EXISTS prize_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'open'
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'open')),
  ADD COLUMN IF NOT EXISTS participant_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lifecycle_state TEXT DEFAULT 'published'
    CHECK (lifecycle_state IN ('draft', 'submitted', 'pending_review', 'verified', 'published', 'registration_closed', 'event_running', 'completed', 'archived')),
  ADD COLUMN IF NOT EXISTS base_score NUMERIC DEFAULT 50.0,
  ADD COLUMN IF NOT EXISTS registration_deadline DATE,
  ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3, 2) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS save_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS university_id UUID,
  ADD COLUMN IF NOT EXISTS organizer_id UUID,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. Trigger to auto-update geo_point when latitude/longitude change
CREATE OR REPLACE FUNCTION update_geo_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geo_point = ST_SetSRID(
      ST_MakePoint(NEW.longitude, NEW.latitude), 
      4326
    )::GEOGRAPHY;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_geo_point ON hackathons;
CREATE TRIGGER sync_geo_point
  BEFORE INSERT OR UPDATE ON hackathons
  FOR EACH ROW EXECUTE FUNCTION update_geo_point();

-- 4. Spatial & B-Tree / GIN Indexes
CREATE INDEX IF NOT EXISTS hackathons_geo_idx ON hackathons USING GIST(geo_point);
CREATE INDEX IF NOT EXISTS hackathons_lifecycle_idx ON hackathons(lifecycle_state);
CREATE INDEX IF NOT EXISTS hackathons_deadline_idx ON hackathons(registration_deadline);
CREATE INDEX IF NOT EXISTS hackathons_featured_idx ON hackathons(is_featured);
CREATE INDEX IF NOT EXISTS hackathons_verified_idx ON hackathons(is_verified);
CREATE INDEX IF NOT EXISTS hackathons_tags_idx ON hackathons USING GIN(tags);
CREATE INDEX IF NOT EXISTS hackathons_title_trgm_idx ON hackathons USING GIN(title gin_trgm_ops);

-- 5. Universities Table
CREATE TABLE IF NOT EXISTS universities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  country_code VARCHAR(10),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  geo_point GEOGRAPHY(POINT, 4326),
  website TEXT,
  logo_url TEXT,
  reputation_rank INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS universities_geo_idx ON universities USING GIST(geo_point);

-- 6. Organizers Table
CREATE TABLE IF NOT EXISTS organizers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  organization_type TEXT DEFAULT 'community', -- community, corporate, university, student_club
  website TEXT,
  logo_url TEXT,
  reputation_score NUMERIC(5,2) DEFAULT 75.00,
  verified_events_count INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Event Logs (Audit & Analytics Telemetry)
CREATE TABLE IF NOT EXISTS event_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- viewed, bookmarked, registered, shared, clicked_marker, opened_university
  entity_type TEXT DEFAULT 'hackathon',
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_logs_action_idx ON event_logs(action);
CREATE INDEX IF NOT EXISTS event_logs_created_at_idx ON event_logs(created_at);

-- 8. Followed Areas Table
CREATE TABLE IF NOT EXISTS followed_areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  area_type TEXT CHECK (area_type IN ('city', 'country', 'university', 'radius')),
  area_name TEXT NOT NULL,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  radius_km INT DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, area_name)
);

ALTER TABLE followed_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_followed_areas" ON followed_areas
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 9. Seed Coordinates for Major Indian Tech Hubs
UPDATE hackathons SET latitude = 19.0760, longitude = 72.8777, base_score = 85.0
  WHERE location_city ILIKE '%mumbai%' AND latitude IS NULL;
UPDATE hackathons SET latitude = 28.7041, longitude = 77.1025, base_score = 80.0 
  WHERE location_city ILIKE '%delhi%' AND latitude IS NULL;
UPDATE hackathons SET latitude = 12.9716, longitude = 77.5946, base_score = 95.0 
  WHERE (location_city ILIKE '%bangalore%' OR location_city ILIKE '%bengaluru%') AND latitude IS NULL;
UPDATE hackathons SET latitude = 18.5204, longitude = 73.8567, base_score = 75.0 
  WHERE location_city ILIKE '%pune%' AND latitude IS NULL;
UPDATE hackathons SET latitude = 13.0827, longitude = 80.2707, base_score = 70.0 
  WHERE location_city ILIKE '%chennai%' AND latitude IS NULL;

-- 10. Proximity Radius Search RPC Function
CREATE OR REPLACE FUNCTION hackathons_within_radius(
  lat NUMERIC,
  lng NUMERIC,
  radius_km NUMERIC DEFAULT 100
)
RETURNS TABLE(
  id UUID, title TEXT, description TEXT, start_date DATE, end_date DATE,
  location_city TEXT, location_college TEXT, is_online BOOLEAN, tags TEXT[],
  register_url TEXT, organizer TEXT, cover_image_url TEXT, status TEXT,
  latitude NUMERIC, longitude NUMERIC, prize_pool TEXT, prize_amount NUMERIC,
  difficulty TEXT, is_featured BOOLEAN, is_verified BOOLEAN, registration_deadline DATE,
  avg_rating NUMERIC, review_count INT, save_count INT, view_count INT,
  base_score NUMERIC, distance_km NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id, h.title, h.description, h.start_date, h.end_date,
    h.location_city, h.location_college, h.is_online, h.tags,
    h.register_url, h.organizer, h.cover_image_url, h.status,
    h.latitude, h.longitude, h.prize_pool, h.prize_amount,
    h.difficulty, h.is_featured, h.is_verified, h.registration_deadline,
    h.avg_rating, h.review_count, h.save_count, h.view_count,
    h.base_score,
    ROUND((ST_Distance(
      h.geo_point,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::GEOGRAPHY
    ) / 1000)::NUMERIC, 1) AS distance_km
  FROM hackathons h
  WHERE 
    (h.status = 'approved' OR h.lifecycle_state = 'published')
    AND h.is_archived = FALSE
    AND h.geo_point IS NOT NULL
    AND ST_DWithin(
      h.geo_point,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::GEOGRAPHY,
      LEAST(radius_km, 500) * 1000 -- Hard cap at 500km for security
    )
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Viewport Bounds Query RPC Function
CREATE OR REPLACE FUNCTION hackathons_in_bounds(
  south NUMERIC, west NUMERIC, north NUMERIC, east NUMERIC
)
RETURNS TABLE(
  id UUID, title TEXT, start_date DATE, end_date DATE,
  location_city TEXT, is_online BOOLEAN, tags TEXT[],
  organizer TEXT, cover_image_url TEXT, status TEXT,
  latitude NUMERIC, longitude NUMERIC, prize_pool TEXT,
  is_featured BOOLEAN, is_verified BOOLEAN, registration_deadline DATE,
  avg_rating NUMERIC, save_count INT, base_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id, h.title, h.start_date, h.end_date,
    h.location_city, h.is_online, h.tags,
    h.organizer, h.cover_image_url, h.status,
    h.latitude, h.longitude, h.prize_pool,
    h.is_featured, h.is_verified, h.registration_deadline,
    h.avg_rating, h.save_count, h.base_score
  FROM hackathons h
  WHERE 
    (h.status = 'approved' OR h.lifecycle_state = 'published')
    AND h.is_archived = FALSE
    AND h.geo_point IS NOT NULL
    AND ST_Within(
      h.geo_point::GEOMETRY,
      ST_MakeEnvelope(west, south, east, north, 4326)
    )
  LIMIT 500;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
