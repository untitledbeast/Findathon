-- Migration: 20260814_fix_hackathons_submission_and_admin_pipeline.sql
-- Fixes RLS policies, admin permissions check, and foreign key relationships for hackathon submissions

-- 1. Create SECURITY DEFINER function public.is_admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role IN ('admin', 'moderator')
  ) OR EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.admin_allowlist a ON LOWER(u.email) = LOWER(a.email)
    WHERE u.id = user_id
  );
END;
$$;

-- 2. Add foreign key from hackathons.submitted_by to public.profiles(id) for PostgREST embedding joins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_hackathons_submitted_by_profiles'
  ) THEN
    ALTER TABLE public.hackathons
      ADD CONSTRAINT fk_hackathons_submitted_by_profiles
      FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Ensure RLS is enabled on public.hackathons
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;

-- 4. Re-create RLS Policies on public.hackathons
DROP POLICY IF EXISTS "Public read approved hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Users read own submissions" ON public.hackathons;
DROP POLICY IF EXISTS "Admins read all hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Authenticated users insert hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Users update own hackathons" ON public.hackathons;

CREATE POLICY "Public read approved hackathons" ON public.hackathons
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users read own submissions" ON public.hackathons
  FOR SELECT USING (auth.uid() IS NOT NULL AND submitted_by = auth.uid());

CREATE POLICY "Admins read all hackathons" ON public.hackathons
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users insert hackathons" ON public.hackathons
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users update own hackathons" ON public.hackathons
  FOR UPDATE USING (auth.uid() IS NOT NULL AND (submitted_by = auth.uid() OR public.is_admin(auth.uid())));
