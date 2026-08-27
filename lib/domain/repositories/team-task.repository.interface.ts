import { TeamTaskEntity } from '../entities/team-task.entity';

export interface ITeamTaskRepository {
  findById(id: string): Promise<TeamTaskEntity | null>;
  findByTeamId(teamId: string, includeArchived?: boolean): Promise<TeamTaskEntity[]>;
  findByProjectId(projectId: string, includeArchived?: boolean): Promise<TeamTaskEntity[]>;
  create(task: TeamTaskEntity): Promise<TeamTaskEntity>;
  update(task: TeamTaskEntity): Promise<TeamTaskEntity>;
  delete(id: string): Promise<void>;
  archive(id: string): Promise<void>;
}
