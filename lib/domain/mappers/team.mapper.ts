import { TeamEntity, TeamMemberEntity, TeamInvitationEntity } from '../entities/team.entity';
import {
  TeamDTO,
  TeamMemberDTO,
  TeamInvitationDTO,
  TeamStatus,
  TeamVisibility,
  TeamMemberRole,
  TeamMemberStatus,
  TeamInvitationStatus
} from '@/types';

export class TeamMapper {
  public static rowToEntity(row: Record<string, unknown>): TeamEntity {
    return new TeamEntity({
      id: String(row.id),
      hackathonId: String(row.hackathon_id),
      ownerUserId: String(row.owner_user_id),
      name: String(row.name || ''),
      description: row.description ? String(row.description) : null,
      status: (row.status as TeamStatus) || 'forming',
      visibility: (row.visibility as TeamVisibility) || 'private',
      maxMembers: Number(row.max_members || 4),
      createdAt: row.created_at ? new Date(String(row.created_at)).getTime() : Date.now(),
      updatedAt: row.updated_at ? new Date(String(row.updated_at)).getTime() : Date.now()
    });
  }

  public static entityToRow(entity: TeamEntity): Record<string, unknown> {
    return {
      id: entity.id,
      hackathon_id: entity.hackathonId,
      owner_user_id: entity.ownerUserId,
      name: entity.name,
      description: entity.description,
      status: entity.status,
      visibility: entity.visibility,
      max_members: entity.maxMembers,
      created_at: new Date(entity.createdAt).toISOString(),
      updated_at: new Date(entity.updatedAt).toISOString()
    };
  }

  public static entityToDTO(
    entity: TeamEntity,
    memberCount = 1,
    members?: TeamMemberDTO[],
    hackathon?: TeamDTO['hackathon']
  ): TeamDTO {
    return {
      id: entity.id,
      hackathonId: entity.hackathonId,
      ownerUserId: entity.ownerUserId,
      name: entity.name,
      description: entity.description,
      status: entity.status,
      visibility: entity.visibility,
      maxMembers: entity.maxMembers,
      memberCount,
      members,
      hackathon,
      createdAt: new Date(entity.createdAt).toISOString(),
      updatedAt: new Date(entity.updatedAt).toISOString()
    };
  }

  public static memberRowToEntity(row: Record<string, unknown>): TeamMemberEntity {
    return new TeamMemberEntity({
      id: String(row.id),
      teamId: String(row.team_id),
      userId: String(row.user_id),
      role: (row.role as TeamMemberRole) || 'member',
      membershipStatus: (row.membership_status as TeamMemberStatus) || 'active',
      joinedAt: row.joined_at ? new Date(String(row.joined_at)).getTime() : Date.now(),
      updatedAt: row.updated_at ? new Date(String(row.updated_at)).getTime() : Date.now()
    });
  }

  public static memberEntityToRow(entity: TeamMemberEntity): Record<string, unknown> {
    return {
      id: entity.id,
      team_id: entity.teamId,
      user_id: entity.userId,
      role: entity.role,
      membership_status: entity.membershipStatus,
      joined_at: new Date(entity.joinedAt).toISOString(),
      updated_at: new Date(entity.updatedAt).toISOString()
    };
  }

  public static memberEntityToDTO(
    entity: TeamMemberEntity,
    profile?: TeamMemberDTO['profile']
  ): TeamMemberDTO {
    return {
      id: entity.id,
      teamId: entity.teamId,
      userId: entity.userId,
      role: entity.role,
      membershipStatus: entity.membershipStatus,
      joinedAt: new Date(entity.joinedAt).toISOString(),
      updatedAt: new Date(entity.updatedAt).toISOString(),
      profile
    };
  }

  public static invitationRowToEntity(row: Record<string, unknown>): TeamInvitationEntity {
    return new TeamInvitationEntity({
      id: String(row.id),
      teamId: String(row.team_id),
      inviterUserId: String(row.inviter_user_id),
      inviteeUserId: String(row.invitee_user_id),
      status: (row.status as TeamInvitationStatus) || 'pending',
      message: row.message ? String(row.message) : null,
      expiresAt: row.expires_at ? new Date(String(row.expires_at)).getTime() : Date.now() + 7 * 86400000,
      respondedAt: row.responded_at ? new Date(String(row.responded_at)).getTime() : null,
      createdAt: row.created_at ? new Date(String(row.created_at)).getTime() : Date.now(),
      updatedAt: row.updated_at ? new Date(String(row.updated_at)).getTime() : Date.now()
    });
  }

  public static invitationEntityToRow(entity: TeamInvitationEntity): Record<string, unknown> {
    return {
      id: entity.id,
      team_id: entity.teamId,
      inviter_user_id: entity.inviterUserId,
      invitee_user_id: entity.inviteeUserId,
      status: entity.status,
      message: entity.message,
      expires_at: new Date(entity.expiresAt).toISOString(),
      responded_at: entity.respondedAt ? new Date(entity.respondedAt).toISOString() : null,
      created_at: new Date(entity.createdAt).toISOString(),
      updated_at: new Date(entity.updatedAt).toISOString()
    };
  }

  public static invitationEntityToDTO(
    entity: TeamInvitationEntity,
    team?: TeamDTO,
    inviter?: TeamInvitationDTO['inviter'],
    invitee?: TeamInvitationDTO['invitee']
  ): TeamInvitationDTO {
    return {
      id: entity.id,
      teamId: entity.teamId,
      inviterUserId: entity.inviterUserId,
      inviteeUserId: entity.inviteeUserId,
      status: entity.status,
      message: entity.message,
      expiresAt: new Date(entity.expiresAt).toISOString(),
      respondedAt: entity.respondedAt ? new Date(entity.respondedAt).toISOString() : null,
      createdAt: new Date(entity.createdAt).toISOString(),
      updatedAt: new Date(entity.updatedAt).toISOString(),
      team,
      inviter,
      invitee
    };
  }
}
