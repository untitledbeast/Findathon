import { TeamProjectEntity } from '../entities/team-project.entity';
import { TeamProjectDTO } from '@/types';

export interface TeamProjectDatabaseRow {
  id: string;
  team_id: string;
  title: string | null;
  problem_statement: string | null;
  solution_approach: string | null;
  tech_stack: string[];
  repository_url: string | null;
  demo_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export class TeamProjectMapper {
  public static rowToEntity(row: TeamProjectDatabaseRow): TeamProjectEntity {
    return new TeamProjectEntity({
      id: row.id,
      teamId: row.team_id,
      title: row.title,
      problemStatement: row.problem_statement,
      solutionApproach: row.solution_approach,
      techStack: Array.isArray(row.tech_stack) ? row.tech_stack : [],
      repositoryUrl: row.repository_url,
      demoUrl: row.demo_url,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime()
    });
  }

  public static entityToRow(entity: TeamProjectEntity): TeamProjectDatabaseRow {
    return {
      id: entity.id,
      team_id: entity.teamId,
      title: entity.title,
      problem_statement: entity.problemStatement,
      solution_approach: entity.solutionApproach,
      tech_stack: entity.techStack,
      repository_url: entity.repositoryUrl,
      demo_url: entity.demoUrl,
      created_by: entity.createdBy,
      created_at: new Date(entity.createdAt).toISOString(),
      updated_at: new Date(entity.updatedAt).toISOString()
    };
  }

  public static entityToDTO(entity: TeamProjectEntity): TeamProjectDTO {
    return {
      id: entity.id,
      teamId: entity.teamId,
      title: entity.title,
      problemStatement: entity.problemStatement,
      solutionApproach: entity.solutionApproach,
      techStack: entity.techStack,
      repositoryUrl: entity.repositoryUrl,
      demoUrl: entity.demoUrl,
      createdBy: entity.createdBy,
      createdAt: new Date(entity.createdAt).toISOString(),
      updatedAt: new Date(entity.updatedAt).toISOString()
    };
  }
}
