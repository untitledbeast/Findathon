-- 1. Add submitted_by column to public.hackathons
ALTER TABLE public.hackathons
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create index on submitted_by
CREATE INDEX IF NOT EXISTS idx_hackathons_submitted_by ON public.hackathons (submitted_by);

-- 3. Enable RLS on hackathons table
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if any
DROP POLICY IF EXISTS "Public read approved hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Users read own submissions" ON public.hackathons;
DROP POLICY IF EXISTS "Admins read all hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Authenticated users insert hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Users update own hackathons" ON public.hackathons;

-- 5. Public read approved hackathons
CREATE POLICY "Public read approved hackathons" ON public.hackathons
  FOR SELECT USING (status = 'approved');

-- 6. Users read own submissions regardless of status
CREATE POLICY "Users read own submissions" ON public.hackathons
  FOR SELECT USING (auth.uid() IS NOT NULL AND submitted_by = auth.uid());

-- 7. Admins read all hackathons regardless of status
CREATE POLICY "Admins read all hackathons" ON public.hackathons
  FOR SELECT USING (public.is_admin(auth.uid()));

-- 8. Authenticated users can submit new hackathons
CREATE POLICY "Authenticated users insert hackathons" ON public.hackathons
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 9. Users can update own pending hackathons
CREATE POLICY "Users update own hackathons" ON public.hackathons
  FOR UPDATE USING (auth.uid() IS NOT NULL AND (submitted_by = auth.uid() OR public.is_admin(auth.uid())));
