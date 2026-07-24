-- Enable PostGIS, Trigram, and Unaccent extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Search history per user (logged-in search persistence)
CREATE TABLE IF NOT EXISTS search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  parsed_filters JSONB,
  result_count INT DEFAULT 0,
  clicked_hackathon_id UUID REFERENCES hackathons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search interaction events (lightweight search analytics)
CREATE TABLE IF NOT EXISTS search_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  search_source TEXT DEFAULT 'spotlight',
  clicked_result_id UUID REFERENCES hackathons(id) ON DELETE SET NULL,
  position INT,
  results_count INT DEFAULT 0,
  response_time_ms INT DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved collections (Pinterest-style)
CREATE TABLE IF NOT EXISTS saved_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '📌',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES saved_collections(id) ON DELETE CASCADE,
  hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, hackathon_id)
);

-- User interests (for personalization ranking)
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  weight NUMERIC DEFAULT 1.0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tag)
);

-- Curated collections (system / admin created query collections)
CREATE TABLE IF NOT EXISTS curated_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '✨',
  filter_tags TEXT[] DEFAULT '{}',
  filter_query JSONB DEFAULT '{}',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO curated_collections (title, description, emoji, filter_tags, filter_query, display_order) VALUES
('Top AI Hackathons', 'Best artificial intelligence events', '🤖', ARRAY['AI','ML','Machine Learning'], '{"tags":["AI"]}', 1),
('Beginner Friendly', 'Perfect for your first hackathon', '🌱', ARRAY['Beginner'], '{"difficulty":"beginner"}', 2),
('Big Prize Pools', 'Events with significant prizes', '💰', ARRAY[], '{"prizeMin":50000}', 3),
('100% Online', 'Join from anywhere in the world', '🌐', ARRAY[], '{"isOnline":true}', 4),
('Web3 & Blockchain', 'Decentralized future builders', '⛓', ARRAY['Web3','Blockchain','DeFi'], '{"tags":["Web3"]}', 5)
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE curated_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_search_history" ON search_history FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_search_events" ON search_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "own_collections" ON saved_collections FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "public_read_public_collections" ON saved_collections FOR SELECT TO anon USING (is_public = true);
CREATE POLICY "own_collection_items" ON collection_items FOR ALL TO authenticated 
  USING (auth.uid() IN (SELECT user_id FROM saved_collections WHERE id = collection_id));
CREATE POLICY "own_interests" ON user_interests FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "public_read_curated" ON curated_collections FOR SELECT TO anon, authenticated USING (is_active = true);

-- Trigram GIN indexes for fuzzy search
CREATE INDEX IF NOT EXISTS hackathons_title_trgm ON hackathons USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS hackathons_description_trgm ON hackathons USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS hackathons_tags_gin ON hackathons USING GIN (tags);

-- Full text search tsvector column & trigger
ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION hackathon_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.organizer, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.location_city, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hackathon_search_vector ON hackathons;
CREATE TRIGGER trg_hackathon_search_vector
  BEFORE INSERT OR UPDATE ON hackathons
  FOR EACH ROW EXECUTE FUNCTION hackathon_search_vector_update();

-- Populate existing search_vector
UPDATE hackathons SET title = title WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS hackathons_search_vector_idx ON hackathons USING GIN (search_vector);

-- Geo point trigger for PostGIS
ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS geo_point geography(POINT, 4326);

CREATE OR REPLACE FUNCTION hackathon_geo_point_update() RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geo_point := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::GEOGRAPHY;
  ELSE
    NEW.geo_point := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hackathon_geo_point ON hackathons;
CREATE TRIGGER trg_hackathon_geo_point
  BEFORE INSERT OR UPDATE ON hackathons
  FOR EACH ROW EXECUTE FUNCTION hackathon_geo_point_update();

UPDATE hackathons SET latitude = latitude WHERE latitude IS NOT NULL AND geo_point IS NULL;
CREATE INDEX IF NOT EXISTS hackathons_geo_point_idx ON hackathons USING GIST (geo_point);

-- ===========================================================================
-- UNIFIED HACKATHON DOMAIN PLATFORM TABLES & EXTENSIONS
-- ===========================================================================

