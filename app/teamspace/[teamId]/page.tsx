/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  AlertCircle,
  Crown,
  LogOut,
  X,
  ExternalLink,
  ArrowRightLeft,
  FolderGit2,
  CheckSquare,
  LayoutList,
  Edit3,
  Trash2,
  Code
} from 'lucide-react';
import {
  TeamDTO,
  TeamInvitationDTO,
  TeamCompatibilityResultDTO,
  TeamProjectDTO,
  TeamTaskDTO,
  TeamTaskProgressDTO,
  TaskStatus,
  TaskPriority
} from '@/types';
import TeamIntelligenceCard from '@/components/teamspace/TeamIntelligenceCard';

export default function SingleTeamOverviewPage({
  params
}: {
  params: Promise<{ teamId: string }>;
}) {
  const resolvedParams = use(params);
  const teamId = resolvedParams.teamId;

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'project' | 'tasks'>('overview');
  const [team, setTeam] = useState<TeamDTO | null>(null);
  const [isOwnerOrLead, setIsOwnerOrLead] = useState(false);
  const [invitations, setInvitations] = useState<TeamInvitationDTO[]>([]);
  const [intelligence, setIntelligence] = useState<TeamCompatibilityResultDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [intelLoading, setIntelLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Project Workspace State
  const [project, setProject] = useState<TeamProjectDTO | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({
    title: '',
    problemStatement: '',
    solutionApproach: '',
    techStack: '',
    repositoryUrl: '',
    demoUrl: ''
  });
  const [savingProject, setSavingProject] = useState(false);

  // Task Execution State
  const [tasks, setTasks] = useState<TeamTaskDTO[]>([]);
  const [taskProgress, setTaskProgress] = useState<TeamTaskProgressDTO>({
    totalTasks: 0,
    todoCount: 0,
    inProgressCount: 0,
    blockedCount: 0,
    doneCount: 0,
    completionPercentage: 0
  });
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState<{
    title: string;
    description: string;
    priority: TaskPriority;
    assignedTo: string;
    dueAt: string;
  }>({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    dueAt: ''
  });
  const [creatingTask, setCreatingTask] = useState(false);

  // Transfer Ownership Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Leave Team Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadTeamData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/teams/${teamId}`);
      const json = await res.json();
      if (json.success && json.data?.team) {
        setTeam(json.data.team);
        setIsOwnerOrLead(json.data.isOwnerOrLead || false);
        setInvitations(json.data.invitations || []);
      } else {
        showToast(json.error?.message || 'Failed to load team', 'error');
      }
    } catch {
      showToast('Failed to load team', 'error');
    } finally {
      setLoading(false);
    }
  }, [teamId, showToast]);

  const loadIntelligence = useCallback(async () => {
    setIntelLoading(true);
    try {
      const res = await fetch(`/api/v1/teams/${teamId}/intelligence`);
      const json = await res.json();
      if (json.success && json.data) {
        setIntelligence(json.data);
      }
    } catch {
      // Non-blocking
    } finally {
      setIntelLoading(false);
    }
  }, [teamId]);

  const loadProjectData = useCallback(async () => {
    setProjectLoading(true);
    try {
      const res = await fetch(`/api/v1/teams/${teamId}/project`);
      const json = await res.json();
      if (json.success && json.data?.project) {
        setProject(json.data.project);
        setProjectForm({
          title: json.data.project.title || '',
          problemStatement: json.data.project.problemStatement || '',
          solutionApproach: json.data.project.solutionApproach || '',
          techStack: (json.data.project.techStack || []).join(', '),
          repositoryUrl: json.data.project.repositoryUrl || '',
          demoUrl: json.data.project.demoUrl || ''
        });
      }
    } catch {
      // Non-blocking
    } finally {
      setProjectLoading(false);
    }
  }, [teamId]);

  const loadTasksData = useCallback(async () => {
    setTasksLoading(true);
    try {
      const res = await fetch(`/api/v1/teams/${teamId}/tasks`);
      const json = await res.json();
      if (json.success && json.data) {
        setTasks(json.data.tasks || []);
        setTaskProgress(json.data.progress || {
          totalTasks: 0,
          todoCount: 0,
          inProgressCount: 0,
          blockedCount: 0,
          doneCount: 0,
          completionPercentage: 0
        });
      }
    } catch {
      // Non-blocking
    } finally {
      setTasksLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (teamId && !authLoading) {
      void loadTeamData();
      void loadIntelligence();
      void loadProjectData();
      void loadTasksData();
    }
  }, [teamId, authLoading, loadTeamData, loadIntelligence, loadProjectData, loadTasksData]);

  const handleCancelInvite = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/v1/invitations/${invitationId}/cancel`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        showToast('Invitation cancelled', 'success');
        setInvitations(prev => prev.filter(i => i.id !== invitationId));
      } else {
        showToast(json.error?.message || 'Failed to cancel invitation', 'error');
      }
    } catch {
      showToast('Error cancelling invitation', 'error');
    }
  };

  const handleConfirmLeaveTeam = async () => {
    setIsLeaving(true);
    try {
      const res = await fetch(`/api/v1/teams/${teamId}/leave`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        showToast(
          json.data?.action === 'archived'
            ? 'You were the last member. Team has been archived.'
            : json.data?.action === 'transferred_and_left'
            ? 'Ownership transferred and you left the team.'
            : 'You left the team.',
          'success'
        );
        router.push('/teamspace');
      } else {
        showToast(json.error?.message || 'Failed to leave team', 'error');
      }
    } catch {
      showToast('Error leaving team', 'error');
    } finally {
      setIsLeaving(false);
      setShowLeaveModal(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) {
      showToast('Please select a member to transfer ownership to', 'error');
      return;
    }
    setIsTransferring(true);
    try {
      const res = await fetch(`/api/v1/teams/${teamId}/transfer-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerUserId: selectedNewOwner })
      });
      const json = await res.json();
      if (json.success) {
        showToast('Ownership transferred successfully', 'success');
        setShowTransferModal(false);
        void loadTeamData();
      } else {
        showToast(json.error?.message || 'Failed to transfer ownership', 'error');
      }
    } catch {
      showToast('Error transferring ownership', 'error');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProject(true);
    try {
      const stackArray = projectForm.techStack
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const res = await fetch(`/api/v1/teams/${teamId}/project`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: projectForm.title,
          problemStatement: projectForm.problemStatement,
          solutionApproach: projectForm.solutionApproach,
          techStack: stackArray,
          repositoryUrl: projectForm.repositoryUrl,
          demoUrl: projectForm.demoUrl
        })
      });

      const json = await res.json();
      if (json.success && json.data?.project) {
        setProject(json.data.project);
        showToast('Project context saved', 'success');
        setShowProjectModal(false);
      } else {
        showToast(json.error?.message || 'Failed to save project', 'error');
      }
    } catch {
      showToast('Error saving project', 'error');
    } finally {
      setSavingProject(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      showToast('Task title is required', 'error');
      return;
    }

    setCreatingTask(true);
    try {
      const res = await fetch(`/api/v1/teams/${teamId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          assignedTo: taskForm.assignedTo || null,
          dueAt: taskForm.dueAt ? new Date(taskForm.dueAt).toISOString() : null
        })
      });

      const json = await res.json();
      if (json.success && json.data?.task) {
        showToast('Task created', 'success');
        setShowTaskModal(false);
        setTaskForm({
          title: '',
          description: '',
          priority: 'medium',
          assignedTo: '',
          dueAt: ''
        });
        void loadTasksData();
      } else {
        showToast(json.error?.message || 'Failed to create task', 'error');
      }
    } catch {
      showToast('Error creating task', 'error');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`/api/v1/teams/${teamId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const json = await res.json();
      if (json.success && json.data?.task) {
        showToast(`Task status updated`, 'success');
        void loadTasksData();
      } else {
        showToast(json.error?.message || 'Failed to update task status', 'error');
      }
    } catch {
      showToast('Error updating task', 'error');
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    if (!confirm('Archive this task?')) return;
    try {
      const res = await fetch(`/api/v1/teams/${teamId}/tasks/${taskId}/archive`, {
        method: 'POST'
      });

      const json = await res.json();
      if (json.success) {
        showToast('Task archived', 'success');
        setTasks(prev => prev.filter(t => t.id !== taskId));
        void loadTasksData();
      } else {
        showToast(json.error?.message || 'Failed to archive task', 'error');
      }
    } catch {
      showToast('Error archiving task', 'error');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#060816] text-slate-100 selection:bg-[#8B5CF6] selection:text-white">
        <Navbar />
        <div className="pt-28 pb-16 px-4 max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-6 w-32 bg-purple-950/60 rounded" />
          <div className="h-40 bg-slate-900/60 rounded-3xl" />
          <div className="h-64 bg-slate-900/40 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-[#060816] text-slate-100 selection:bg-[#8B5CF6] selection:text-white">
        <Navbar />
        <div className="pt-28 pb-16 px-4 max-w-md mx-auto min-h-[70vh] flex items-center justify-center">
          <div className="w-full p-8 rounded-3xl border border-purple-900/20 bg-[#0D1224]/80 backdrop-blur-xl text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Team Not Found</h2>
            <p className="text-xs text-slate-400">
              You may not be a member of this team, or it may have been archived.
            </p>
            <div className="pt-2">
              <Link
                href="/teamspace"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to TeamSpace</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === team.ownerUserId;
  const isEditable = team.status === 'forming' || team.status === 'active';
  const otherActiveMembers = (team.members || []).filter(m => m.userId !== user?.id && m.membershipStatus === 'active');
  const successorMember = otherActiveMembers[0]?.profile?.fullName || 'the next member';

  return (
    <div className="min-h-screen bg-[#060816] text-slate-100 selection:bg-[#8B5CF6] selection:text-white">
      <Navbar />

      <main className="pt-28 pb-20 px-4 sm:px-6 max-w-4xl mx-auto space-y-8">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-2xl border backdrop-blur-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/90 border-rose-500/40 text-rose-200'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
            <span>{toast.text}</span>
          </div>
        )}

        {/* ─── BREADCRUMBS & ESCAPE ROUTE ─── */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition">
              Home
            </Link>
            <span>/</span>
            <Link href="/teamspace" className="hover:text-white transition">
              TeamSpace
            </Link>
            <span>/</span>
            <span className="text-slate-200 font-medium truncate max-w-[200px]">{team.name}</span>
          </div>

          <Link
            href="/teamspace"
            className="text-slate-400 hover:text-white transition flex items-center gap-1 text-[11px]"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Back to TeamSpace</span>
          </Link>
        </div>

        {/* ─── TEAM IDENTITY SURFACE ─── */}
        <div className="rounded-3xl border border-purple-900/30 p-6 md:p-8 bg-[#0D1224]/80 backdrop-blur-xl shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {team.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-950/60 text-purple-300 border border-purple-800/60">
                  {team.status}
                </span>
              </div>

              <p className="text-xs text-purple-300 font-semibold">
                {team.hackathon?.title || 'Hackathon Team'}
              </p>

              {team.description && (
                <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                  {team.description}
                </p>
              )}
            </div>

            {/* Top Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {team.memberCount < team.maxMembers && isEditable && (
                <Link
                  href={`/teamspace/discover?hackathon=${team.hackathonId}`}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Find Teammates</span>
                </Link>
              )}

              {isOwner && otherActiveMembers.length > 0 && isEditable && (
                <button
                  onClick={() => setShowTransferModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                  <span>Transfer</span>
                </button>
              )}

              <button
                onClick={() => setShowLeaveModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/30 text-slate-400 hover:text-rose-300 border border-slate-800 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave</span>
              </button>
            </div>
          </div>

          {/* Clean Navigation Tabs */}
          <div className="flex items-center gap-2 pt-4 border-t border-purple-900/20 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('project')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'project'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>Project</span>
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'tasks'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tasks</span>
              {taskProgress.totalTasks > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 text-[10px]">
                  {taskProgress.doneCount}/{taskProgress.totalTasks}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ─── TAB 1: OVERVIEW ─── */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Team Intelligence Surface */}
            <TeamIntelligenceCard
              intelligence={intelligence}
              loading={intelLoading}
            />

            {/* Team Members List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Team Members ({team.memberCount} / {team.maxMembers})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(team.members || []).map(member => (
                  <div
                    key={member.id}
                    className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-500/30 flex items-center justify-center text-purple-200 font-bold text-xs shrink-0">
                        {member.profile?.fullName?.charAt(0).toUpperCase() || 'M'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-white truncate">
                            {member.profile?.fullName || 'Team Member'}
                          </h4>
                          {member.role === 'owner' && (
                            <span title="Team Owner">
                              <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {member.role}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        member.membershipStatus === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {member.membershipStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Outgoing Invitations */}
            {invitations.length > 0 && isOwnerOrLead && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Pending Invitations ({invitations.length})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {invitations.map(inv => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <h4 className="font-bold text-white truncate">
                          {inv.invitee?.fullName || 'Invited Builder'}
                        </h4>
                        <span className="text-[10px] text-slate-500">
                          Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                        </span>
                      </div>

                      {isEditable && (
                        <button
                          onClick={() => handleCancelInvite(inv.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-rose-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: PROJECT CONTEXT ─── */}
        {activeTab === 'project' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Project Direction</h2>
                <p className="text-xs text-slate-400">Problem statement, technical approach, and links.</p>
              </div>

              {isOwnerOrLead && isEditable && (
                <button
                  onClick={() => setShowProjectModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{project ? 'Edit Project' : 'Add Project Context'}</span>
                </button>
              )}
            </div>

            {projectLoading ? (
              <div className="p-8 rounded-2xl border border-slate-800 bg-[#0D1224]/40 text-center text-xs text-slate-400 animate-pulse">
                Loading project context...
              </div>
            ) : project ? (
              <div className="rounded-2xl border border-purple-900/20 bg-[#0D1224]/80 p-6 space-y-5 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Project Title</span>
                  <h3 className="text-base font-bold text-white mt-1">
                    {project.title || 'Untitled Hackathon Project'}
                  </h3>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Problem Statement</span>
                  <p className="text-slate-300 mt-1 leading-relaxed whitespace-pre-line">
                    {project.problemStatement || 'No problem statement defined yet.'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Solution Approach</span>
                  <p className="text-slate-300 mt-1 leading-relaxed whitespace-pre-line">
                    {project.solutionApproach || 'No solution approach defined yet.'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Tech Stack</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(project.techStack || []).length > 0 ? (
                      project.techStack.map(stack => (
                        <span
                          key={stack}
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-900 text-slate-200 border border-slate-800 flex items-center gap-1"
                        >
                          <Code className="w-3 h-3 text-purple-400" />
                          <span>{stack}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500">No technologies listed yet.</span>
                    )}
                  </div>
                </div>

                {(project.repositoryUrl || project.demoUrl) && (
                  <div className="pt-3 border-t border-purple-900/20 flex flex-wrap gap-4">
                    {project.repositoryUrl && (
                      <a
                        href={project.repositoryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 underline"
                      >
                        <FolderGit2 className="w-3.5 h-3.5" />
                        <span>Code Repository</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {project.demoUrl && (
                      <a
                        href={project.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 underline"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Live Demo</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-purple-900/20 bg-[#0D1224]/40 text-center space-y-3">
                <FolderGit2 className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-white">No Project Context Added</h3>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Define problem statement, approach, and tech stack to coordinate your team.
                  </p>
                </div>
                {isOwnerOrLead && isEditable && (
                  <button
                    onClick={() => setShowProjectModal(true)}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Add Project Context
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: TASKS & EXECUTION ─── */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Task Board</h2>
                <p className="text-xs text-slate-400">Track progress and assign responsibilities.</p>
              </div>

              {isEditable && (
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create Task</span>
                </button>
              )}
            </div>

            {tasksLoading ? (
              <div className="p-8 rounded-2xl border border-slate-800 bg-[#0D1224]/40 text-center text-xs text-slate-400 animate-pulse">
                Loading tasks...
              </div>
            ) : tasks.length === 0 ? (
              <div className="p-8 rounded-2xl border border-purple-900/20 bg-[#0D1224]/40 text-center space-y-3">
                <CheckSquare className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-white">No tasks created yet</h3>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Break down your project into tasks to stay organized during the hackathon.
                  </p>
                </div>
                {isEditable && (
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Create First Task
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(['todo', 'in_progress', 'blocked', 'done'] as TaskStatus[]).map(statusCol => {
                  const statusTasks = tasks.filter(t => t.status === statusCol);
                  const statusLabel =
                    statusCol === 'todo'
                      ? 'Todo'
                      : statusCol === 'in_progress'
                      ? 'In Progress'
                      : statusCol === 'blocked'
                      ? 'Blocked'
                      : 'Done';

                  return (
                    <div key={statusCol} className="space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-purple-900/20 text-xs">
                        <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                          {statusLabel}
                        </span>
                        <span className="font-mono text-slate-500 text-[10px]">
                          {statusTasks.length}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {statusTasks.map(task => (
                          <div
                            key={task.id}
                            className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold text-white leading-tight">{task.title}</h4>
                              <button
                                onClick={() => handleArchiveTask(task.id)}
                                className="text-slate-500 hover:text-rose-400 cursor-pointer p-0.5"
                                title="Archive Task"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            {task.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-2">{task.description}</p>
                            )}

                            {/* Status dropdown */}
                            <div className="pt-1 flex items-center justify-between">
                              <select
                                value={task.status}
                                onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as TaskStatus)}
                                className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700 focus:outline-none"
                              >
                                <option value="todo">Todo</option>
                                <option value="in_progress">In Progress</option>
                                <option value="blocked">Blocked</option>
                                <option value="done">Done</option>
                              </select>

                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                task.priority === 'high'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : task.priority === 'medium'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {task.priority}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── LEAVE TEAM CONFIRMATION MODAL ─── */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-purple-900/40 bg-[#0D1224] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Leave Team?</h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {team.memberCount === 1
                ? 'You are the only member in this team. Leaving will archive this team workspace.'
                : isOwner
                ? `Ownership will automatically transfer to ${successorMember}.`
                : 'Are you sure you want to leave this team workspace?'}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmLeaveTeam}
                disabled={isLeaving}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                {isLeaving ? 'Leaving...' : team.memberCount === 1 ? 'Leave & Archive' : 'Leave Team'}
              </button>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TRANSFER OWNERSHIP MODAL ─── */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-purple-900/40 bg-[#0D1224] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Transfer Ownership</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Select an active team member to become the new owner:
            </p>

            <div className="space-y-1.5">
              {otherActiveMembers.map(m => (
                <button
                  key={m.userId}
                  onClick={() => setSelectedNewOwner(m.userId)}
                  className={`w-full p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                    selectedNewOwner === m.userId
                      ? 'bg-purple-950/60 border-purple-500 text-white'
                      : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>{m.profile?.fullName || 'Team Member'}</span>
                  {selectedNewOwner === m.userId && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleTransferOwnership}
                disabled={isTransferring || !selectedNewOwner}
                className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                {isTransferring ? 'Transferring...' : 'Confirm Transfer'}
              </button>
              <button
                onClick={() => setShowTransferModal(false)}
                className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PROJECT CONTEXT MODAL ─── */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-purple-900/40 bg-[#0D1224] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Project Direction</h3>
              <button onClick={() => setShowProjectModal(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">Project Title</label>
                <input
                  type="text"
                  placeholder="e.g. AI-Powered Healthcare Triage"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/40 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">Problem Statement</label>
                <textarea
                  rows={2}
                  placeholder="What core problem are you solving?"
                  value={projectForm.problemStatement}
                  onChange={(e) => setProjectForm({ ...projectForm, problemStatement: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/40 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">Solution Approach</label>
                <textarea
                  rows={2}
                  placeholder="How will your team build it?"
                  value={projectForm.solutionApproach}
                  onChange={(e) => setProjectForm({ ...projectForm, solutionApproach: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/40 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">Tech Stack (comma separated)</label>
                <input
                  type="text"
                  placeholder="Next.js, Python, Supabase, PyTorch"
                  value={projectForm.techStack}
                  onChange={(e) => setProjectForm({ ...projectForm, techStack: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/40 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300 block">Repository URL</label>
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={projectForm.repositoryUrl}
                    onChange={(e) => setProjectForm({ ...projectForm, repositoryUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/40 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300 block">Demo URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={projectForm.demoUrl}
                    onChange={(e) => setProjectForm({ ...projectForm, demoUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/40 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingProject}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {savingProject ? 'Saving...' : 'Save Project'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CREATE TASK MODAL ─── */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-purple-900/40 bg-[#0D1224] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create Task</h3>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Set up Supabase Auth"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/40 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">Description</label>
                <textarea
                  rows={2}
                  placeholder="Task details or acceptance criteria..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/40 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300 block">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/40 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300 block">Assignee</label>
                  <select
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/40 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Unassigned</option>
                    {(team.members || []).map(m => (
                      <option key={m.userId} value={m.userId}>
                        {m.profile?.fullName || 'Team Member'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {creatingTask ? 'Creating...' : 'Create Task'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
