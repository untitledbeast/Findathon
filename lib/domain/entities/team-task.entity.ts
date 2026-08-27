import { TaskStatus, TaskPriority, TeamStatus, TeamMemberRole, TeamMemberStatus, TeamTaskProgressDTO } from '@/types';
import { TeamProjectEntity } from './team-project.entity';

export interface TeamTaskEntityProps {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string | null;
  createdBy: string;
  dueAt: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export class TeamTaskEntity {
  constructor(private readonly props: TeamTaskEntityProps) {}

  public get id(): string { return this.props.id; }
  public get teamId(): string { return this.props.teamId; }
  public get projectId(): string { return this.props.projectId; }
  public get title(): string { return this.props.title; }
  public get description(): string | null { return this.props.description; }
  public get status(): TaskStatus { return this.props.status; }
  public get priority(): TaskPriority { return this.props.priority; }
  public get assignedTo(): string | null { return this.props.assignedTo; }
  public get createdBy(): string { return this.props.createdBy; }
  public get dueAt(): number | null { return this.props.dueAt; }
  public get completedAt(): number | null { return this.props.completedAt; }
  public get createdAt(): number { return this.props.createdAt; }
  public get updatedAt(): number { return this.props.updatedAt; }
  public get archivedAt(): number | null { return this.props.archivedAt; }

  public isArchived(): boolean {
    return this.props.archivedAt !== null;
  }

  public isDone(): boolean {
    return this.props.status === 'done';
  }

  public isBlocked(): boolean {
    return this.props.status === 'blocked';
  }

  public isInProgress(): boolean {
    return this.props.status === 'in_progress';
  }

  public isTodo(): boolean {
    return this.props.status === 'todo';
  }

  /**
   * Pure domain rule: Calculate progress breakdown and completion percentage.
   */
  public static calculateProgress(tasks: TeamTaskEntity[]): TeamTaskProgressDTO {
    const activeTasks = tasks.filter(t => !t.isArchived());
    const totalTasks = activeTasks.length;

    if (totalTasks === 0) {
      return {
        totalTasks: 0,
        todoCount: 0,
        inProgressCount: 0,
        blockedCount: 0,
        doneCount: 0,
        completionPercentage: 0
      };
    }

    let todoCount = 0;
    let inProgressCount = 0;
    let blockedCount = 0;
    let doneCount = 0;

    for (const t of activeTasks) {
      if (t.status === 'done') doneCount++;
      else if (t.status === 'in_progress') inProgressCount++;
      else if (t.status === 'blocked') blockedCount++;
      else todoCount++;
    }

    const completionPercentage = Math.round((doneCount / totalTasks) * 100);

    return {
      totalTasks,
      todoCount,
      inProgressCount,
      blockedCount,
      doneCount,
      completionPercentage
    };
  }

  /**
   * Pure domain rule: Can member create tasks?
   */
  public static canCreateTask(
    membershipStatus: TeamMemberStatus,
    teamStatus: TeamStatus,
    hackathonStatus?: string
  ): boolean {
    if (membershipStatus !== 'active') return false;
    return TeamProjectEntity.isWorkspaceEditable(teamStatus, hackathonStatus);
  }

  /**
   * Pure domain rule: Can member edit task details (title, description, priority, due date)?
   */
  public canEditTask(
    actorUserId: string,
    actorRole: TeamMemberRole,
    membershipStatus: TeamMemberStatus,
    teamStatus: TeamStatus,
    hackathonStatus?: string
  ): boolean {
    if (membershipStatus !== 'active') return false;
    if (!TeamProjectEntity.isWorkspaceEditable(teamStatus, hackathonStatus)) return false;
    if (actorRole === 'owner' || actorRole === 'lead') return true;
    return this.props.createdBy === actorUserId;
  }

  /**
   * Pure domain rule: Can member update task status?
   */
  public canUpdateStatus(
    actorUserId: string,
    actorRole: TeamMemberRole,
    membershipStatus: TeamMemberStatus,
    teamStatus: TeamStatus,
    hackathonStatus?: string
  ): boolean {
    if (membershipStatus !== 'active') return false;
    if (!TeamProjectEntity.isWorkspaceEditable(teamStatus, hackathonStatus)) return false;
    if (actorRole === 'owner' || actorRole === 'lead') return true;
    if (this.props.assignedTo === actorUserId) return true;
    if (this.props.createdBy === actorUserId) return true;
    return false;
  }

  /**
   * Pure domain rule: Can member assign tasks to other members?
   */
  public static canAssignTask(
    actorRole: TeamMemberRole,
    membershipStatus: TeamMemberStatus,
    teamStatus: TeamStatus,
    hackathonStatus?: string
  ): boolean {
    if (membershipStatus !== 'active') return false;
    if (!TeamProjectEntity.isWorkspaceEditable(teamStatus, hackathonStatus)) return false;
    return actorRole === 'owner' || actorRole === 'lead';
  }

  public toJSON(): TeamTaskEntityProps {
    return { ...this.props };
  }
}