-- ORGANIZERS
CREATE TABLE IF NOT EXISTS organizers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  website TEXT,
  email TEXT,
  social_twitter TEXT,
  social_linkedin TEXT,
  social_discord TEXT,
  social_instagram TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_badge TEXT,
  follower_count INT DEFAULT 0,
  hackathon_count INT DEFAULT 0,
  total_participants INT DEFAULT 0,
  avg_rating NUMERIC(2,1) DEFAULT 0,
  total_prize_amount NUMERIC DEFAULT 0,
  country TEXT DEFAULT 'India',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- UNIVERSITIES
CREATE TABLE IF NOT EXISTS universities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_name TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  logo_url TEXT,
  banner_url TEXT,
  website TEXT,
  ranking INT,
  hackathon_count INT DEFAULT 0,
  total_participants INT DEFAULT 0,
  avg_prize NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CITIES
CREATE TABLE IF NOT EXISTS cities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  state TEXT,
  country TEXT DEFAULT 'India',
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  hackathon_count INT DEFAULT 0,
  top_tags TEXT[] DEFAULT '{}',
  hero_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TECHNOLOGIES
CREATE TABLE IF NOT EXISTS technologies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_url TEXT,
  color TEXT DEFAULT '#8B5CF6',
  category TEXT,
  hackathon_count INT DEFAULT 0,
  aliases TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO technologies (name, slug, color, category, aliases) VALUES
('AI / ML', 'ai-ml', '#8B5CF6', 'domain', ARRAY['AI','ML','Machine Learning','Deep Learning','LLM','GenAI']),
('Web3', 'web3', '#EC4899', 'domain', ARRAY['Blockchain','Crypto','DeFi','NFT','Ethereum','Solana']),
('Cloud', 'cloud', '#4CC9F0', 'platform', ARRAY['AWS','GCP','Azure','DevOps','Kubernetes']),
('Cybersecurity', 'cybersecurity', '#00E5FF', 'domain', ARRAY['Security','CTF','Hacking','InfoSec']),
('Mobile', 'mobile', '#6366F1', 'domain', ARRAY['Android','iOS','React Native','Flutter']),
('Data Science', 'data-science', '#F59E0B', 'domain', ARRAY['Analytics','Python','Statistics','Data']),
('Game Dev', 'game-dev', '#EC4899', 'domain', ARRAY['Unity','Unreal','Gaming','AR','VR']),
('Open Source', 'open-source', '#00FFA3', 'domain', ARRAY['GitHub','Linux','Community']),
('IoT', 'iot', '#4CC9F0', 'domain', ARRAY['Internet of Things','Hardware','Arduino','Embedded']),
('Robotics', 'robotics', '#8B5CF6', 'domain', ARRAY['Robot','Automation','ROS'])
ON CONFLICT (name) DO NOTHING;

-- HACKATHON RICH FIELDS EXTENSION
ALTER TABLE hackathons
  ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES organizers(id),
  ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES universities(id),
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id),
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS rules TEXT,
  ADD COLUMN IF NOT EXISTS eligibility_details TEXT,
  ADD COLUMN IF NOT EXISTS registration_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS registration_fee_currency TEXT DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS prize_breakdown JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS tracks TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sponsors TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tech_stack TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_participants INT,
  ADD COLUMN IF NOT EXISTS current_participants INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_hours INT,
  ADD COLUMN IF NOT EXISTS certificate_provided BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS internship_opportunity BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hiring_opportunity BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'IST',
  ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trending_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS og_image_url TEXT;

-- HACKATHON MEDIA / GALLERY
CREATE TABLE IF NOT EXISTS hackathon_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
  media_type TEXT CHECK (media_type IN ('image','video','banner','logo')),
  url TEXT NOT NULL,
  caption TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HACKATHON TIMELINE (milestones)
CREATE TABLE IF NOT EXISTS hackathon_timeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  milestone_date TIMESTAMPTZ NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0
);

-- HACKATHON STATISTICS
CREATE TABLE IF NOT EXISTS hackathon_statistics (
  hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE PRIMARY KEY,
  total_views INT DEFAULT 0,
  unique_views INT DEFAULT 0,
  total_saves INT DEFAULT 0,
  register_clicks INT DEFAULT 0,
  share_count INT DEFAULT 0,
  compare_count INT DEFAULT 0,
  avg_time_on_page NUMERIC DEFAULT 0,
  countries_viewing TEXT[] DEFAULT '{}',
  peak_view_date DATE,
  conversion_rate NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HACKATHON PARTICIPANTS
CREATE TABLE IF NOT EXISTS hackathon_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  registration_status TEXT DEFAULT 'registered'
    CHECK (registration_status IN ('registered','confirmed','withdrawn','waitlisted')),
  team_name TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hackathon_id, user_id)
);

