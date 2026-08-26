import { TeamStatus, TeamVisibility, TeamMemberRole, TeamMemberStatus, TeamInvitationStatus } from '@/types';

export interface TeamEntityProps {
  id: string;
  hackathonId: string;
  ownerUserId: string;
  name: string;
  description: string | null;
  status: TeamStatus;
  visibility: TeamVisibility;
  maxMembers: number;
  createdAt: number;
  updatedAt: number;
}

export class TeamEntity {
  constructor(private readonly props: TeamEntityProps) {}

  public get id(): string { return this.props.id; }
  public get hackathonId(): string { return this.props.hackathonId; }
  public get ownerUserId(): string { return this.props.ownerUserId; }
  public get name(): string { return this.props.name; }
  public get description(): string | null { return this.props.description; }
  public get status(): TeamStatus { return this.props.status; }
  public get visibility(): TeamVisibility { return this.props.visibility; }
  public get maxMembers(): number { return this.props.maxMembers; }
  public get createdAt(): number { return this.props.createdAt; }
  public get updatedAt(): number { return this.props.updatedAt; }

  public canAcceptNewMembers(currentMemberCount: number): boolean {
    return (this.props.status === 'forming' || this.props.status === 'active') && currentMemberCount < this.props.maxMembers;
  }

  public toJSON(): TeamEntityProps {
    return { ...this.props };
  }
}

export interface TeamMemberEntityProps {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  membershipStatus: TeamMemberStatus;
  joinedAt: number;
  updatedAt: number;
}

export class TeamMemberEntity {
  constructor(private readonly props: TeamMemberEntityProps) {}

  public get id(): string { return this.props.id; }
  public get teamId(): string { return this.props.teamId; }
  public get userId(): string { return this.props.userId; }
  public get role(): TeamMemberRole { return this.props.role; }
  public get membershipStatus(): TeamMemberStatus { return this.props.membershipStatus; }
  public get joinedAt(): number { return this.props.joinedAt; }
  public get updatedAt(): number { return this.props.updatedAt; }

  public isActive(): boolean {
    return this.props.membershipStatus === 'active';
  }

  public isLeadOrOwner(): boolean {
    return this.isActive() && (this.props.role === 'owner' || this.props.role === 'lead');
  }

  public toJSON(): TeamMemberEntityProps {
    return { ...this.props };
  }
}

export interface TeamInvitationEntityProps {
  id: string;
  teamId: string;
  inviterUserId: string;
  inviteeUserId: string;
  status: TeamInvitationStatus;
  message: string | null;
  expiresAt: number;
  respondedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export class TeamInvitationEntity {
  constructor(private readonly props: TeamInvitationEntityProps) {}

  public get id(): string { return this.props.id; }
  public get teamId(): string { return this.props.teamId; }
  public get inviterUserId(): string { return this.props.inviterUserId; }
  public get inviteeUserId(): string { return this.props.inviteeUserId; }
  public get status(): TeamInvitationStatus { return this.props.status; }
  public get message(): string | null { return this.props.message; }
  public get expiresAt(): number { return this.props.expiresAt; }
  public get respondedAt(): number | null { return this.props.respondedAt; }
  public get createdAt(): number { return this.props.createdAt; }
  public get updatedAt(): number { return this.props.updatedAt; }

  public isPending(now = Date.now()): boolean {
    return this.props.status === 'pending' && this.props.expiresAt > now;
  }

  public toJSON(): TeamInvitationEntityProps {
    return { ...this.props };
  }
}
