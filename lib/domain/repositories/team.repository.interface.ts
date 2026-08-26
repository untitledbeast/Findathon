import { TeamEntity, TeamMemberEntity, TeamInvitationEntity } from '../entities/team.entity';

export interface ITeamRepository {
  createTeam(team: TeamEntity): Promise<TeamEntity>;
  getTeamById(id: string): Promise<TeamEntity | null>;
  getTeamsByHackathon(hackathonId: string): Promise<TeamEntity[]>;
  getTeamsByUserId(userId: string): Promise<TeamEntity[]>;
  getActiveTeamForUserAndHackathon(userId: string, hackathonId: string): Promise<TeamEntity | null>;
  updateTeam(team: TeamEntity): Promise<TeamEntity>;
  deleteTeam(id: string): Promise<void>;

  getMembersByTeamId(teamId: string): Promise<TeamMemberEntity[]>;
  getMember(teamId: string, userId: string): Promise<TeamMemberEntity | null>;
  addMember(member: TeamMemberEntity): Promise<TeamMemberEntity>;
  updateMember(member: TeamMemberEntity): Promise<TeamMemberEntity>;
  removeMember(teamId: string, userId: string): Promise<void>;

  createInvitation(invitation: TeamInvitationEntity): Promise<TeamInvitationEntity>;
  getInvitationById(id: string): Promise<TeamInvitationEntity | null>;
  getPendingInvitation(teamId: string, inviteeUserId: string): Promise<TeamInvitationEntity | null>;
  getInvitationsByTeamId(teamId: string): Promise<TeamInvitationEntity[]>;
  getInvitationsByInvitee(inviteeUserId: string): Promise<TeamInvitationEntity[]>;
  updateInvitation(invitation: TeamInvitationEntity): Promise<TeamInvitationEntity>;

  getDiscoverableUserIds(limit?: number, offset?: number, excludedUserIds?: string[]): Promise<string[]>;
  transferOwnership(teamId: string, currentOwnerId: string, newOwnerId: string): Promise<TeamEntity>;
  leaveTeamWithSuccession(teamId: string, userId: string): Promise<{ team: TeamEntity; action: string; newOwnerId?: string }>;
}
