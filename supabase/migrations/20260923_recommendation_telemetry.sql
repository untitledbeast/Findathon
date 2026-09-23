-- ============================================================
-- Migration: Recommendation Telemetry & Position Awareness
-- Table: recommendation_telemetry_events
-- Supports: GATES 17 & 18 (compact, auditable interaction tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recommendation_telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'recommendation_impression',
      'recommendation_open',
      'recommendation_save',
      'registration_click',
      'external_registration',
      'hide',
      'not_relevant'
    )
  ),
  session_id TEXT,
  position INT NOT NULL CHECK (position >= 0),
  surface TEXT NOT NULL DEFAULT 'recommendations',
  engine_version TEXT NOT NULL DEFAULT '1.5.0',
  feature_version TEXT NOT NULL DEFAULT 'v2',
  recommendation_mode TEXT CHECK (
    recommendation_mode IN ('COLD_START', 'LIGHT_PERSONALIZATION', 'FULL_PERSONALIZATION')
  ),
  score_recorded NUMERIC(5, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.recommendation_telemetry_events IS 
  'Compact, auditable recommendation interaction events with ranking position and versioning (Gates 17 & 18).';

-- Indexes for efficient training-ready extraction and dashboard analytics
CREATE INDEX IF NOT EXISTS idx_rec_telemetry_user ON public.recommendation_telemetry_events (user_id);
CREATE INDEX IF NOT EXISTS idx_rec_telemetry_hackathon ON public.recommendation_telemetry_events (hackathon_id);
CREATE INDEX IF NOT EXISTS idx_rec_telemetry_event_type ON public.recommendation_telemetry_events (event_type);
CREATE INDEX IF NOT EXISTS idx_rec_telemetry_created_at ON public.recommendation_telemetry_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rec_telemetry_session_pos ON public.recommendation_telemetry_events (session_id, position);

-- Row Level Security
ALTER TABLE public.recommendation_telemetry_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to log interactions
CREATE POLICY "Users can insert their own telemetry events"
  ON public.recommendation_telemetry_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow anonymous users to log client impressions
CREATE POLICY "Anonymous users can insert telemetry events"
  ON public.recommendation_telemetry_events
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Service role can view all telemetry for training pipelines
CREATE POLICY "Service role full access to recommendation telemetry"
  ON public.recommendation_telemetry_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
