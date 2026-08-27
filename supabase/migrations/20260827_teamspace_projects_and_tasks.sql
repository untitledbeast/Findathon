-- ============================================================
-- Migration: TeamSpace Project Workspace & Task Execution (Release 3)
-- Tables: team_projects, team_tasks
-- Indexes, Constraints, and Row-Level Security Policies
-- ============================================================

-- 1. Create team_projects table (One active project workspace per team)
CREATE TABLE IF NOT EXISTS public.team_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT,
  problem_statement TEXT,
  solution_approach TEXT,
  tech_stack TEXT[] NOT NULL DEFAULT '{}',
  repository_url TEXT,
  demo_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_team_projects_team UNIQUE (team_id)
);

COMMENT ON TABLE public.team_projects IS 'Hackathon project workspace holding project context, problem definition, solution approach, and repository URLs for a team.';

-- 2. Create team_tasks table (Execution items for a team project)
CREATE TABLE IF NOT EXISTS public.team_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.team_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT chk_task_status CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
  CONSTRAINT chk_task_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

COMMENT ON TABLE public.team_tasks IS 'Task execution items assigned to active team members within a team project.';

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_team_projects_team_id ON public.team_projects (team_id);
CREATE INDEX IF NOT EXISTS idx_team_projects_created_by ON public.team_projects (created_by);

CREATE INDEX IF NOT EXISTS idx_team_tasks_team_status ON public.team_tasks (team_id, status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_tasks_project_status ON public.team_tasks (project_id, status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_tasks_assigned_to ON public.team_tasks (assigned_to) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_tasks_due_at ON public.team_tasks (due_at) WHERE due_at IS NOT NULL AND archived_at IS NULL;

-- 4. Enable Row-Level Security
ALTER TABLE public.team_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;

-- Clean existing policies if rerun
DROP POLICY IF EXISTS "Active team members can read team project" ON public.team_projects;
DROP POLICY IF EXISTS "Active team members can create team project" ON public.team_projects;
DROP POLICY IF EXISTS "Team owners and leads can update team project" ON public.team_projects;
DROP POLICY IF EXISTS "Team owners can delete team project" ON public.team_projects;

DROP POLICY IF EXISTS "Active team members can read team tasks" ON public.team_tasks;
DROP POLICY IF EXISTS "Active team members can create team tasks" ON public.team_tasks;
DROP POLICY IF EXISTS "Active team members can update team tasks" ON public.team_tasks;
DROP POLICY IF EXISTS "Team owners and leads can delete team tasks" ON public.team_tasks;

-- RLS: Team Projects
CREATE POLICY "Active team members can read team project" ON public.team_projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_projects.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.membership_status = 'active'
    )
  );

CREATE POLICY "Active team members can create team project" ON public.team_projects
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_projects.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.membership_status = 'active'
    )
  );

CREATE POLICY "Team owners and leads can update team project" ON public.team_projects
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_projects.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.membership_status = 'active'
        AND team_members.role IN ('owner', 'lead')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_projects.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.membership_status = 'active'
        AND team_members.role IN ('owner', 'lead')
    )
  );

CREATE POLICY "Team owners can delete team project" ON public.team_projects
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_projects.team_id
        AND teams.owner_user_id = auth.uid()
    )
  );

-- RLS: Team Tasks
CREATE POLICY "Active team members can read team tasks" ON public.team_tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_tasks.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.membership_status = 'active'
    )
  );

CREATE POLICY "Active team members can create team tasks" ON public.team_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_tasks.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.membership_status = 'active'
    )
  );

CREATE POLICY "Active team members can update team tasks" ON public.team_tasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_tasks.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.membership_status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_tasks.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.membership_status = 'active'
    )
  );

CREATE POLICY "Team owners and leads can delete team tasks" ON public.team_tasks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_tasks.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.membership_status = 'active'
        AND team_members.role IN ('owner', 'lead')
    )
  );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
