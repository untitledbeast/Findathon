/* eslint-disable */
import assert from 'node:assert';
import { TeamProjectEntity } from '../lib/domain/entities/team-project.entity';
import { TeamTaskEntity } from '../lib/domain/entities/team-task.entity';
import { TeamEntity, TeamMemberEntity } from '../lib/domain/entities/team.entity';
import { TeamProjectCommandService } from '../lib/services/team-project-command.service';
import { TeamProjectQueryService } from '../lib/services/team-project-query.service';
import { TeamTaskCommandService } from '../lib/services/team-task-command.service';
import { TeamTaskQueryService } from '../lib/services/team-task-query.service';
import { ITeamRepository } from '../lib/domain/repositories/team.repository.interface';
import { ITeamProjectRepository } from '../lib/domain/repositories/team-project.repository.interface';
import { ITeamTaskRepository } from '../lib/domain/repositories/team-task.repository.interface';
import { IHackathonRepository } from '../lib/domain/repositories/hackathon.repository.interface';
import { INotificationRepository } from '../lib/domain/repositories/notification.repository.interface';
import { IProfileRepository } from '../lib/domain/repositories/profile.repository.interface';
import { createRequestContext } from '../lib/context/request-context';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError
} from '../lib/errors';

// ─── IN-MEMORY MOCKS ─────────────────────────────────────────────

class MockTeamProjectRepository implements ITeamProjectRepository {
  private projects = new Map<string, TeamProjectEntity>();

  async findByTeamId(teamId: string): Promise<TeamProjectEntity | null> {
    for (const p of this.projects.values()) {
      if (p.teamId === teamId) return p;
    }
    return null;
  }

  async create(project: TeamProjectEntity): Promise<TeamProjectEntity> {
    if (await this.findByTeamId(project.teamId)) {
      throw new Error('Unique constraint violated: team already has a project');
    }
    this.projects.set(project.id, project);
    return project;
  }

  async update(project: TeamProjectEntity): Promise<TeamProjectEntity> {
    this.projects.set(project.id, project);
    return project;
  }

  async delete(id: string): Promise<void> {
    this.projects.delete(id);
  }
}

class MockTeamTaskRepository implements ITeamTaskRepository {
  private tasks = new Map<string, TeamTaskEntity>();

  async findById(id: string): Promise<TeamTaskEntity | null> {
    return this.tasks.get(id) || null;
  }

  async findByTeamId(teamId: string, includeArchived = false): Promise<TeamTaskEntity[]> {
    return Array.from(this.tasks.values()).filter(t => {
      if (t.teamId !== teamId) return false;
      if (!includeArchived && t.isArchived()) return false;
      return true;
    });
  }

  async findByProjectId(projectId: string, includeArchived = false): Promise<TeamTaskEntity[]> {
    return Array.from(this.tasks.values()).filter(t => {
      if (t.projectId !== projectId) return false;
      if (!includeArchived && t.isArchived()) return false;
      return true;
    });
  }

  async create(task: TeamTaskEntity): Promise<TeamTaskEntity> {
    this.tasks.set(task.id, task);
    return task;
  }

  async update(task: TeamTaskEntity): Promise<TeamTaskEntity> {
    this.tasks.set(task.id, task);
    return task;
  }

  async delete(id: string): Promise<void> {
    this.tasks.delete(id);
  }

  async archive(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (task) {
      const archived = new TeamTaskEntity({
        ...task.toJSON(),
        archivedAt: Date.now(),
        updatedAt: Date.now()
      });
      this.tasks.set(id, archived);
    }
  }
}

class MockTeamRepository implements ITeamRepository {
  public teams = new Map<string, TeamEntity>();
  public members: TeamMemberEntity[] = [];

