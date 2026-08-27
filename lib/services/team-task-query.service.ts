/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestContext } from '../context/request-context';
import { ITeamRepository } from '../domain/repositories/team.repository.interface';
import { ITeamTaskRepository } from '../domain/repositories/team-task.repository.interface';
import { IProfileRepository } from '../domain/repositories/profile.repository.interface';
import { TeamTaskEntity } from '../domain/entities/team-task.entity';
import { TeamTaskMapper } from '../domain/mappers/team-task.mapper';
import { TeamTaskDTO, TeamTaskProgressDTO } from '@/types';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError
} from '../errors';

export class TeamTaskQueryService {
  constructor(
    private readonly teamRepo: ITeamRepository,
    private readonly taskRepo: ITeamTaskRepository,
    private readonly profileRepo?: IProfileRepository
  ) {}

  public async getTasks(
    teamId: string,
    context: RequestContext,
    includeArchived = false
  ): Promise<{ tasks: TeamTaskDTO[]; progress: TeamTaskProgressDTO }> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    const team = await this.teamRepo.getTeamById(teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Verify actor membership
    const members = await this.teamRepo.getMembersByTeamId(teamId);
    const activeMember = members.find((m: any) => m.userId === userId && m.isActive());
    if (!activeMember) {
      throw new AuthorizationError('You must be an active member of this team to view tasks');
    }

    const taskEntities = await this.taskRepo.findByTeamId(teamId, includeArchived);
    const progress = TeamTaskEntity.calculateProgress(taskEntities);

    // Collect distinct profile IDs for enrichment
    const profileIds = new Set<string>();
    for (const t of taskEntities) {
      if (t.assignedTo) profileIds.add(t.assignedTo);
      if (t.createdBy) profileIds.add(t.createdBy);
    }

    const profileMap = new Map<string, { id: string; fullName: string | null; avatarUrl: string | null }>();
    if (this.profileRepo && profileIds.size > 0) {
      await Promise.all(
        Array.from(profileIds).map(async pId => {
          const profile = await this.profileRepo?.findById(pId);
          if (profile) {
            profileMap.set(pId, {
              id: profile.id,
              fullName: profile.fullName,
              avatarUrl: typeof (profile.avatarUrl as any)?.getValue === 'function'
                ? (profile.avatarUrl as any).getValue()
                : (profile.avatarUrl || null)
            });
          }
        })
      );
    }

    const tasks: TeamTaskDTO[] = taskEntities.map(t => {
      const assignee = t.assignedTo ? profileMap.get(t.assignedTo) || null : null;
      const creator = t.createdBy ? profileMap.get(t.createdBy) || null : null;
      return TeamTaskMapper.entityToDTO(t, assignee, creator);
    });

    return {
      tasks,
      progress
    };
  }

  public async getTaskById(
    teamId: string,
    taskId: string,
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

    const members = await this.teamRepo.getMembersByTeamId(teamId);
    const activeMember = members.find((m: any) => m.userId === userId && m.isActive());
    if (!activeMember) {
      throw new AuthorizationError('You must be an active member of this team to view task details');
    }

    const task = await this.taskRepo.findById(taskId);
    if (!task || task.teamId !== teamId) {
      throw new NotFoundError('Task not found');
    }

    const [assigneeProfile, creatorProfile] = await Promise.all([
      task.assignedTo && this.profileRepo ? this.profileRepo.findById(task.assignedTo) : null,
      this.profileRepo ? this.profileRepo.findById(task.createdBy) : null
    ]);

    return TeamTaskMapper.entityToDTO(
      task,
      assigneeProfile ? { id: assigneeProfile.id, fullName: assigneeProfile.fullName, avatarUrl: (assigneeProfile.avatarUrl as any)?.getValue ? (assigneeProfile.avatarUrl as any).getValue() : (assigneeProfile.avatarUrl || null) } : null,
      creatorProfile ? { id: creatorProfile.id, fullName: creatorProfile.fullName, avatarUrl: (creatorProfile.avatarUrl as any)?.getValue ? (creatorProfile.avatarUrl as any).getValue() : (creatorProfile.avatarUrl || null) } : null
    );
  }
}
