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
CREATE INDEX IF NOT EXISTS hackathons_organizer_trgm ON hackathons USING GIN (organizer gin_trgm_ops);
CREATE INDEX IF NOT EXISTS hackathons_city_trgm ON hackathons USING GIN (location_city gin_trgm_ops);

-- Full text search tsvector column
ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

CREATE OR REPLACE FUNCTION update_hackathon_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.organizer, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.location_city, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER hackathon_search_vector_update
  BEFORE INSERT OR UPDATE ON hackathons
  FOR EACH ROW EXECUTE FUNCTION update_hackathon_search_vector();

-- Backfill search vectors
UPDATE hackathons SET title = title;

CREATE INDEX IF NOT EXISTS hackathons_search_vector_idx 
  ON hackathons USING GIN (search_vector);

-- Master SQL discovery procedure (PostgreSQL Filtering & Text Relevance)
CREATE OR REPLACE FUNCTION discover_hackathons(
  p_query TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_is_online BOOLEAN DEFAULT NULL,
  p_difficulty TEXT DEFAULT NULL,
  p_prize_min NUMERIC DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_start_after DATE DEFAULT NULL,
  p_start_before DATE DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL,
  p_user_lat NUMERIC DEFAULT NULL,
  p_user_lng NUMERIC DEFAULT NULL,
  p_radius_km NUMERIC DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  registration_deadline DATE,
  location_city TEXT,
  location_college TEXT,
  is_online BOOLEAN,
  tags TEXT[],
  register_url TEXT,
  organizer TEXT,
  cover_image_url TEXT,
  status TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  prize_pool TEXT,
  prize_amount NUMERIC,
  difficulty TEXT,
  is_featured BOOLEAN,
  avg_rating NUMERIC,
  review_count INT,
  save_count INT,
  view_count INT,
  relevance_score NUMERIC,
  distance_km NUMERIC,
  days_until_deadline INT
) AS $$
BEGIN
  RETURN QUERY
  WITH scored AS (
    SELECT
      h.*,
      -- SQL RELEVANCE SCORE: (text_relevance * 0.5) + (trigram_similarity * 0.2) + (freshness * 0.2) + (urgency * 0.1)
      (
        CASE WHEN p_query IS NOT NULL AND p_query != '' THEN
          CASE WHEN h.search_vector @@ plainto_tsquery('english', p_query)
            THEN ts_rank(h.search_vector, plainto_tsquery('english', p_query)) * 50
            ELSE similarity(h.title, p_query) * 20
          END
        ELSE 10 END

        + CASE WHEN h.is_featured THEN 15 ELSE 0 END

        + CASE 
            WHEN h.registration_deadline IS NOT NULL THEN
              GREATEST(0, 10 - GREATEST(0, EXTRACT(DAY FROM (h.registration_deadline - CURRENT_DATE))))
            ELSE 0
          END

        + GREATEST(0, 10 - EXTRACT(DAY FROM (CURRENT_DATE - h.created_at::DATE)) * 0.1)
      ) AS relevance_score,
      
      -- Distance calculation via PostGIS geography
      CASE 
        WHEN p_user_lat IS NOT NULL AND h.geo_point IS NOT NULL THEN
          ROUND((ST_Distance(
            h.geo_point,
            ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::GEOGRAPHY
          ) / 1000)::NUMERIC, 1)
        ELSE NULL
      END AS distance_km,
      
      -- Days until deadline
      CASE WHEN h.registration_deadline IS NOT NULL THEN
        EXTRACT(DAY FROM (h.registration_deadline - CURRENT_DATE))::INT
      ELSE NULL END AS days_until_deadline

    FROM hackathons h
    WHERE
      h.status = 'approved'
      
      -- Text search with trigram fallback
      AND (
        p_query IS NULL OR p_query = ''
        OR h.search_vector @@ plainto_tsquery('english', p_query)
        OR similarity(h.title, p_query) > 0.15
        OR similarity(h.organizer, p_query) > 0.2
        OR similarity(COALESCE(h.location_city, ''), p_query) > 0.2
        OR h.tags && ARRAY[p_query]
      )
      
      -- Tag filter
      AND (p_tags IS NULL OR h.tags && p_tags)
      
      -- Online filter
      AND (p_is_online IS NULL OR h.is_online = p_is_online)
      
      -- Difficulty filter
      AND (p_difficulty IS NULL OR h.difficulty = p_difficulty)
      
      -- Prize filter
      AND (p_prize_min IS NULL OR h.prize_amount >= p_prize_min)
      
      -- City filter
      AND (p_city IS NULL OR similarity(COALESCE(h.location_city,''), p_city) > 0.3)
      
      -- Date range
      AND (p_start_after IS NULL OR h.start_date >= p_start_after)
      AND (p_start_before IS NULL OR h.start_date <= p_start_before)
      
      -- Radius filter
      AND (
        p_radius_km IS NULL OR p_user_lat IS NULL OR h.geo_point IS NULL
        OR ST_DWithin(
          h.geo_point,
          ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::GEOGRAPHY,
          p_radius_km * 1000
        )
      )
      
      -- Status filter
      AND (
        p_status_filter IS NULL OR p_status_filter = 'all'
        OR (p_status_filter = 'open' AND 
            (h.registration_deadline IS NULL OR h.registration_deadline >= CURRENT_DATE))
        OR (p_status_filter = 'closing_soon' AND 
            h.registration_deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days')
        OR (p_status_filter = 'closed' AND 
            h.registration_deadline < CURRENT_DATE)
      )
  )
  SELECT
    s.id, s.title, s.description, s.start_date, s.end_date,
    s.registration_deadline, s.location_city, s.location_college,
    s.is_online, s.tags, s.register_url, s.organizer, s.cover_image_url,
    s.status, s.latitude, s.longitude, s.prize_pool, s.prize_amount,
    s.difficulty, s.is_featured, s.avg_rating, s.review_count,
    s.save_count, s.view_count, s.relevance_score, s.distance_km,
    s.days_until_deadline
  FROM scored s
  ORDER BY s.relevance_score DESC, s.start_date ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