  async getTeamById(id: string): Promise<TeamEntity | null> {
    return this.teams.get(id) || null;
  }
  async findById(id: string): Promise<TeamEntity | null> {
    return this.teams.get(id) || null;
  }
  async getTeamsByHackathon(hackathonId: string): Promise<TeamEntity[]> {
    return Array.from(this.teams.values()).filter(t => t.hackathonId === hackathonId);
  }
  async findByHackathonId(hackathonId: string): Promise<TeamEntity[]> {
    return Array.from(this.teams.values()).filter(t => t.hackathonId === hackathonId);
  }
  async findByOwnerUserId(ownerUserId: string): Promise<TeamEntity[]> {
    return Array.from(this.teams.values()).filter(t => t.ownerUserId === ownerUserId);
  }
  async getTeamsByUserId(userId: string): Promise<TeamEntity[]> {
    const teamIds = this.members.filter(m => m.userId === userId && m.isActive()).map(m => m.teamId);
    return Array.from(this.teams.values()).filter(t => teamIds.includes(t.id));
  }
  async findByUserId(userId: string): Promise<TeamEntity[]> {
    return this.getTeamsByUserId(userId);
  }
  async getActiveTeamForUserAndHackathon(userId: string, hackathonId: string): Promise<TeamEntity | null> {
    const userTeams = await this.getTeamsByUserId(userId);
    return userTeams.find(t => t.hackathonId === hackathonId && (t.status === 'forming' || t.status === 'active')) || null;
  }
  async createTeam(team: TeamEntity): Promise<TeamEntity> {
    this.teams.set(team.id, team);
    return team;
  }
  async updateTeam(team: TeamEntity): Promise<TeamEntity> {
    this.teams.set(team.id, team);
    return team;
  }
  async deleteTeam(id: string): Promise<void> {
    this.teams.delete(id);
  }
  async getMembersByTeamId(teamId: string): Promise<TeamMemberEntity[]> {
    return this.members.filter(m => m.teamId === teamId);
  }
  async getTeamMembers(teamId: string): Promise<TeamMemberEntity[]> {
    return this.getMembersByTeamId(teamId);
  }
  async getMember(teamId: string, userId: string): Promise<TeamMemberEntity | null> {
    return this.members.find(m => m.teamId === teamId && m.userId === userId) || null;
  }
  async addMember(member: TeamMemberEntity): Promise<TeamMemberEntity> {
    this.members.push(member);
    return member;
  }
  async addTeamMember(member: TeamMemberEntity): Promise<TeamMemberEntity> {
    return this.addMember(member);
  }
  async updateMember(member: TeamMemberEntity): Promise<TeamMemberEntity> {
    const idx = this.members.findIndex(m => m.id === member.id);
    if (idx >= 0) this.members[idx] = member;
    else this.members.push(member);
    return member;
  }
  async updateTeamMember(member: TeamMemberEntity): Promise<TeamMemberEntity> {
    return this.updateMember(member);
  }
  async removeMember(teamId: string, userId: string): Promise<void> {
    this.members = this.members.filter(m => !(m.teamId === teamId && m.userId === userId));
  }
  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    return this.removeMember(teamId, userId);
  }
  async createInvitation(): Promise<any> { return null; }
  async getInvitationById(): Promise<any> { return null; }
  async getPendingInvitation(): Promise<any> { return null; }
  async getInvitationsByTeamId(): Promise<any[]> { return []; }
  async getInvitationsByInvitee(): Promise<any[]> { return []; }
  async updateInvitation(): Promise<any> { return null; }
  async getDiscoverableUserIds(): Promise<string[]> { return []; }
  async transferOwnership(teamId: string, currentOwnerId: string, newOwnerId: string): Promise<any> {
    const team = this.teams.get(teamId);
    if (team) {
      const updated = new TeamEntity({ ...team.toJSON(), ownerUserId: newOwnerId });
      this.teams.set(teamId, updated);
      return updated;
    }
    throw new Error('Team not found');
  }
  async leaveTeamWithSuccession(teamId: string, userId: string): Promise<any> {
    return { team: this.teams.get(teamId), action: 'left' };
  }
}

class MockHackathonRepository implements IHackathonRepository {
  async findById(id: string): Promise<any> {
    return { id, title: 'AI Global Hackathon 2026', status: 'approved', isApproved: () => true };
  }
  async findAll(): Promise<any[]> { return []; }
  async create(): Promise<any> { return null; }
  async update(): Promise<any> { return null; }
  async delete(): Promise<void> {}
}

