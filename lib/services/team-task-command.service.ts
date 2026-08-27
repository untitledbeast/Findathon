/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestContext } from '../context/request-context';
import { ITeamRepository } from '../domain/repositories/team.repository.interface';
import { ITeamProjectRepository } from '../domain/repositories/team-project.repository.interface';
import { ITeamTaskRepository } from '../domain/repositories/team-task.repository.interface';
import { IHackathonRepository } from '../domain/repositories/hackathon.repository.interface';
import { INotificationRepository } from '../domain/repositories/notification.repository.interface';
import { IProfileRepository } from '../domain/repositories/profile.repository.interface';
import { TeamTaskEntity } from '../domain/entities/team-task.entity';
import { TeamProjectEntity } from '../domain/entities/team-project.entity';
import { TeamTaskMapper } from '../domain/mappers/team-task.mapper';
import { TeamTaskDTO, TaskStatus, TaskPriority } from '@/types';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError
} from '../errors';

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  assignedTo?: string | null;
  dueAt?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string | null;
  dueAt?: string | null;
}

export class TeamTaskCommandService {
  constructor(
    private readonly teamRepo: ITeamRepository,
    private readonly projectRepo: ITeamProjectRepository,
    private readonly taskRepo: ITeamTaskRepository,
    private readonly hackathonRepo: IHackathonRepository,
    private readonly notificationRepo?: INotificationRepository,
    private readonly profileRepo?: IProfileRepository
  ) {}

  public async createTask(
    teamId: string,
    input: CreateTaskInput,
    context: RequestContext
  ): Promise<TeamTaskDTO> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    if (!input.title || !input.title.trim()) {
      throw new ValidationError('Task title is required');
    }

