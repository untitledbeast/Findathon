-- Migration: Fix is_admin function and hackathons admin RLS policies

-- 1. Create/replace the public.is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  user_role TEXT;
  user_email TEXT;
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check role in profiles
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  IF user_role IN ('admin', 'moderator') THEN
    RETURN TRUE;
  END IF;

  -- Check admin_allowlist if email exists in auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  IF user_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.admin_allowlist WHERE LOWER(email) = LOWER(user_email)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Grant execution to authenticated and anon
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, anon, service_role;

-- 2. Ensure RLS is enabled on public.hackathons
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to recreate cleanly
DROP POLICY IF EXISTS "Public read approved hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Users read own submissions" ON public.hackathons;
DROP POLICY IF EXISTS "Admins read all hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Authenticated users insert hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Users update own hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Admins update all hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Admins delete hackathons" ON public.hackathons;

-- 4. SELECT policies
CREATE POLICY "Public read approved hackathons" ON public.hackathons
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users read own submissions" ON public.hackathons
  FOR SELECT USING (auth.uid() IS NOT NULL AND submitted_by = auth.uid());

CREATE POLICY "Admins read all hackathons" ON public.hackathons
  FOR SELECT USING (public.is_admin(auth.uid()));

-- 5. INSERT policies
CREATE POLICY "Authenticated users insert hackathons" ON public.hackathons
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 6. UPDATE policies
CREATE POLICY "Users update own hackathons" ON public.hackathons
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      submitted_by = auth.uid() OR public.is_admin(auth.uid())
    )
  ) WITH CHECK (
    auth.uid() IS NOT NULL AND (
      submitted_by = auth.uid() OR public.is_admin(auth.uid())
    )
  );

-- 7. DELETE policies
CREATE POLICY "Admins delete hackathons" ON public.hackathons
  FOR DELETE USING (public.is_admin(auth.uid()));
