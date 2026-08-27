/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Users,
  ArrowLeft,
  Plus,
  CheckCircle2,
  AlertCircle,
  Crown,
  LogOut,
  X,
  ExternalLink,
  Clock,
  ArrowRightLeft,
  FolderGit2,
  CheckSquare,
  LayoutList,
  Edit3,
  Trash2,
  AlertTriangle,
  Calendar,
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

  const handleLeaveTeam = async () => {
    if (!confirm('Are you sure you want to leave this team?')) return;
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
        showToast('Ownership transferred successfully!', 'success');
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
        showToast('Project context saved successfully!', 'success');
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
        showToast('Task created successfully!', 'success');
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
        showToast(`Task status updated to ${newStatus}`, 'success');
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
      <div className="min-h-screen bg-[#070913] text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <span className="text-sm text-slate-400 font-medium">Loading Team Workspace...</span>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-[#070913] text-slate-100 p-8 flex flex-col items-center justify-center">
        <div className="glass-card max-w-md w-full p-6 text-center space-y-4 rounded-2xl border border-slate-800">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold">Team Workspace Not Found</h2>
          <p className="text-sm text-slate-400">
            You may not be an active member of this team, or the team may have been removed.
          </p>
          <Link
            href="/teamspace"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to TeamSpace
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === team.ownerUserId;
  const isEditable = team.status === 'forming' || team.status === 'active';
  const otherActiveMembers = (team.members || []).filter(m => m.userId !== user?.id && m.membershipStatus === 'active');

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-xl flex items-center gap-2 text-sm font-semibold animate-in fade-in slide-in-from-bottom-5 ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        )}

        {/* Back Link */}
        <div>
          <Link
            href="/teamspace"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-purple-400 transition font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to TeamSpace Hub</span>
          </Link>
        </div>

        {/* Team Header Card */}
        <div className="glass-card rounded-3xl border border-purple-900/40 p-6 md:p-8 bg-[#0D1224]/80 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-950 text-purple-300 border border-purple-800">
                  {team.hackathon?.title || 'Hackathon Team'}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    team.status === 'forming'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                      : team.status === 'active'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {team.status}
                </span>
                {!isEditable && (
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-900 text-slate-400 border border-slate-800 flex items-center gap-1">
                    Read-Only Workspace
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {team.name}
              </h1>

              <p className="text-sm text-slate-400 max-w-2xl">
                {team.description || 'Collaborative team workspace for building together.'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {team.memberCount < team.maxMembers && isEditable && (
                <Link
                  href={`/teamspace/discover?hackathon=${team.hackathonId}`}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-950/50 flex items-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Find Teammates</span>
                </Link>
              )}

              {isOwner && otherActiveMembers.length > 0 && isEditable && (
                <button
                  onClick={() => setShowTransferModal(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-900/50 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer Ownership</span>
                </button>
              )}

              <button
                onClick={handleLeaveTeam}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave Team</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-8 pt-6 border-t border-purple-950/60 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('project')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'project'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <FolderGit2 className="w-4 h-4" />
              <span>Project Context</span>
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Tasks & Execution</span>
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
            {/* Team Intelligence & Compatibility Breakdown */}
            <TeamIntelligenceCard
              intelligence={intelligence}
              loading={intelLoading}
            />

            {/* Task Progress Summary Strip */}
            {taskProgress.totalTasks > 0 && (
              <div className="glass-card rounded-2xl border border-purple-900/40 p-6 bg-[#0D1224]/80 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-purple-400" />
                    <h3 className="text-base font-bold text-white">Execution Progress</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-300">
                    {taskProgress.doneCount} / {taskProgress.totalTasks} Tasks Completed ({taskProgress.completionPercentage}%)
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${taskProgress.completionPercentage}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Todo</span>
                    <p className="text-lg font-black text-white">{taskProgress.todoCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-900/40 text-center">
                    <span className="text-[10px] uppercase font-bold text-blue-300">In Progress</span>
                    <p className="text-lg font-black text-blue-200">{taskProgress.inProgressCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/40 text-center">
                    <span className="text-[10px] uppercase font-bold text-rose-300">Blocked</span>
                    <p className="text-lg font-black text-rose-200">{taskProgress.blockedCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-300">Done</span>
                    <p className="text-lg font-black text-emerald-200">{taskProgress.doneCount}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Team Roster Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span>Team Members ({team.memberCount} / {team.maxMembers})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(team.members || []).map(member => (
                  <div
                    key={member.id}
                    className="glass-card rounded-2xl border border-purple-900/30 p-4 bg-[#0D1224]/80 backdrop-blur-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-600/40 flex items-center justify-center text-purple-300 font-bold text-sm shrink-0">
                        {member.profile?.fullName?.charAt(0).toUpperCase() || 'M'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white truncate">
                            {member.profile?.fullName || 'Team Member'}
                          </h4>
                          {member.role === 'owner' && (
                            <span title="Team Owner">
                              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 capitalize">
                          {member.role}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        member.membershipStatus === 'active'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-900 text-slate-500 border border-slate-800'
                      }`}
                    >
                      {member.membershipStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Invitations Section */}
            {invitations.length > 0 && isOwnerOrLead && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <span>Pending Outgoing Invitations ({invitations.length})</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {invitations.map(inv => (
                    <div
                      key={inv.id}
                      className="glass-card rounded-2xl border border-purple-900/30 p-4 bg-[#0D1224]/80 backdrop-blur-xl flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                          Invited Teammate
                        </span>
                        <h4 className="text-sm font-bold text-white truncate">
                          {inv.invitee?.fullName || 'Developer'}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                        </span>
                      </div>

                      {isEditable && (
                        <button
                          onClick={() => handleCancelInvite(inv.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-300 text-xs font-bold border border-slate-800 flex items-center gap-1 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancel</span>
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
                <h2 className="text-xl font-bold text-white">Project Direction</h2>
                <p className="text-xs text-slate-400">Define your problem statement, technical approach, and deliverables.</p>
              </div>

              {isOwnerOrLead && isEditable && (
                <button
                  onClick={() => setShowProjectModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{project ? 'Edit Project' : 'Add Project Context'}</span>
                </button>
              )}
            </div>

            {projectLoading ? (
              <div className="glass-card rounded-2xl border border-slate-800 p-8 text-center text-slate-400 text-sm">
                Loading project context...
              </div>
            ) : project ? (
              <div className="space-y-6">
                <div className="glass-card rounded-2xl border border-purple-900/40 p-6 bg-[#0D1224]/80 backdrop-blur-xl space-y-6">
                  {/* Title */}
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Project Title</span>
                    <h3 className="text-xl font-extrabold text-white mt-1">
                      {project.title || 'Untitled Hackathon Project'}
                    </h3>
                  </div>

                  {/* Problem Statement */}
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Problem Statement</span>
                    <p className="text-sm text-slate-300 mt-1 leading-relaxed whitespace-pre-line">
                      {project.problemStatement || 'No problem statement defined yet.'}
                    </p>
                  </div>

                  {/* Solution Approach */}
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Solution Approach</span>
                    <p className="text-sm text-slate-300 mt-1 leading-relaxed whitespace-pre-line">
                      {project.solutionApproach || 'No solution approach defined yet.'}
                    </p>
                  </div>

                  {/* Tech Stack */}
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Technology Stack</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(project.techStack || []).length > 0 ? (
                        project.techStack.map(stack => (
                          <span
                            key={stack}
                            className="px-2.5 py-1 rounded-lg text-xs font-mono bg-purple-950/80 text-purple-300 border border-purple-800 flex items-center gap-1.5"
                          >
                            <Code className="w-3 h-3 text-purple-400" />
                            {stack}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 font-mono">No technologies tagged yet.</span>
                      )}
                    </div>
                  </div>

                  {/* Deliverables / Links */}
                  {(project.repositoryUrl || project.demoUrl) && (
                    <div className="pt-4 border-t border-purple-950/60 flex flex-wrap gap-4">
                      {project.repositoryUrl && (
                        <a
                          href={project.repositoryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 underline"
                        >
                          <FolderGit2 className="w-4 h-4" />
                          <span>Code Repository</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {project.demoUrl && (
                        <a
                          href={project.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 underline"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Live Demo / Prototype</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-2xl border border-slate-800/80 p-10 text-center space-y-4 bg-[#0D1224]/50">
                <FolderGit2 className="w-12 h-12 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Give your team a starting point</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Add a project title and problem statement to align team execution during the hackathon.
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
                <h2 className="text-xl font-bold text-white">Task Board</h2>
                <p className="text-xs text-slate-400">Break your project into small tasks and track ownership.</p>
              </div>

              {isEditable && (
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Task</span>
                </button>
              )}
            </div>

            {tasksLoading ? (
              <div className="glass-card rounded-2xl border border-slate-800 p-8 text-center text-slate-400 text-sm">
                Loading tasks...
              </div>
            ) : tasks.length === 0 ? (
              <div className="glass-card rounded-2xl border border-slate-800/80 p-10 text-center space-y-4 bg-[#0D1224]/50">
                <CheckSquare className="w-12 h-12 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">No tasks created yet</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Break your idea into small tasks to get started. Assign responsibilities to team members.
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Column: Todo */}
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
                    <div key={statusCol} className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-purple-950/60">
                        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              statusCol === 'todo'
                                ? 'bg-slate-400'
                                : statusCol === 'in_progress'
                                ? 'bg-blue-400'
                                : statusCol === 'blocked'
                                ? 'bg-rose-400'
                                : 'bg-emerald-400'
                            }`}
                          />
                          {statusLabel}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-900">
                          {statusTasks.length}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {statusTasks.map(task => {
                          return (
                            <div
                              key={task.id}
                              className="glass-card rounded-xl border border-purple-900/30 p-4 bg-[#0D1224]/80 backdrop-blur-xl space-y-3 relative group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-xs font-bold text-white leading-snug">{task.title}</h4>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                                    task.priority === 'critical'
                                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                      : task.priority === 'high'
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                      : task.priority === 'medium'
                                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                                  }`}
                                >
                                  {task.priority}
                                </span>
                              </div>

                              {task.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-2">{task.description}</p>
                              )}

                              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-purple-950/40">
                                <span className="font-medium text-slate-300">
                                  {task.assignee ? task.assignee.fullName || 'Assigned' : 'Unassigned'}
                                </span>

                                {task.dueAt && (
                                  <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                                    <Calendar className="w-3 h-3 text-purple-400" />
                                    {new Date(task.dueAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>

                              {/* Task Quick Controls */}
                              {isEditable && (
                                <div className="pt-2 flex items-center justify-between gap-1 border-t border-purple-950/30">
                                  <select
                                    value={task.status}
                                    onChange={e => handleUpdateTaskStatus(task.id, e.target.value as TaskStatus)}
                                    aria-label={`Change status for task: ${task.title}`}
                                    className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 rounded px-1.5 py-1 focus:outline-none focus:border-purple-500 cursor-pointer"
                                  >
                                    <option value="todo">Todo</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="blocked">Blocked</option>
                                    <option value="done">Done</option>
                                  </select>

                                  {(isOwnerOrLead || task.createdBy === user?.id) && (
                                    <button
                                      onClick={() => handleArchiveTask(task.id)}
                                      title="Archive task"
                                      aria-label={`Archive task: ${task.title}`}
                                      className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── MODAL: EDIT PROJECT ─── */}
        {showProjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="glass-card max-w-lg w-full p-6 rounded-3xl border border-purple-900/60 bg-[#0D1224] space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FolderGit2 className="w-5 h-5 text-purple-400" />
                  <span>Project Direction</span>
                </h3>
                <button
                  onClick={() => setShowProjectModal(false)}
                  aria-label="Close project direction dialog"
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProject} className="space-y-4">
                <div>
                  <label htmlFor="project-title-input" className="block text-xs font-bold text-slate-300 mb-1">Project Title</label>
                  <input
                    id="project-title-input"
                    type="text"
                    required
                    value={projectForm.title}
                    onChange={e => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. AI-Powered Autonomous Agent Platform"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="project-problem-input" className="block text-xs font-bold text-slate-300 mb-1">Problem Statement</label>
                  <textarea
                    id="project-problem-input"
                    rows={3}
                    value={projectForm.problemStatement}
                    onChange={e => setProjectForm(prev => ({ ...prev, problemStatement: e.target.value }))}
                    placeholder="What real problem is this hackathon project solving?"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="project-solution-input" className="block text-xs font-bold text-slate-300 mb-1">Solution Approach</label>
                  <textarea
                    id="project-solution-input"
                    rows={3}
                    value={projectForm.solutionApproach}
                    onChange={e => setProjectForm(prev => ({ ...prev, solutionApproach: e.target.value }))}
                    placeholder="Describe your architecture, technical design, and key features."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="project-tech-stack-input" className="block text-xs font-bold text-slate-300 mb-1">Tech Stack (Comma-separated)</label>
                  <input
                    id="project-tech-stack-input"
                    type="text"
                    value={projectForm.techStack}
                    onChange={e => setProjectForm(prev => ({ ...prev, techStack: e.target.value }))}
                    placeholder="e.g. Next.js, TypeScript, Supabase, TailwindCSS, PyTorch"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="project-repo-url-input" className="block text-xs font-bold text-slate-300 mb-1">Repository URL</label>
                    <input
                      id="project-repo-url-input"
                      type="url"
                      value={projectForm.repositoryUrl}
                      onChange={e => setProjectForm(prev => ({ ...prev, repositoryUrl: e.target.value }))}
                      placeholder="https://github.com/..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="project-demo-url-input" className="block text-xs font-bold text-slate-300 mb-1">Demo / Prototype URL</label>
                    <input
                      id="project-demo-url-input"
                      type="url"
                      value={projectForm.demoUrl}
                      onChange={e => setProjectForm(prev => ({ ...prev, demoUrl: e.target.value }))}
                      placeholder="https://my-demo.vercel.app"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-purple-950/60">
                  <button
                    type="button"
                    onClick={() => setShowProjectModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProject}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {savingProject ? 'Saving...' : 'Save Project Context'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL: CREATE TASK ─── */}
        {showTaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="glass-card max-w-md w-full p-6 rounded-3xl border border-purple-900/60 bg-[#0D1224] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-purple-400" />
                  <span>Create Team Task</span>
                </h3>
                <button
                  onClick={() => setShowTaskModal(false)}
                  aria-label="Close create team task dialog"
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label htmlFor="task-title-input" className="block text-xs font-bold text-slate-300 mb-1">Task Title *</label>
                  <input
                    id="task-title-input"
                    type="text"
                    required
                    value={taskForm.title}
                    onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Implement authentication and session cookie"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="task-description-input" className="block text-xs font-bold text-slate-300 mb-1">Description (Optional)</label>
                  <textarea
                    id="task-description-input"
                    rows={2}
                    value={taskForm.description}
                    onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Details or acceptance criteria"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="task-priority-input" className="block text-xs font-bold text-slate-300 mb-1">Priority</label>
                    <select
                      id="task-priority-input"
                      value={taskForm.priority}
                      onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="task-assignee-input" className="block text-xs font-bold text-slate-300 mb-1">Assignee</label>
                    <select
                      id="task-assignee-input"
                      value={taskForm.assignedTo}
                      onChange={e => setTaskForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {(team.members || [])
                        .filter(m => m.membershipStatus === 'active')
                        .map(m => (
                          <option key={m.userId} value={m.userId}>
                            {m.profile?.fullName || m.userId} {m.userId === user?.id ? '(You)' : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="task-due-date-input" className="block text-xs font-bold text-slate-300 mb-1">Due Date (Optional)</label>
                  <input
                    id="task-due-date-input"
                    type="date"
                    value={taskForm.dueAt}
                    onChange={e => setTaskForm(prev => ({ ...prev, dueAt: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-purple-950/60">
                  <button
                    type="button"
                    onClick={() => setShowTaskModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTask}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {creatingTask ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL: TRANSFER OWNERSHIP ─── */}
        {showTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="glass-card max-w-md w-full p-6 rounded-3xl border border-purple-900/60 bg-[#0D1224] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span>Transfer Team Ownership</span>
                </h3>
                <button
                  onClick={() => setShowTransferModal(false)}
                  aria-label="Close transfer team ownership dialog"
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Select an active team member to become the new team owner. You will remain an active member of this team.
              </p>

              <div className="space-y-2">
                {otherActiveMembers.map(m => (
                  <label
                    key={m.userId}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      selectedNewOwner === m.userId
                        ? 'bg-purple-950/60 border-purple-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="newOwner"
                        value={m.userId}
                        checked={selectedNewOwner === m.userId}
                        onChange={() => setSelectedNewOwner(m.userId)}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-xs font-semibold">{m.profile?.fullName || 'Teammate'}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 capitalize">{m.role}</span>
                  </label>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-900/40 flex items-start gap-2 text-[11px] text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>This action is immediate. The new owner will gain full management rights over this team.</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-purple-950/60">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTransferOwnership}
                  disabled={!selectedNewOwner || isTransferring}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isTransferring ? 'Transferring...' : 'Confirm Transfer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
