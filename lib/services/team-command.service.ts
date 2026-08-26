/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestContext } from '../context/request-context';
import { ITeamRepository } from '../domain/repositories/team.repository.interface';
import { IHackathonRepository } from '../domain/repositories/hackathon.repository.interface';
import { IProfileRepository } from '../domain/repositories/profile.repository.interface';
import { INotificationRepository } from '../domain/repositories/notification.repository.interface';
import { IUserBlockRepository } from '../domain/repositories/user-block.repository.interface';
import { TeamEntity, TeamMemberEntity, TeamInvitationEntity } from '../domain/entities/team.entity';
import { TeamVisibility } from '@/types';
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError
} from '../errors';

export class TeamCommandService {
  constructor(
    private readonly teamRepo: ITeamRepository,
    private readonly hackathonRepo: IHackathonRepository,
    private readonly profileRepo: IProfileRepository,
    private readonly notificationRepo: INotificationRepository,
    private readonly userBlockRepo?: IUserBlockRepository
  ) {}

  /**
   * Atomically creates a new team for a hackathon with the creator as owner.
   */
  public async createTeam(
    context: RequestContext,
    input: {
      hackathonId: string;
      name: string;
      description?: string | null;
      visibility?: TeamVisibility;
      maxMembers?: number;
    }
  ): Promise<TeamEntity> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required to create a team');
    }

    const trimmedName = (input.name || '').trim();
    if (!trimmedName) {
      throw new ValidationError('Team name is required');
    }
    if (trimmedName.length > 50) {
      throw new ValidationError('Team name must not exceed 50 characters');
    }

    // Check hackathon exists and is active
    const hackathon = await this.hackathonRepo.findById(input.hackathonId);
    if (!hackathon) {
      throw new NotFoundError('Hackathon not found');
    }

    const statusValue = typeof (hackathon as any).status?.getValue === 'function'
      ? (hackathon as any).status.getValue()
      : String(hackathon.status || '');

    if (statusValue !== 'approved') {
      throw new ValidationError('Team formation is only allowed for approved hackathons');
    }

    // Verify user does not already have an active team for this hackathon
    const existingActive = await this.teamRepo.getActiveTeamForUserAndHackathon(userId, input.hackathonId);
    if (existingActive) {
      throw new ConflictError('You already have an active team for this hackathon');
    }

    // Determine max team size using hackathon limits
    const hackMax = typeof (hackathon as any).teamSize?.getMaxSize === 'function'
      ? (hackathon as any).teamSize.getMaxSize()
      : (typeof hackathon.maxTeamSize === 'number' ? hackathon.maxTeamSize : 4);

    const requestedMax = input.maxMembers && input.maxMembers >= 1 ? input.maxMembers : hackMax;
    const maxMembers = Math.min(requestedMax, hackMax);

    const now = Date.now();
    const teamId = crypto.randomUUID();

    const team = new TeamEntity({
      id: teamId,
      hackathonId: input.hackathonId,
      ownerUserId: userId,
      name: trimmedName,
      description: input.description ? input.description.trim() : null,
      status: 'forming',
      visibility: input.visibility || 'private',
      maxMembers,
      createdAt: now,
      updatedAt: now
    });

    const createdTeam = await this.teamRepo.createTeam(team);

    // Create owner membership
    const ownerMember = new TeamMemberEntity({
      id: crypto.randomUUID(),
      teamId: createdTeam.id,
      userId,
      role: 'owner',
      membershipStatus: 'active',
      joinedAt: now,
      updatedAt: now
    });

    await this.teamRepo.addMember(ownerMember);

    return createdTeam;
  }

  /**
   * Updates team metadata (name, description, visibility).
   */
  public async updateTeam(
    context: RequestContext,
    teamId: string,
    input: {
      name?: string;
      description?: string | null;
      visibility?: TeamVisibility;
    }
  ): Promise<TeamEntity> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    const team = await this.teamRepo.getTeamById(teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const member = await this.teamRepo.getMember(teamId, userId);
    if (!member || !member.isLeadOrOwner()) {
      throw new AuthorizationError('Only team owners or leads can update team details');
    }

    const name = input.name !== undefined ? input.name.trim() : team.name;
    if (!name) {
      throw new ValidationError('Team name cannot be empty');
    }

    const updated = new TeamEntity({
      ...team.toJSON(),
      name,
      description: input.description !== undefined ? input.description : team.description,
      visibility: input.visibility || team.visibility,
      updatedAt: Date.now()
    });

    return await this.teamRepo.updateTeam(updated);
  }

  /**
   * Invites a prospective teammate to the team.
   */
  public async inviteMember(
    context: RequestContext,
    teamId: string,
    input: {
      inviteeUserId: string;
      message?: string;
    }
  ): Promise<TeamInvitationEntity> {
    const inviterUserId = context.user?.id;
    if (!inviterUserId) {
      throw new AuthenticationError('Authentication required to send invitations');
    }

    if (inviterUserId === input.inviteeUserId) {
      throw new ValidationError('You cannot invite yourself');
    }

    const team = await this.teamRepo.getTeamById(teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Verify inviter is owner or lead
    const inviterMember = await this.teamRepo.getMember(teamId, inviterUserId);
    if (!inviterMember || !inviterMember.isLeadOrOwner()) {
      throw new AuthorizationError('Only team owners or leads can invite new members');
    }

    // Verify team capacity and state
    const members = await this.teamRepo.getMembersByTeamId(teamId);
    const activeMembers = members.filter(m => m.isActive());
    if (!team.canAcceptNewMembers(activeMembers.length)) {
      throw new ValidationError('Team is full or not accepting new members');
    }

    // Verify invitee exists
    const inviteeProfile = await this.profileRepo.findById(input.inviteeUserId);
    if (!inviteeProfile) {
      throw new NotFoundError('User not found');
    }

    // Check bidirectional block barrier
    if (this.userBlockRepo) {
      const isBlocked = await this.userBlockRepo.isBlockedEitherDirection(inviterUserId, input.inviteeUserId);
      if (isBlocked) {
        throw new ValidationError('Cannot send invitation to this user');
      }
    }

    // Check invitee is discoverable
    const isDiscoverable = typeof (inviteeProfile as any).toProps === 'function'
      ? (inviteeProfile as any).toProps().discoverableForTeams
      : Boolean(inviteeProfile.discoverableForTeams ?? (inviteeProfile as any).discoverable_for_teams);

    if (!isDiscoverable) {
      throw new ValidationError('This developer has not enabled teammate discovery');
    }

    // Check if invitee is already an active member of this team
    const isAlreadyMember = members.some(m => m.userId === input.inviteeUserId && m.isActive());
    if (isAlreadyMember) {
      throw new ConflictError('This user is already a member of your team');
    }

    // Check if invitee already has an active team for this hackathon
    const inviteeActiveTeam = await this.teamRepo.getActiveTeamForUserAndHackathon(input.inviteeUserId, team.hackathonId);
    if (inviteeActiveTeam) {
      throw new ConflictError('This user is already in an active team for this hackathon');
    }

    // Check duplicate pending invite
    const existingInvite = await this.teamRepo.getPendingInvitation(teamId, input.inviteeUserId);
    if (existingInvite && existingInvite.isPending()) {
      throw new ConflictError('An active invitation has already been sent to this developer');
    }

    const now = Date.now();
    const invitation = new TeamInvitationEntity({
      id: crypto.randomUUID(),
      teamId,
      inviterUserId,
      inviteeUserId: input.inviteeUserId,
      status: 'pending',
      message: input.message ? input.message.trim() : null,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
      respondedAt: null,
      createdAt: now,
      updatedAt: now
    });

    const saved = await this.teamRepo.createInvitation(invitation);

    // Send in-app notification to invitee
    try {
      await this.notificationRepo.create({
        userId: input.inviteeUserId,
        type: 'team_invitation',
        title: `Team Invitation: ${team.name}`,
        body: `${context.user?.fullName || (context.user as any)?.name || 'A developer'} invited you to join "${team.name}" for the upcoming hackathon.`,
        isRead: false,
        metadata: {
          teamId: team.id,
          hackathonId: team.hackathonId,
          invitationId: saved.id
        }
      });
    } catch (err) {
      console.warn('[TeamCommandService] Failed to dispatch invitation notification:', err);
    }

    return saved;
  }

  /**
   * Accepts a team invitation atomically.
   */
  public async acceptInvitation(
    context: RequestContext,
    invitationId: string
  ): Promise<{ team: TeamEntity; member: TeamMemberEntity }> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required to accept invitation');
    }

    const invitation = await this.teamRepo.getInvitationById(invitationId);
    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    if (invitation.inviteeUserId !== userId) {
      throw new AuthorizationError('You are not authorized to accept this invitation');
    }

    if (!invitation.isPending()) {
      throw new ValidationError(`Invitation is no longer pending (current: ${invitation.status})`);
    }

    const team = await this.teamRepo.getTeamById(invitation.teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Check team status
    if (team.status !== 'forming' && team.status !== 'active') {
      throw new ValidationError('This team is no longer accepting new members');
    }

    // Check team capacity
    const members = await this.teamRepo.getMembersByTeamId(team.id);
    const activeMembers = members.filter(m => m.isActive());
    if (activeMembers.length >= team.maxMembers) {
      throw new ValidationError('Team has reached maximum capacity');
    }

    // Check user does not already have an active team for this hackathon
    const existingTeam = await this.teamRepo.getActiveTeamForUserAndHackathon(userId, team.hackathonId);
    if (existingTeam && existingTeam.id !== team.id) {
      throw new ConflictError('You are already an active member of another team for this hackathon');
    }

    const now = Date.now();

    // Create or reactivate membership
    const existingMember = await this.teamRepo.getMember(team.id, userId);
    let memberEntity: TeamMemberEntity;
    if (existingMember) {
      memberEntity = new TeamMemberEntity({
        ...existingMember.toJSON(),
        membershipStatus: 'active',
        updatedAt: now
      });
      await this.teamRepo.updateMember(memberEntity);
    } else {
      memberEntity = new TeamMemberEntity({
        id: crypto.randomUUID(),
        teamId: team.id,
        userId,
        role: 'member',
        membershipStatus: 'active',
        joinedAt: now,
        updatedAt: now
      });
      await this.teamRepo.addMember(memberEntity);
    }

    // Mark invitation accepted
    const updatedInvite = new TeamInvitationEntity({
      ...invitation.toJSON(),
      status: 'accepted',
      respondedAt: now,
      updatedAt: now
    });
    await this.teamRepo.updateInvitation(updatedInvite);

    // Notify team owner/lead
    try {
      await this.notificationRepo.create({
        userId: team.ownerUserId,
        type: 'team_member_joined',
        title: `Teammate Joined: ${team.name}`,
        body: `${context.user?.fullName || (context.user as any)?.name || 'A developer'} accepted your invitation and joined "${team.name}".`,
        isRead: false,
        metadata: {
          teamId: team.id,
          memberUserId: userId
        }
      });
    } catch (err) {
      console.warn('[TeamCommandService] Failed to dispatch member joined notification:', err);
    }

    return { team, member: memberEntity };
  }

  /**
   * Declines a team invitation.
   */
  public async declineInvitation(
    context: RequestContext,
    invitationId: string
  ): Promise<TeamInvitationEntity> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    const invitation = await this.teamRepo.getInvitationById(invitationId);
    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    if (invitation.inviteeUserId !== userId) {
      throw new AuthorizationError('You are not authorized to decline this invitation');
    }

    if (!invitation.isPending()) {
      throw new ValidationError('Invitation is not pending');
    }

    const now = Date.now();
    const updated = new TeamInvitationEntity({
      ...invitation.toJSON(),
      status: 'declined',
      respondedAt: now,
      updatedAt: now
    });

    const saved = await this.teamRepo.updateInvitation(updated);

    // Notify team inviter
    try {
      await this.notificationRepo.create({
        userId: invitation.inviterUserId,
        type: 'team_invitation_declined',
        title: 'Team Invitation Declined',
        body: `${context.user?.fullName || (context.user as any)?.name || 'A developer'} declined the invitation to join your team.`,
        isRead: false,
        metadata: {
          teamId: invitation.teamId,
          invitationId: invitation.id
        }
      });
    } catch (err) {
      console.warn('[TeamCommandService] Failed to dispatch declined notification:', err);
    }

    return saved;
  }

  /**
   * Cancels a pending team invitation (inviter only).
   */
  public async cancelInvitation(
    context: RequestContext,
    invitationId: string
  ): Promise<TeamInvitationEntity> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    const invitation = await this.teamRepo.getInvitationById(invitationId);
    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    if (invitation.inviterUserId !== userId) {
      const team = await this.teamRepo.getTeamById(invitation.teamId);
      if (!team || team.ownerUserId !== userId) {
        throw new AuthorizationError('Only the inviter or team owner can cancel this invitation');
      }
    }

    if (invitation.status !== 'pending') {
      throw new ValidationError('Only pending invitations can be cancelled');
    }

    const now = Date.now();
    const updated = new TeamInvitationEntity({
      ...invitation.toJSON(),
      status: 'cancelled',
      respondedAt: now,
      updatedAt: now
    });

    return await this.teamRepo.updateInvitation(updated);
  }

  /**
   * Removes a member or leaves the team with owner succession handling.
   */
  public async leaveOrRemoveMember(
    context: RequestContext,
    teamId: string,
    targetUserId: string
  ): Promise<{ teamArchived: boolean; newOwnerId?: string }> {
    const currentUserId = context.user?.id;
    if (!currentUserId) {
      throw new AuthenticationError('Authentication required');
    }

    const team = await this.teamRepo.getTeamById(teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const isSelf = currentUserId === targetUserId;
    const currentMember = await this.teamRepo.getMember(teamId, currentUserId);

    if (!isSelf && (!currentMember || !currentMember.isLeadOrOwner())) {
      throw new AuthorizationError('Only team owners or leads can remove other members');
    }

    const targetMember = await this.teamRepo.getMember(teamId, targetUserId);
    if (!targetMember || !targetMember.isActive()) {
      throw new NotFoundError('Member is not active in this team');
    }

    // Mark member left/removed
    const updatedMember = new TeamMemberEntity({
      ...targetMember.toJSON(),
      membershipStatus: isSelf ? 'left' : 'removed',
      updatedAt: Date.now()
    });
    await this.teamRepo.updateMember(updatedMember);

    // Check remaining active members
    const allMembers = await this.teamRepo.getMembersByTeamId(teamId);
    const remainingActive = allMembers.filter(m => m.isActive() && m.userId !== targetUserId);

    if (remainingActive.length === 0) {
      // Archive team if empty
      const archived = new TeamEntity({
        ...team.toJSON(),
        status: 'archived',
        updatedAt: Date.now()
      });
      await this.teamRepo.updateTeam(archived);
      return { teamArchived: true };
    }

    // If owner left, transfer ownership to earliest active member or lead
    if (team.ownerUserId === targetUserId) {
      const nextLead = remainingActive.find(m => m.role === 'lead') || remainingActive[0];
      const newOwnerMember = new TeamMemberEntity({
        ...nextLead.toJSON(),
        role: 'owner',
        updatedAt: Date.now()
      });
      await this.teamRepo.updateMember(newOwnerMember);

      const updatedTeam = new TeamEntity({
        ...team.toJSON(),
        ownerUserId: nextLead.userId,
        updatedAt: Date.now()
      });
      await this.teamRepo.updateTeam(updatedTeam);

      return { teamArchived: false, newOwnerId: nextLead.userId };
    }

    return { teamArchived: false };
  }

  /**
   * Transfers team ownership to an existing active team member.
   */
  public async transferOwnership(
    context: RequestContext,
    teamId: string,
    newOwnerUserId: string
  ): Promise<TeamEntity> {
    const currentUserId = context.user?.id;
    if (!currentUserId) {
      throw new AuthenticationError('Authentication required');
    }

    if (currentUserId === newOwnerUserId) {
      throw new ValidationError('You are already the owner of this team');
    }

    const team = await this.teamRepo.getTeamById(teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    if (team.ownerUserId !== currentUserId) {
      throw new AuthorizationError('Only the team owner can transfer ownership');
    }

    if (team.status === 'archived' || team.status === 'completed') {
      throw new ValidationError(`Cannot transfer ownership of an ${team.status} team`);
    }

    const targetMember = await this.teamRepo.getMember(teamId, newOwnerUserId);
    if (!targetMember || !targetMember.isActive()) {
      throw new ValidationError('The new owner must be an active member of this team');
    }

    const updatedTeam = await this.teamRepo.transferOwnership(teamId, currentUserId, newOwnerUserId);

    // Notify the new owner
    try {
      await this.notificationRepo.create({
        userId: newOwnerUserId,
        type: 'team_ownership_transferred',
        title: `Team Ownership: ${team.name}`,
        body: `You are now the owner of team "${team.name}".`,
        isRead: false,
        metadata: {
          teamId: team.id,
          previousOwnerId: currentUserId
        }
      });
    } catch (err) {
      console.warn('[TeamCommandService] Failed to notify new owner:', err);
    }

    return updatedTeam;
  }

  /**
   * Leaves the team with deterministic ownership succession.
   */
  public async leaveTeam(
    context: RequestContext,
    teamId: string
  ): Promise<{ team: TeamEntity; action: string; newOwnerId?: string }> {
    const currentUserId = context.user?.id;
    if (!currentUserId) {
      throw new AuthenticationError('Authentication required');
    }

    const team = await this.teamRepo.getTeamById(teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const member = await this.teamRepo.getMember(teamId, currentUserId);
    if (!member || !member.isActive()) {
      throw new AuthorizationError('You are not an active member of this team');
    }

    if (team.status === 'locked' || team.status === 'submitted') {
      throw new ValidationError(`Cannot leave a team that is ${team.status}. Please contact the organizers if changes are required.`);
    }

    return await this.teamRepo.leaveTeamWithSuccession(teamId, currentUserId);
  }
}
