-- Add latitude and longitude columns to public.hackathons table
ALTER TABLE public.hackathons
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

-- Index for spatial query performance
CREATE INDEX IF NOT EXISTS idx_hackathons_coords ON public.hackathons (latitude, longitude);

-- Update coordinates for existing hackathons based on city / location
UPDATE public.hackathons
SET latitude = 19.0760, longitude = 72.8777
WHERE (location_city ILIKE '%mumbai%' OR title ILIKE '%mumbai%') AND (latitude IS NULL OR longitude IS NULL);

UPDATE public.hackathons
SET latitude = 12.9716, longitude = 77.5946
WHERE (location_city ILIKE '%bengaluru%' OR location_city ILIKE '%bangalore%' OR title ILIKE '%bangalore%' OR title ILIKE '%bengaluru%') AND (latitude IS NULL OR longitude IS NULL);

UPDATE public.hackathons
SET latitude = 28.7041, longitude = 77.1025
WHERE (location_city ILIKE '%delhi%' OR title ILIKE '%delhi%') AND (latitude IS NULL OR longitude IS NULL);

UPDATE public.hackathons
SET latitude = 18.5204, longitude = 73.8567
WHERE (location_city ILIKE '%pune%' OR title ILIKE '%pune%') AND (latitude IS NULL OR longitude IS NULL);

UPDATE public.hackathons
SET latitude = 17.3850, longitude = 78.4867
WHERE (location_city ILIKE '%hyderabad%' OR title ILIKE '%hyderabad%') AND (latitude IS NULL OR longitude IS NULL);

-- Default coordinates for online/global hackathons (India center: 20.5937, 78.9629)
UPDATE public.hackathons
SET latitude = 20.5937, longitude = 78.9629
WHERE is_online = true AND (latitude IS NULL OR longitude IS NULL);

-- Fallback for any remaining unlocated hackathons
UPDATE public.hackathons
SET latitude = 19.0760, longitude = 72.8777
WHERE latitude IS NULL OR longitude IS NULL;
