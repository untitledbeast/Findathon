-- ====================================================================
-- FINDATHON RECOMMENDATION ENGINE V2 — DATABASE MIGRATION
-- Run in Supabase SQL Editor before deploying code
-- ====================================================================

-- ── 1. Add columns to existing user_interests table ──────────────────
ALTER TABLE user_interests
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'implicit'
    CHECK (source IN ('implicit','explicit','search','save','view','click',
                      'register_click','apply','share','unsave','dismiss',
                      'search_click')),
  ADD COLUMN IF NOT EXISTS last_reinforced TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS decay_factor NUMERIC DEFAULT 1.0;

-- ── 2. Behavioral event log ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendation_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'view',
      'save',
      'unsave',
      'register_click',
      'share',
      'ignore',
      'dismiss',
      'apply',
      'search_result',
      'search_click'
    )),
  recommendation_position INT,
  recommendation_score NUMERIC,
  was_recommended BOOLEAN DEFAULT FALSE,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rec_events_user_created
  ON recommendation_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rec_events_hackathon_type
  ON recommendation_events (hackathon_id, event_type);

-- ── 3. Recommendation output cache ──────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendation_cache (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  hackathon_ids UUID[] NOT NULL,
  scores JSONB NOT NULL,
  explanations JSONB NOT NULL,
  score_breakdown JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '2 hours',
  invalidated BOOLEAN DEFAULT FALSE
);

-- ── 4. User hackathon feedback (explicit signal, highest weight) ────
CREATE TABLE IF NOT EXISTS hackathon_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
  feedback TEXT NOT NULL
    CHECK (feedback IN (
      'interested',
      'not_interested',
      'too_advanced',
      'too_basic',
      'wrong_domain',
      'already_registered'
    )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, hackathon_id)
);

-- ── 5. Hackathon engagement metrics ─────────────────────────────────
ALTER TABLE hackathons
  ADD COLUMN IF NOT EXISTS engagement_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_through_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS save_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS register_click_rate NUMERIC DEFAULT 0;

-- ── 6. Similarity index between hackathons ──────────────────────────
CREATE TABLE IF NOT EXISTS hackathon_similarity (
  hackathon_a UUID REFERENCES hackathons(id) ON DELETE CASCADE,
  hackathon_b UUID REFERENCES hackathons(id) ON DELETE CASCADE,
  similarity_score NUMERIC NOT NULL CHECK (similarity_score BETWEEN 0 AND 1),
  shared_tags TEXT[] DEFAULT '{}',
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (hackathon_a, hackathon_b)
);

CREATE INDEX IF NOT EXISTS idx_hack_sim_a_score
  ON hackathon_similarity (hackathon_a, similarity_score DESC);

-- ── 7. RLS ──────────────────────────────────────────────────────────
ALTER TABLE recommendation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_similarity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_events" ON recommendation_events;
DROP POLICY IF EXISTS "own_cache" ON recommendation_cache;
DROP POLICY IF EXISTS "own_feedback" ON hackathon_feedback;
DROP POLICY IF EXISTS "public_similarity" ON hackathon_similarity;

CREATE POLICY "own_events" ON recommendation_events
  FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_cache" ON recommendation_cache
  FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_feedback" ON hackathon_feedback
  FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "public_similarity" ON hackathon_similarity
  FOR SELECT TO anon, authenticated USING (true);

-- ── 8. Auto-invalidate cache when user events change ────────────────
CREATE OR REPLACE FUNCTION invalidate_recommendation_cache()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE recommendation_cache
  SET invalidated = TRUE
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_rec_event ON recommendation_events;
CREATE TRIGGER on_new_rec_event
  AFTER INSERT ON recommendation_events
  FOR EACH ROW EXECUTE FUNCTION invalidate_recommendation_cache();

DROP TRIGGER IF EXISTS on_save_change ON saved_hackathons;
CREATE TRIGGER on_save_change
  AFTER INSERT OR DELETE ON saved_hackathons
  FOR EACH ROW EXECUTE FUNCTION invalidate_recommendation_cache();

-- ── 9. Auto-update user_interests from events ───────────────────────
CREATE OR REPLACE FUNCTION update_interests_from_event()
RETURNS TRIGGER AS $$
DECLARE
  hackathon_tags TEXT[];
  tag TEXT;
  weight_delta NUMERIC;
