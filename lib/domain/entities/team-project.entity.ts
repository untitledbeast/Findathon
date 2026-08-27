import { TeamStatus, TeamMemberRole, TeamMemberStatus } from '@/types';

export interface TeamProjectEntityProps {
  id: string;
  teamId: string;
  title: string | null;
  problemStatement: string | null;
  solutionApproach: string | null;
  techStack: string[];
  repositoryUrl: string | null;
  demoUrl: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export class TeamProjectEntity {
  constructor(private readonly props: TeamProjectEntityProps) {}

  public get id(): string { return this.props.id; }
  public get teamId(): string { return this.props.teamId; }
  public get title(): string | null { return this.props.title; }
  public get problemStatement(): string | null { return this.props.problemStatement; }
  public get solutionApproach(): string | null { return this.props.solutionApproach; }
  public get techStack(): string[] { return [...(this.props.techStack || [])]; }
  public get repositoryUrl(): string | null { return this.props.repositoryUrl; }
  public get demoUrl(): string | null { return this.props.demoUrl; }
  public get createdBy(): string { return this.props.createdBy; }
  public get createdAt(): number { return this.props.createdAt; }
  public get updatedAt(): number { return this.props.updatedAt; }

  /**
   * Pure domain rule: Can workspace be modified given team and hackathon lifecycle?
   */
  public static isWorkspaceEditable(teamStatus: TeamStatus, hackathonStatus?: string): boolean {
    if (teamStatus === 'submitted' || teamStatus === 'completed' || teamStatus === 'archived') {
      return false;
    }
    if (hackathonStatus && (hackathonStatus === 'cancelled' || hackathonStatus === 'archived')) {
      return false;
    }
    return true;
  }

  /**
   * Pure domain rule: Can user edit project context (title, problem statement, stack)?
   */
  public static canEditProject(
    role: TeamMemberRole,
    membershipStatus: TeamMemberStatus,
    teamStatus: TeamStatus,
    hackathonStatus?: string
  ): boolean {
    if (membershipStatus !== 'active') return false;
    if (!this.isWorkspaceEditable(teamStatus, hackathonStatus)) return false;
    return role === 'owner' || role === 'lead';
  }

  public toJSON(): TeamProjectEntityProps {
    return { ...this.props };
  }
}
