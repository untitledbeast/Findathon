-- 1. Create admin_allowlist table
CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  email TEXT PRIMARY KEY,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on admin_allowlist
ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists then recreate
DROP POLICY IF EXISTS "Admins manage allowlist" ON public.admin_allowlist;
CREATE POLICY "Admins manage allowlist" ON public.admin_allowlist
  FOR ALL USING (public.is_admin(auth.uid()));


-- 2. Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_state(),
  performed_by UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_email TEXT,
  target_user_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on admin_audit_logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists then recreate
DROP POLICY IF EXISTS "Admins view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins view audit logs" ON public.admin_audit_logs
  FOR ALL USING (public.is_admin(auth.uid()));


-- 3. Extend sync_profile_email function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Sync email onto profiles if column exists or check allowlist
  IF NEW.email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.admin_allowlist WHERE LOWER(email) = LOWER(NEW.email)
  ) THEN
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


-- 4. Extend handle_new_user function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_admin_candidate BOOLEAN := FALSE;
BEGIN
  IF NEW.email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.admin_allowlist WHERE LOWER(email) = LOWER(NEW.email)
  ) THEN
    is_admin_candidate := TRUE;
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    CASE WHEN is_admin_candidate THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    role = CASE WHEN is_admin_candidate THEN 'admin' ELSE public.profiles.role END;

  RETURN NEW;
END;
$$;