BEGIN
  SELECT tags INTO hackathon_tags FROM hackathons WHERE id = NEW.hackathon_id;
  IF hackathon_tags IS NULL THEN RETURN NEW; END IF;

  weight_delta := CASE NEW.event_type
    WHEN 'register_click' THEN 2.0
    WHEN 'apply'          THEN 2.5
    WHEN 'save'           THEN 1.5
    WHEN 'search_click'   THEN 1.0
    WHEN 'view'           THEN 0.3
    WHEN 'share'          THEN 1.2
    WHEN 'unsave'         THEN -0.8
    WHEN 'dismiss'        THEN -1.2
    WHEN 'ignore'         THEN -0.2
    ELSE 0
  END;

  IF weight_delta = 0 THEN RETURN NEW; END IF;

  FOREACH tag IN ARRAY hackathon_tags LOOP
    INSERT INTO user_interests (user_id, tag, weight, source, last_reinforced)
    VALUES (
      NEW.user_id,
      tag,
      GREATEST(0.1, weight_delta),
      NEW.event_type,
      NOW()
    )
    ON CONFLICT (user_id, tag) DO UPDATE SET
      weight = GREATEST(
        0.1,
        LEAST(10.0, user_interests.weight + weight_delta * 0.5)
      ),
      source = EXCLUDED.source,
      last_reinforced = NOW(),
      decay_factor = 1.0;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_event_update_interests ON recommendation_events;
CREATE TRIGGER on_event_update_interests
  AFTER INSERT ON recommendation_events
  FOR EACH ROW EXECUTE FUNCTION update_interests_from_event();

-- ── 10. Daily interest decay ────────────────────────────────────────
CREATE OR REPLACE FUNCTION apply_interest_decay()
RETURNS VOID AS $$
BEGIN
  UPDATE user_interests
  SET
    weight = GREATEST(0.1, weight * 0.97),
    decay_factor = decay_factor * 0.97
  WHERE last_reinforced < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 11. Precompute hackathon-to-hackathon similarity ────────────────
CREATE OR REPLACE FUNCTION compute_hackathon_similarity()
RETURNS VOID AS $$
DECLARE
  h1 hackathons%ROWTYPE;
  h2 hackathons%ROWTYPE;
  shared TEXT[];
  score NUMERIC;
  total_union INT;
BEGIN
  DELETE FROM hackathon_similarity;

  FOR h1 IN SELECT * FROM hackathons WHERE status = 'approved' LOOP
    FOR h2 IN SELECT * FROM hackathons
              WHERE status = 'approved' AND id > h1.id LOOP

      shared := ARRAY(
        SELECT UNNEST(h1.tags)
        INTERSECT
        SELECT UNNEST(h2.tags)
      );

      total_union := COALESCE(array_length(
        ARRAY(
          SELECT UNNEST(h1.tags)
          UNION
          SELECT UNNEST(h2.tags)
        ), 1
      ), 0);

      IF total_union > 0 THEN
        score := COALESCE(array_length(shared, 1), 0)::NUMERIC / total_union;
      ELSE
        score := 0;
      END IF;

      IF h1.is_online = h2.is_online THEN
        score := score + 0.05;
      END IF;

      IF h1.location_city IS NOT NULL
         AND h1.location_city = h2.location_city THEN
        score := score + 0.08;
      END IF;

      IF h1.difficulty = h2.difficulty THEN
        score := score + 0.05;
      END IF;

      score := LEAST(1.0, score);

      IF score > 0.1 THEN
        INSERT INTO hackathon_similarity
          (hackathon_a, hackathon_b, similarity_score, shared_tags)
        VALUES (h1.id, h2.id, score, shared)
        ON CONFLICT (hackathon_a, hackathon_b) DO UPDATE SET
          similarity_score = EXCLUDED.similarity_score,
          shared_tags = EXCLUDED.shared_tags,
          computed_at = NOW();

        INSERT INTO hackathon_similarity
          (hackathon_a, hackathon_b, similarity_score, shared_tags)
        VALUES (h2.id, h1.id, score, shared)
        ON CONFLICT (hackathon_a, hackathon_b) DO UPDATE SET
          similarity_score = EXCLUDED.similarity_score,
          shared_tags = EXCLUDED.shared_tags,
          computed_at = NOW();
      END IF;

    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
