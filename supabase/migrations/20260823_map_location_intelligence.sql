-- ============================================================================
-- FINDATHON: Map Engine Location Intelligence & Automated Geocoding Migration
-- ============================================================================

-- 1. Add Location Intelligence columns to public.hackathons
ALTER TABLE public.hackathons
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS location_status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS location_precision TEXT,
  ADD COLUMN IF NOT EXISTS location_source TEXT,
  ADD COLUMN IF NOT EXISTS geocoder_provider TEXT,
  ADD COLUMN IF NOT EXISTS geocoder_confidence NUMERIC(4, 3),
  ADD COLUMN IF NOT EXISTS normalized_address TEXT,
  ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS geocode_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

-- 2. Create Geocode Persistent Cache Table
CREATE TABLE IF NOT EXISTS public.geocode_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_address TEXT UNIQUE NOT NULL,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  formatted_address TEXT,
  precision TEXT DEFAULT 'exact_venue',
  provider TEXT DEFAULT 'nominatim',
  confidence NUMERIC(4, 3) DEFAULT 1.000,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes for fast spatial and background worker lookups
CREATE INDEX IF NOT EXISTS idx_hackathons_coords ON public.hackathons (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_hackathons_loc_status ON public.hackathons (location_status);
CREATE INDEX IF NOT EXISTS idx_hackathons_loc_retry ON public.hackathons (location_status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_geocode_cache_norm_addr ON public.geocode_cache (normalized_address);

-- 4. Enable RLS on geocode_cache
ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access on geocode cache
CREATE POLICY "Public read geocode cache"
  ON public.geocode_cache
  FOR SELECT
  USING (true);

-- Allow service role full write access
CREATE POLICY "Service role write geocode cache"
  ON public.geocode_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Safe Backfill: Set Online Hackathons to NOT_APPLICABLE and clear any dummy coordinates
UPDATE public.hackathons
SET
  location_status = 'NOT_APPLICABLE',
  latitude = NULL,
  longitude = NULL
WHERE is_online = true;

-- 6. Safe Backfill: Set Offline/Hybrid Hackathons with missing coords to PENDING
UPDATE public.hackathons
SET
  location_status = 'PENDING',
  geocode_attempts = 0
WHERE is_online = false AND (latitude IS NULL OR longitude IS NULL);
