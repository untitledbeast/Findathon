/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestContext } from '../context/request-context';
import { ITeamRepository } from '../domain/repositories/team.repository.interface';
import { ITeamProjectRepository } from '../domain/repositories/team-project.repository.interface';
import { TeamProjectMapper } from '../domain/mappers/team-project.mapper';
import { TeamProjectDTO } from '@/types';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError
} from '../errors';

export class TeamProjectQueryService {
  constructor(
    private readonly teamRepo: ITeamRepository,
    private readonly projectRepo: ITeamProjectRepository
  ) {}

  public async getProject(teamId: string, context: RequestContext): Promise<TeamProjectDTO | null> {
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
      throw new AuthorizationError('You must be an active member of this team to view project details');
    }

    const project = await this.projectRepo.findByTeamId(teamId);
    if (!project) return null;

    return TeamProjectMapper.entityToDTO(project);
  }
}
