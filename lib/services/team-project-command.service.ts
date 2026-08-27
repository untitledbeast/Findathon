/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestContext } from '../context/request-context';
import { ITeamRepository } from '../domain/repositories/team.repository.interface';
import { ITeamProjectRepository } from '../domain/repositories/team-project.repository.interface';
import { IHackathonRepository } from '../domain/repositories/hackathon.repository.interface';
import { TeamProjectEntity } from '../domain/entities/team-project.entity';
import { TeamProjectMapper } from '../domain/mappers/team-project.mapper';
import { TeamProjectDTO } from '@/types';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError
} from '../errors';

export interface UpsertProjectInput {
  title?: string | null;
  problemStatement?: string | null;
  solutionApproach?: string | null;
  techStack?: string[];
  repositoryUrl?: string | null;
  demoUrl?: string | null;
}

export class TeamProjectCommandService {
  constructor(
    private readonly teamRepo: ITeamRepository,
    private readonly projectRepo: ITeamProjectRepository,
    private readonly hackathonRepo: IHackathonRepository
  ) {}

  public async upsertProject(
    teamId: string,
    input: UpsertProjectInput,
    context: RequestContext
  ): Promise<TeamProjectDTO> {
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

    // Verify actor membership
    const members = await this.teamRepo.getMembersByTeamId(teamId);
    const activeMember = members.find((m: any) => m.userId === userId && m.isActive());
    if (!activeMember) {
      throw new AuthorizationError('You must be an active member of this team to edit project details');
    }

    const existingProject = await this.projectRepo.findByTeamId(teamId);

    // If updating existing project, only owner or lead can edit
    if (existingProject) {
      if (!TeamProjectEntity.canEditProject(activeMember.role, activeMember.membershipStatus, team.status, hackathonStatus)) {
        throw new AuthorizationError('Only team owners and leads can edit the project details');
      }

      const updated = new TeamProjectEntity({
        id: existingProject.id,
        teamId: existingProject.teamId,
        title: input.title !== undefined ? (input.title ? input.title.trim() : null) : existingProject.title,
        problemStatement: input.problemStatement !== undefined ? (input.problemStatement ? input.problemStatement.trim() : null) : existingProject.problemStatement,
        solutionApproach: input.solutionApproach !== undefined ? (input.solutionApproach ? input.solutionApproach.trim() : null) : existingProject.solutionApproach,
        techStack: input.techStack !== undefined ? (Array.isArray(input.techStack) ? input.techStack : []) : existingProject.techStack,
        repositoryUrl: input.repositoryUrl !== undefined ? (input.repositoryUrl ? input.repositoryUrl.trim() : null) : existingProject.repositoryUrl,
        demoUrl: input.demoUrl !== undefined ? (input.demoUrl ? input.demoUrl.trim() : null) : existingProject.demoUrl,
        createdBy: existingProject.createdBy,
        createdAt: existingProject.createdAt,
        updatedAt: Date.now()
      });

      const saved = await this.projectRepo.update(updated);
      return TeamProjectMapper.entityToDTO(saved);
    }

    // Creating initial project for team
    const newProject = new TeamProjectEntity({
      id: crypto.randomUUID(),
      teamId,
      title: input.title ? input.title.trim() : null,
      problemStatement: input.problemStatement ? input.problemStatement.trim() : null,
      solutionApproach: input.solutionApproach ? input.solutionApproach.trim() : null,
      techStack: Array.isArray(input.techStack) ? input.techStack : [],
      repositoryUrl: input.repositoryUrl ? input.repositoryUrl.trim() : null,
      demoUrl: input.demoUrl ? input.demoUrl.trim() : null,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    const saved = await this.projectRepo.create(newProject);
    return TeamProjectMapper.entityToDTO(saved);
  }
}