-- HACKATHON RELATED (many-to-many)
CREATE TABLE IF NOT EXISTS hackathon_related (
  hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
  related_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
  relation_type TEXT DEFAULT 'similar'
    CHECK (relation_type IN ('same_organizer','same_tags','same_university','similar')),
  score NUMERIC DEFAULT 0,
  PRIMARY KEY (hackathon_id, related_id)
);

-- VERIFICATION STATUS
CREATE TABLE IF NOT EXISTS verification_status (
  hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE PRIMARY KEY,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  verification_method TEXT CHECK (verification_method IN ('email','phone','document','auto')),
  notes TEXT,
  quality_checks JSONB DEFAULT '{}'
);

-- ORGANIZER FOLLOWERS
CREATE TABLE IF NOT EXISTS organizer_followers (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organizer_id UUID REFERENCES organizers(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, organizer_id)
);

-- UNIVERSITY FOLLOWERS
CREATE TABLE IF NOT EXISTS university_followers (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, university_id)
);

-- SAVED SEARCHES
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  notification_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES FOR NEW TABLES
ALTER TABLE organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_related ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE university_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_organizers" ON organizers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_universities" ON universities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_cities" ON cities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_technologies" ON technologies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_media" ON hackathon_media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_timeline" ON hackathon_timeline FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_statistics" ON hackathon_statistics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_related" ON hackathon_related FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "own_participants" ON hackathon_participants FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_org_follows" ON organizer_followers FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_uni_follows" ON university_followers FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_saved_searches" ON saved_searches FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "public_read_verification" ON verification_status FOR SELECT TO anon, authenticated USING (true);

-- SEED SAMPLE ORGANIZERS, UNIVERSITIES, CITIES
INSERT INTO organizers (name, slug, description, is_verified, verification_badge, country) VALUES
('IIT Bombay Tech Club', 'iit-bombay-tech-club', 'Premier tech club of IIT Bombay organizing hackathons since 2010', true, 'university', 'India'),
('DTU ACM Chapter', 'dtu-acm-chapter', 'ACM student chapter at Delhi Technological University', true, 'university', 'India'),
('DevsIndia', 'devsindia', 'Indias largest developer community', true, null, 'India'),
('COEP E-Cell', 'coep-ecell', 'Entrepreneurship cell at COEP Technological University', true, 'university', 'India'),
('IISC AI Lab', 'iisc-ai-lab', 'AI research lab at Indian Institute of Science', true, 'university', 'India')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO universities (name, slug, short_name, city, state, latitude, longitude) VALUES
('Indian Institute of Technology Bombay', 'iit-bombay', 'IIT Bombay', 'Mumbai', 'Maharashtra', 19.1334, 72.9133),
('Delhi Technological University', 'dtu', 'DTU', 'Delhi', 'Delhi', 28.7499, 77.1183),
('College of Engineering Pune', 'coep', 'COEP', 'Pune', 'Maharashtra', 18.5308, 73.8475),
('Indian Institute of Science', 'iisc', 'IISc', 'Bangalore', 'Karnataka', 13.0212, 77.5697)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO cities (name, slug, state, country, latitude, longitude, top_tags) VALUES
('Mumbai', 'mumbai', 'Maharashtra', 'India', 19.0760, 72.8777, ARRAY['AI','Web3','Fintech']),
('Delhi', 'delhi', 'Delhi', 'India', 28.7041, 77.1025, ARRAY['GovTech','AI','Cloud']),
('Bangalore', 'bangalore', 'Karnataka', 'India', 12.9716, 77.5946, ARRAY['AI','Cloud','Startup']),
('Pune', 'pune', 'Maharashtra', 'India', 18.5204, 73.8567, ARRAY['Startup','FinTech','Mobile']),
('Chennai', 'chennai', 'Tamil Nadu', 'India', 13.0827, 80.2707, ARRAY['AI','Data Science','IoT'])
ON CONFLICT (slug) DO NOTHING;
