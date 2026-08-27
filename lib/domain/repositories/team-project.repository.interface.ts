import { TeamProjectEntity } from '../entities/team-project.entity';

export interface ITeamProjectRepository {
  findByTeamId(teamId: string): Promise<TeamProjectEntity | null>;
  create(project: TeamProjectEntity): Promise<TeamProjectEntity>;
  update(project: TeamProjectEntity): Promise<TeamProjectEntity>;
  delete(id: string): Promise<void>;
}