    const team = await this.teamRepo.getTeamById(teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const hackathon = await this.hackathonRepo.findById(team.hackathonId);
    const hackathonStatus = hackathon?.status;

    if (!TeamProjectEntity.isWorkspaceEditable(team.status, hackathonStatus)) {
      throw new ValidationError(`Team workspace is read-only in status: ${team.status}`);
    }

    const members = await this.teamRepo.getMembersByTeamId(teamId);
    const activeMember = members.find((m: any) => m.userId === userId && m.isActive());
    if (!activeMember) {
      throw new AuthorizationError('You must be an active member of this team to create tasks');
    }

    // Ensure team project exists
    let project = await this.projectRepo.findByTeamId(teamId);
    if (!project) {
      const defaultProject = new TeamProjectEntity({
        id: crypto.randomUUID(),
        teamId,
        title: `${team.name} Project`,
        problemStatement: null,
        solutionApproach: null,
        techStack: [],
        repositoryUrl: null,
        demoUrl: null,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      project = await this.projectRepo.create(defaultProject);
    }

    // Validate assignee if supplied
    let assigneeId: string | null = null;
    if (input.assignedTo) {
      const targetMember = members.find((m: any) => m.userId === input.assignedTo && m.isActive());
      if (!targetMember) {
        throw new ValidationError('Task assignee must be an active member of this team');
      }

      // If assigning to another member, actor must be owner/lead or assigning to self
      if (input.assignedTo !== userId && !TeamTaskEntity.canAssignTask(activeMember.role, activeMember.membershipStatus, team.status, hackathonStatus)) {
        throw new AuthorizationError('Only team owners and leads can assign tasks to other members');
      }
      assigneeId = input.assignedTo;
    }

    const taskId = crypto.randomUUID();
    const newTask = new TeamTaskEntity({
      id: taskId,
      teamId,
      projectId: project.id,
      title: input.title.trim(),
      description: input.description ? input.description.trim() : null,
      status: 'todo',
      priority: input.priority || 'medium',
      assignedTo: assigneeId,
      createdBy: userId,
      dueAt: input.dueAt ? new Date(input.dueAt).getTime() : null,
      completedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archivedAt: null
    });

    const saved = await this.taskRepo.create(newTask);

    // Notify assignee if someone else assigned them
    if (assigneeId && assigneeId !== userId && this.notificationRepo) {
      try {
        await this.notificationRepo.create({
          userId: assigneeId,
          type: 'task_assigned',
          title: 'New Task Assigned',
          body: `You were assigned task "${saved.title}" in team "${team.name}".`,
          isRead: false,
          metadata: {
            teamId,
            taskId: saved.id,
            assignedBy: userId
          }
        });
      } catch (err) {
        console.error('[TeamTaskCommandService.createTask] Failed to send notification:', err);
      }
    }

    // Enrich DTO with assignee / creator profiles
    const [assigneeProfile, creatorProfile] = await Promise.all([
      assigneeId && this.profileRepo ? this.profileRepo.findById(assigneeId) : null,
      this.profileRepo ? this.profileRepo.findById(userId) : null
    ]);

    return TeamTaskMapper.entityToDTO(
      saved,
      assigneeProfile ? { id: assigneeProfile.id, fullName: assigneeProfile.fullName, avatarUrl: (assigneeProfile.avatarUrl as any)?.getValue ? (assigneeProfile.avatarUrl as any).getValue() : (assigneeProfile.avatarUrl || null) } : null,
      creatorProfile ? { id: creatorProfile.id, fullName: creatorProfile.fullName, avatarUrl: (creatorProfile.avatarUrl as any)?.getValue ? (creatorProfile.avatarUrl as any).getValue() : (creatorProfile.avatarUrl || null) } : null
    );
  }

  public async updateTask(
    teamId: string,
    taskId: string,
    input: UpdateTaskInput,
    context: RequestContext
  ): Promise<TeamTaskDTO> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    const team = await this.teamRepo.getTeamById(teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const hackathon = await this.hackathonRepo.findById(team.hackathonId);
    const hackathonStatus = hackathon?.status;

    if (!TeamProjectEntity.isWorkspaceEditable(team.status, hackathonStatus)) {
      throw new ValidationError(`Team workspace is read-only in status: ${team.status}`);
    }

    const task = await this.taskRepo.findById(taskId);
    if (!task || task.teamId !== teamId || task.isArchived()) {
      throw new NotFoundError('Task not found');
    }

    const members = await this.teamRepo.getMembersByTeamId(teamId);
    const activeMember = members.find((m: any) => m.userId === userId && m.isActive());
    if (!activeMember) {
      throw new AuthorizationError('You must be an active member of this team to update tasks');
    }

    // Check permissions for metadata changes (title, description, priority, due date)
    const hasMetadataChanges =
      (input.title !== undefined && input.title !== task.title) ||
      (input.description !== undefined && input.description !== task.description) ||
      (input.priority !== undefined && input.priority !== task.priority) ||
      input.dueAt !== undefined;

    if (hasMetadataChanges) {
      if (!task.canEditTask(userId, activeMember.role, activeMember.membershipStatus, team.status, hackathonStatus)) {
        throw new AuthorizationError('Only team owners, leads, or the task creator can edit task details');
      }
    }

    // Check permissions for status changes
    let nextStatus = task.status;
    let completedAt = task.completedAt;
    if (input.status !== undefined && input.status !== task.status) {
      if (!task.canUpdateStatus(userId, activeMember.role, activeMember.membershipStatus, team.status, hackathonStatus)) {
        throw new AuthorizationError('You are not authorized to update the status of this task');
      }
      nextStatus = input.status;
      if (nextStatus === 'done' && task.status !== 'done') {
        completedAt = Date.now();
      } else if (nextStatus !== 'done' && task.status === 'done') {
        completedAt = null;
      }
    }

    // Check permissions for assignee changes
    let nextAssignee = task.assignedTo;
    const isAssigneeChanging = input.assignedTo !== undefined && input.assignedTo !== task.assignedTo;
    if (isAssigneeChanging) {
      if (input.assignedTo) {
        const targetMember = members.find((m: any) => m.userId === input.assignedTo && m.isActive());
        if (!targetMember) {
          throw new ValidationError('Task assignee must be an active member of this team');
        }
      }

      if (!TeamTaskEntity.canAssignTask(activeMember.role, activeMember.membershipStatus, team.status, hackathonStatus)) {
        if (input.assignedTo !== userId) {
          throw new AuthorizationError('Only team owners and leads can assign tasks to other members');
        }
      }
      nextAssignee = input.assignedTo || null;
    }

    const updatedTask = new TeamTaskEntity({
      id: task.id,
      teamId: task.teamId,
      projectId: task.projectId,
      title: input.title !== undefined ? (input.title ? input.title.trim() : task.title) : task.title,
      description: input.description !== undefined ? (input.description ? input.description.trim() : null) : task.description,
      status: nextStatus,
      priority: input.priority || task.priority,
      assignedTo: nextAssignee,
      createdBy: task.createdBy,
      dueAt: input.dueAt !== undefined ? (input.dueAt ? new Date(input.dueAt).getTime() : null) : task.dueAt,
      completedAt,
      createdAt: task.createdAt,
      updatedAt: Date.now(),
      archivedAt: task.archivedAt
    });

    const saved = await this.taskRepo.update(updatedTask);

    // Notifications
    if (this.notificationRepo) {
      // If newly assigned to someone else
      if (isAssigneeChanging && nextAssignee && nextAssignee !== userId) {
        try {
          await this.notificationRepo.create({
            userId: nextAssignee,
            type: 'task_assigned',
            title: 'Task Assigned',
            body: `You were assigned task "${saved.title}" in team "${team.name}".`,
            isRead: false,
            metadata: {
              teamId,
              taskId: saved.id,
              assignedBy: userId
            }
          });
        } catch (err) {
          console.error('[TeamTaskCommandService.updateTask] Failed to notify assignee:', err);
        }
      }

      // If task became blocked
      if (nextStatus === 'blocked' && task.status !== 'blocked') {
        const owner = members.find((m: any) => m.role === 'owner' && m.isActive());
        if (owner && owner.userId !== userId) {
          try {
            await this.notificationRepo.create({
              userId: owner.userId,
              type: 'task_blocked',
              title: 'Task Blocked',
              body: `Task "${saved.title}" was marked as blocked in team "${team.name}".`,
              isRead: false,
              metadata: {
                teamId,
                taskId: saved.id,
                blockedBy: userId
              }
            });
          } catch (err) {
            console.error('[TeamTaskCommandService.updateTask] Failed to notify owner of blocked task:', err);
          }
        }
      }
    }

    const [assigneeProfile, creatorProfile] = await Promise.all([
      saved.assignedTo && this.profileRepo ? this.profileRepo.findById(saved.assignedTo) : null,
      this.profileRepo ? this.profileRepo.findById(saved.createdBy) : null
    ]);

    return TeamTaskMapper.entityToDTO(
      saved,
      assigneeProfile ? { id: assigneeProfile.id, fullName: assigneeProfile.fullName, avatarUrl: (assigneeProfile.avatarUrl as any)?.getValue ? (assigneeProfile.avatarUrl as any).getValue() : (assigneeProfile.avatarUrl || null) } : null,
      creatorProfile ? { id: creatorProfile.id, fullName: creatorProfile.fullName, avatarUrl: (creatorProfile.avatarUrl as any)?.getValue ? (creatorProfile.avatarUrl as any).getValue() : (creatorProfile.avatarUrl || null) } : null
    );
  }

  public async archiveTask(
    teamId: string,
    taskId: string,
    context: RequestContext
  ): Promise<void> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    const team = await this.teamRepo.getTeamById(teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const task = await this.taskRepo.findById(taskId);
    if (!task || task.teamId !== teamId) {
      throw new NotFoundError('Task not found');
    }

    const members = await this.teamRepo.getMembersByTeamId(teamId);
    const activeMember = members.find((m: any) => m.userId === userId && m.isActive());
    if (!activeMember) {
      throw new AuthorizationError('You must be an active member of this team to archive tasks');
    }

    if (activeMember.role !== 'owner' && activeMember.role !== 'lead' && task.createdBy !== userId) {
      throw new AuthorizationError('Only team owners, leads, or the task creator can archive this task');
    }

    await this.taskRepo.archive(taskId);
  }
}
