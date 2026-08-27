import { TeamTaskEntity } from '../entities/team-task.entity';
import { TeamTaskDTO, TaskStatus, TaskPriority } from '@/types';

export interface TeamTaskDatabaseRow {
  id: string;
  team_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_by: string;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export class TeamTaskMapper {
  public static rowToEntity(row: TeamTaskDatabaseRow): TeamTaskEntity {
    return new TeamTaskEntity({
      id: row.id,
      teamId: row.team_id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      assignedTo: row.assigned_to,
      createdBy: row.created_by,
      dueAt: row.due_at ? new Date(row.due_at).getTime() : null,
      completedAt: row.completed_at ? new Date(row.completed_at).getTime() : null,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
      archivedAt: row.archived_at ? new Date(row.archived_at).getTime() : null
    });
  }

  public static entityToRow(entity: TeamTaskEntity): TeamTaskDatabaseRow {
    return {
      id: entity.id,
      team_id: entity.teamId,
      project_id: entity.projectId,
      title: entity.title,
      description: entity.description,
      status: entity.status,
      priority: entity.priority,
      assigned_to: entity.assignedTo,
      created_by: entity.createdBy,
      due_at: entity.dueAt ? new Date(entity.dueAt).toISOString() : null,
      completed_at: entity.completedAt ? new Date(entity.completedAt).toISOString() : null,
      created_at: new Date(entity.createdAt).toISOString(),
      updated_at: new Date(entity.updatedAt).toISOString(),
      archived_at: entity.archivedAt ? new Date(entity.archivedAt).toISOString() : null
    };
  }

  public static entityToDTO(
    entity: TeamTaskEntity,
    assignee?: { id: string; fullName: string | null; avatarUrl: string | null } | null,
    creator?: { id: string; fullName: string | null; avatarUrl: string | null } | null
  ): TeamTaskDTO {
    return {
      id: entity.id,
      teamId: entity.teamId,
      projectId: entity.projectId,
      title: entity.title,
      description: entity.description,
      status: entity.status,
      priority: entity.priority,
      assignedTo: entity.assignedTo,
      createdBy: entity.createdBy,
      dueAt: entity.dueAt ? new Date(entity.dueAt).toISOString() : null,
      completedAt: entity.completedAt ? new Date(entity.completedAt).toISOString() : null,
      createdAt: new Date(entity.createdAt).toISOString(),
      updatedAt: new Date(entity.updatedAt).toISOString(),
      archivedAt: entity.archivedAt ? new Date(entity.archivedAt).toISOString() : null,
      assignee,
      creator
    };
  }
}