class MockProfileRepository implements IProfileRepository {
  public profiles = new Map<string, any>();
  async findById(id: string): Promise<any> {
    return this.profiles.get(id) || { id, fullName: `User ${id}`, avatarUrl: null };
  }
  async findByEmail(): Promise<any> { return null; }
  async save(p: any): Promise<any> { return p; }
  async delete(): Promise<void> {}
}

class MockNotificationRepository implements INotificationRepository {
  public notifications: any[] = [];
  async create(data: any): Promise<any> {
    const n = { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() };
    this.notifications.push(n);
    return n;
  }
  async createBulk(list: any[]): Promise<void> {
    for (const d of list) this.notifications.push(d);
  }
  async findByUser(): Promise<any> { return { data: this.notifications, total: this.notifications.length }; }
  async findUnreadCount(): Promise<number> { return 0; }
  async markRead(): Promise<void> {}
  async markAllRead(): Promise<void> {}
}

// ─── TEST RUNNER ─────────────────────────────────────────────

async function runAllTests() {
  console.log('======================================================');
  console.log('🧪 RUNNING TEAMSPACE RELEASE 3 WORKSPACE TEST SUITE');
  console.log('======================================================\n');

  // ----------------------------------------------------
  // TEST 1: Pure Domain Progress Calculation
  // ----------------------------------------------------
  {
    // Empty tasks list -> 0%
    const progress0 = TeamTaskEntity.calculateProgress([]);
    assert.strictEqual(progress0.totalTasks, 0);
    assert.strictEqual(progress0.completionPercentage, 0);

    // 4 tasks: 1 todo, 1 in_progress, 1 blocked, 1 done -> 25%
    const tasks = [
      new TeamTaskEntity({
        id: 't1', teamId: 'team_1', projectId: 'p1', title: 'Task 1', description: null,
        status: 'todo', priority: 'medium', assignedTo: 'u1', createdBy: 'u1',
        dueAt: null, completedAt: null, createdAt: 100, updatedAt: 100, archivedAt: null
      }),
      new TeamTaskEntity({
        id: 't2', teamId: 'team_1', projectId: 'p1', title: 'Task 2', description: null,
        status: 'in_progress', priority: 'high', assignedTo: 'u2', createdBy: 'u1',
        dueAt: null, completedAt: null, createdAt: 100, updatedAt: 100, archivedAt: null
      }),
      new TeamTaskEntity({
        id: 't3', teamId: 'team_1', projectId: 'p1', title: 'Task 3', description: null,
        status: 'blocked', priority: 'critical', assignedTo: 'u1', createdBy: 'u1',
        dueAt: null, completedAt: null, createdAt: 100, updatedAt: 100, archivedAt: null
      }),
      new TeamTaskEntity({
        id: 't4', teamId: 'team_1', projectId: 'p1', title: 'Task 4', description: null,
        status: 'done', priority: 'low', assignedTo: 'u2', createdBy: 'u1',
        dueAt: null, completedAt: 200, createdAt: 100, updatedAt: 200, archivedAt: null
      }),
      // Archived task (should be excluded)
      new TeamTaskEntity({
        id: 't5', teamId: 'team_1', projectId: 'p1', title: 'Task 5 Archived', description: null,
        status: 'done', priority: 'low', assignedTo: 'u2', createdBy: 'u1',
        dueAt: null, completedAt: 200, createdAt: 100, updatedAt: 200, archivedAt: 300
      })
    ];

    const progress = TeamTaskEntity.calculateProgress(tasks);
    assert.strictEqual(progress.totalTasks, 4, 'Archived tasks must be excluded from total count');
    assert.strictEqual(progress.todoCount, 1);
    assert.strictEqual(progress.inProgressCount, 1);
    assert.strictEqual(progress.blockedCount, 1);
    assert.strictEqual(progress.doneCount, 1);
    assert.strictEqual(progress.completionPercentage, 25, '1 of 4 tasks done should equal 25%');

    console.log('✅ TEST 1 PASSED: Pure domain progress calculation handles empty, active, and archived tasks.');
  }

  // ----------------------------------------------------
  // TEST 2: Workspace Lifecycle & Read-Only Constraints
  // ----------------------------------------------------
  {
    assert.strictEqual(TeamProjectEntity.isWorkspaceEditable('forming'), true);
    assert.strictEqual(TeamProjectEntity.isWorkspaceEditable('active'), true);
    assert.strictEqual(TeamProjectEntity.isWorkspaceEditable('locked'), true);
    assert.strictEqual(TeamProjectEntity.isWorkspaceEditable('submitted'), false, 'Submitted team is read-only');
    assert.strictEqual(TeamProjectEntity.isWorkspaceEditable('completed'), false, 'Completed team is read-only');
    assert.strictEqual(TeamProjectEntity.isWorkspaceEditable('archived'), false, 'Archived team is read-only');
    assert.strictEqual(TeamProjectEntity.isWorkspaceEditable('active', 'cancelled'), false, 'Cancelled hackathon is read-only');

    console.log('✅ TEST 2 PASSED: Workspace lifecycle strictly enforces read-only boundaries.');
  }

  // ----------------------------------------------------
  // TEST 3: Project Context Creation & Editing Permissions
  // ----------------------------------------------------
  {
    const teamRepo = new MockTeamRepository();
    const projectRepo = new MockTeamProjectRepository();
    const hackathonRepo = new MockHackathonRepository();

    const projectCmd = new TeamProjectCommandService(teamRepo, projectRepo, hackathonRepo);
    const projectQuery = new TeamProjectQueryService(teamRepo, projectRepo);

    // Setup Team and Members: Alice (Owner), Bob (Member), Charlie (Non-member)
    const team = new TeamEntity({
      id: 'team_alpha', hackathonId: 'hack_1', ownerUserId: 'alice_id', name: 'Alpha Builders',
      description: 'Building AI agents', status: 'forming', visibility: 'public', maxMembers: 4,
      createdAt: 1000, updatedAt: 1000
    });
    await teamRepo.createTeam(team);

    await teamRepo.addTeamMember(new TeamMemberEntity({
      id: 'm_alice', teamId: 'team_alpha', userId: 'alice_id', role: 'owner',
      membershipStatus: 'active', joinedAt: 1000, updatedAt: 1000
    }));

    await teamRepo.addTeamMember(new TeamMemberEntity({
      id: 'm_bob', teamId: 'team_alpha', userId: 'bob_id', role: 'member',
      membershipStatus: 'active', joinedAt: 1100, updatedAt: 1100
    }));

    const aliceCtx = createRequestContext({ id: 'alice_id', email: 'alice@test.com', fullName: 'Alice Owner', role: 'user', avatarUrl: null });
    const bobCtx = createRequestContext({ id: 'bob_id', email: 'bob@test.com', fullName: 'Bob Member', role: 'user', avatarUrl: null });
    const charlieCtx = createRequestContext({ id: 'charlie_id', email: 'charlie@test.com', fullName: 'Charlie Outsider', role: 'user', avatarUrl: null });

    // Non-member Charlie cannot view project
    await assert.rejects(async () => {
      await projectQuery.getProject('team_alpha', charlieCtx);
    }, AuthorizationError, 'Non-members must be forbidden from querying project context');

    // Alice (Owner) creates project context
    const createdProject = await projectCmd.upsertProject(
      'team_alpha',
      {
        title: 'Autonomous Code Reviewer',
        problemStatement: 'Manual code reviews are slow.',
        solutionApproach: 'Deterministic static analysis + AST parsing',
        techStack: ['TypeScript', 'Next.js', 'PostgreSQL'],
        repositoryUrl: 'https://github.com/findathon/reviewer'
      },
      aliceCtx
    );

    assert.strictEqual(createdProject.title, 'Autonomous Code Reviewer');
    assert.strictEqual(createdProject.techStack.length, 3);

    // Bob (Regular Member) attempts to edit project context -> Rejected
    await assert.rejects(async () => {
      await projectCmd.upsertProject(
        'team_alpha',
        { title: 'Bob hijacked title' },
        bobCtx
      );
    }, AuthorizationError, 'Regular members cannot overwrite team project direction without owner/lead role');

    // Bob can view project
    const bobView = await projectQuery.getProject('team_alpha', bobCtx);
    assert.strictEqual(bobView?.title, 'Autonomous Code Reviewer');

    console.log('✅ TEST 3 PASSED: Project context authorization enforces owner/lead edit and member read access.');
  }

  // ----------------------------------------------------
  // TEST 4: Task Creation, Assignment Validation & Notifications
  // ----------------------------------------------------
  {
    const teamRepo = new MockTeamRepository();
    const projectRepo = new MockTeamProjectRepository();
    const taskRepo = new MockTeamTaskRepository();
    const hackathonRepo = new MockHackathonRepository();
    const notificationRepo = new MockNotificationRepository();
    const profileRepo = new MockProfileRepository();

    const taskCmd = new TeamTaskCommandService(teamRepo, projectRepo, taskRepo, hackathonRepo, notificationRepo, profileRepo);
    const taskQuery = new TeamTaskQueryService(teamRepo, taskRepo, profileRepo);

    // Setup Team
    const team = new TeamEntity({
      id: 'team_beta', hackathonId: 'hack_1', ownerUserId: 'alice_id', name: 'Beta Team',
      description: null, status: 'active', visibility: 'public', maxMembers: 4,
      createdAt: 1000, updatedAt: 1000
    });
    await teamRepo.createTeam(team);

    await teamRepo.addTeamMember(new TeamMemberEntity({
      id: 'm1', teamId: 'team_beta', userId: 'alice_id', role: 'owner',
      membershipStatus: 'active', joinedAt: 1000, updatedAt: 1000
    }));
    await teamRepo.addTeamMember(new TeamMemberEntity({
      id: 'm2', teamId: 'team_beta', userId: 'bob_id', role: 'member',
      membershipStatus: 'active', joinedAt: 1100, updatedAt: 1100
    }));

    const aliceCtx = createRequestContext({ id: 'alice_id', email: 'alice@test.com', fullName: 'Alice Owner', role: 'user', avatarUrl: null });
    const bobCtx = createRequestContext({ id: 'bob_id', email: 'bob@test.com', fullName: 'Bob Member', role: 'user', avatarUrl: null });
    const charlieCtx = createRequestContext({ id: 'charlie_id', email: 'charlie@test.com', fullName: 'Charlie NonMember', role: 'user', avatarUrl: null });

    // 1. Assigning to non-member Charlie -> Rejected
    await assert.rejects(async () => {
      await taskCmd.createTask(
        'team_beta',
        { title: 'Invalid task', assignedTo: 'charlie_id' },
        aliceCtx
      );
    }, ValidationError, 'Task cannot be assigned to non-member');

    // 2. Alice assigns task to Bob -> Success and creates notification
    const task1 = await taskCmd.createTask(
      'team_beta',
      { title: 'Setup Supabase Schema', priority: 'high', assignedTo: 'bob_id' },
      aliceCtx
    );

    assert.strictEqual(task1.title, 'Setup Supabase Schema');
    assert.strictEqual(task1.status, 'todo');
    assert.strictEqual(task1.assignedTo, 'bob_id');
    assert.strictEqual(notificationRepo.notifications.length, 1);
    assert.strictEqual(notificationRepo.notifications[0].type, 'task_assigned');
    assert.strictEqual(notificationRepo.notifications[0].userId, 'bob_id');

    // 3. Bob updates status to 'in_progress'
    const updatedTask = await taskCmd.updateTask(
      'team_beta',
      task1.id,
      { status: 'in_progress' },
      bobCtx
    );
    assert.strictEqual(updatedTask.status, 'in_progress');
    assert.strictEqual(updatedTask.completedAt, null);

    // 4. Bob marks task as 'blocked' -> triggers task_blocked notification to owner Alice
    await taskCmd.updateTask(
      'team_beta',
      task1.id,
      { status: 'blocked' },
      bobCtx
    );
    const blockedNotif = notificationRepo.notifications.find(n => n.type === 'task_blocked');
    assert(blockedNotif !== undefined, 'Task blocked must trigger task_blocked notification to team owner');
    assert.strictEqual(blockedNotif?.userId, 'alice_id');

    // 5. Bob marks task as 'done' -> sets completedAt
    const doneTask = await taskCmd.updateTask(
      'team_beta',
      task1.id,
      { status: 'done' },
      bobCtx
    );
    assert.strictEqual(doneTask.status, 'done');
    assert(doneTask.completedAt !== null, 'completedAt must be populated when task is marked done');

    // 6. Query service verifies progress
    const res = await taskQuery.getTasks('team_beta', bobCtx);
    assert.strictEqual(res.tasks.length, 1);
    assert.strictEqual(res.progress.completionPercentage, 100);

    // 7. Non-member Charlie cannot query tasks
    await assert.rejects(async () => {
      await taskQuery.getTasks('team_beta', charlieCtx);
    }, AuthorizationError, 'Non-members cannot read team tasks');

    console.log('✅ TEST 4 PASSED: Task creation, assignment boundary, status transitions, completed_at, and notifications verified.');
  }

  // ----------------------------------------------------
  // TEST 5: Soft Archive & Read-Only Team Immutability
  // ----------------------------------------------------
  {
    const teamRepo = new MockTeamRepository();
    const projectRepo = new MockTeamProjectRepository();
    const taskRepo = new MockTeamTaskRepository();
    const hackathonRepo = new MockHackathonRepository();

    const taskCmd = new TeamTaskCommandService(teamRepo, projectRepo, taskRepo, hackathonRepo);
    const taskQuery = new TeamTaskQueryService(teamRepo, taskRepo);

    const team = new TeamEntity({
      id: 'team_gamma', hackathonId: 'hack_1', ownerUserId: 'alice_id', name: 'Gamma Team',
      description: null, status: 'active', visibility: 'public', maxMembers: 4,
      createdAt: 1000, updatedAt: 1000
    });
    await teamRepo.createTeam(team);

    await teamRepo.addTeamMember(new TeamMemberEntity({
      id: 'm1', teamId: 'team_gamma', userId: 'alice_id', role: 'owner',
      membershipStatus: 'active', joinedAt: 1000, updatedAt: 1000
    }));

    const aliceCtx = createRequestContext({ id: 'alice_id', email: 'alice@test.com', fullName: 'Alice Owner', role: 'user', avatarUrl: null });

    const task = await taskCmd.createTask(
      'team_gamma',
      { title: 'Temporary task' },
      aliceCtx
    );

    // Archive task
    await taskCmd.archiveTask('team_gamma', task.id, aliceCtx);

    // Default task list must omit archived task
    const activeTasks = await taskQuery.getTasks('team_gamma', aliceCtx, false);
    assert.strictEqual(activeTasks.tasks.length, 0, 'Archived tasks must be omitted from active task query');

    // Archive query includes it
    const allTasks = await taskQuery.getTasks('team_gamma', aliceCtx, true);
    assert.strictEqual(allTasks.tasks.length, 1);
    assert.strictEqual(allTasks.tasks[0].archivedAt !== null, true);

    // Transition team to 'submitted' (Read-Only)
    const submittedTeam = new TeamEntity({
      ...team.toJSON(),
      status: 'submitted',
      updatedAt: 2000
    });
    await teamRepo.updateTeam(submittedTeam);

    // Mutations on submitted team must be rejected
    await assert.rejects(async () => {
      await taskCmd.createTask('team_gamma', { title: 'New task after submission' }, aliceCtx);
    }, ValidationError, 'Cannot create tasks on submitted team');

    console.log('✅ TEST 5 PASSED: Soft archiving and submitted team immutability verified.');
  }

  console.log('\n======================================================');
  console.log('🎉 ALL TEAMSPACE RELEASE 3 TESTS PASSED CLEANLY (5/5)');
  console.log('======================================================\n');
}

runAllTests().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
