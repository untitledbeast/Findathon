/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestContext } from '../context/request-context';
import { ITeamRepository } from '../domain/repositories/team.repository.interface';
import { IHackathonRepository } from '../domain/repositories/hackathon.repository.interface';
import { IDeveloperProfileRepository } from '../domain/repositories/developer-profile.repository.interface';
import { IProfileRepository } from '../domain/repositories/profile.repository.interface';
import { IConnectionRepository } from '../domain/repositories/connection.repository.interface';
import { IUserBlockRepository } from '../domain/repositories/user-block.repository.interface';
import { DeveloperCapabilityProfile } from '../domain/value-objects/developer-capability-profile';
import { TeamCompatibilityEngine } from '../domain/matching/team-compatibility-engine';
import { TeamMapper } from '../domain/mappers/team.mapper';
import { HackathonAnalysisService } from './hackathon-analysis.service';
import {
  TeamDTO,
  TeamMemberDTO,
  TeamInvitationDTO,
  TeamCompatibilityResultDTO,
  TeammateCandidateDTO
} from '@/types';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError
} from '../errors';

export class TeamQueryService {
  constructor(
    private readonly teamRepo: ITeamRepository,
    private readonly hackathonRepo: IHackathonRepository,
    private readonly devProfileRepo: IDeveloperProfileRepository,
    private readonly profileRepo: IProfileRepository,
    private readonly connectionRepo?: IConnectionRepository,
    private readonly userBlockRepo?: IUserBlockRepository
  ) {}

  /**
   * Retrieves all teams the authenticated user belongs to.
   */
  public async getMyTeams(context: RequestContext): Promise<{
    teams: TeamDTO[];
    pendingInvitations: TeamInvitationDTO[];
  }> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    const teamEntities = await this.teamRepo.getTeamsByUserId(userId);
    const invitations = await this.teamRepo.getInvitationsByInvitee(userId);

    const teamDTOs: TeamDTO[] = await Promise.all(
      teamEntities.map(async team => {
        const members = await this.teamRepo.getMembersByTeamId(team.id);
        const activeMembers = members.filter(m => m.isActive());
        const hackathon = await this.hackathonRepo.findById(team.hackathonId);

        return TeamMapper.entityToDTO(
          team,
          activeMembers.length,
          undefined,
          hackathon ? {
            id: hackathon.id,
            title: typeof (hackathon as any).title?.getValue === 'function' ? (hackathon as any).title.getValue() : String(hackathon.title),
            slug: typeof (hackathon as any).slug?.getValue === 'function' ? (hackathon as any).slug.getValue() : String(hackathon.slug),
            coverImageUrl: typeof (hackathon as any).coverImageUrl?.getValue === 'function' ? (hackathon as any).coverImageUrl.getValue() : ((hackathon as any).coverImageUrl || null),
            startDate: typeof (hackathon as any).dateRange?.getStartDate === 'function'
              ? (hackathon as any).dateRange.getStartDate().toISOString()
              : new Date((hackathon as any).startDate || (hackathon as any).dateRange?.startDate || Date.now()).toISOString(),
            endDate: typeof (hackathon as any).dateRange?.getEndDate === 'function'
              ? (hackathon as any).dateRange.getEndDate().toISOString()
              : new Date((hackathon as any).endDate || (hackathon as any).dateRange?.endDate || Date.now()).toISOString(),
            minTeamSize: typeof (hackathon as any).teamSize?.getMinSize === 'function' ? (hackathon as any).teamSize.getMinSize() : ((hackathon as any).minTeamSize || 1),
            maxTeamSize: typeof (hackathon as any).teamSize?.getMaxSize === 'function' ? (hackathon as any).teamSize.getMaxSize() : ((hackathon as any).maxTeamSize || 4)
          } : undefined
        );
      })
    );

    const invitationDTOs: TeamInvitationDTO[] = await Promise.all(
      invitations.map(async inv => {
        const team = await this.teamRepo.getTeamById(inv.teamId);
        const inviterProfile = await this.profileRepo.findById(inv.inviterUserId);
        const teamDTO = team ? TeamMapper.entityToDTO(team) : undefined;

        return TeamMapper.invitationEntityToDTO(
          inv,
          teamDTO,
          inviterProfile ? {
            id: inviterProfile.id,
            fullName: inviterProfile.fullName,
            avatarUrl: typeof (inviterProfile.avatarUrl as any)?.getValue === 'function' ? (inviterProfile.avatarUrl as any).getValue() : (inviterProfile.avatarUrl || null)
          } : undefined
        );
      })
    );

    return {
      teams: teamDTOs,
      pendingInvitations: invitationDTOs
    };
  }

  /**
   * Retrieves single team details with full members and invitations.
   */
  public async getTeamById(context: RequestContext, teamId: string): Promise<{
    team: TeamDTO;
    isMember: boolean;
    isOwnerOrLead: boolean;
    invitations: TeamInvitationDTO[];
  }> {
    const userId = context.user?.id;
    const team = await this.teamRepo.getTeamById(teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const memberEntities = await this.teamRepo.getMembersByTeamId(teamId);
    const activeMembers = memberEntities.filter(m => m.isActive());
    const isMember = Boolean(userId && activeMembers.some(m => m.userId === userId));
    const isOwnerOrLead = Boolean(userId && (team.ownerUserId === userId || activeMembers.some(m => m.userId === userId && m.isLeadOrOwner())));

    // Check authorization if private
    if (team.visibility === 'private' && !isMember) {
      throw new AuthorizationError('You do not have access to view this private team');
    }

    const hackathon = await this.hackathonRepo.findById(team.hackathonId);

    // Enriched member DTOs
    const memberDTOs: TeamMemberDTO[] = await Promise.all(
      activeMembers.map(async m => {
        const userProfile = await this.profileRepo.findById(m.userId);
        const devProfile = await this.devProfileRepo.getByUserId(m.userId);
        return TeamMapper.memberEntityToDTO(m, {
          id: m.userId,
          fullName: userProfile?.fullName || 'Teammate',
          avatarUrl: typeof (userProfile?.avatarUrl as any)?.getValue === 'function' ? (userProfile?.avatarUrl as any).getValue() : (userProfile?.avatarUrl || null),
          technicalLevel: devProfile?.experienceLevel || 'beginner',
          topLanguages: Object.keys(devProfile?.topLanguages || {}).slice(0, 3)
        });
      })
    );

    // Enriched invitations (visible only to leads/owners)
    let invitationDTOs: TeamInvitationDTO[] = [];
    if (isOwnerOrLead) {
      const invEntities = await this.teamRepo.getInvitationsByTeamId(teamId);
      invitationDTOs = await Promise.all(
        invEntities.filter(inv => inv.status === 'pending').map(async inv => {
          const inviteeProfile = await this.profileRepo.findById(inv.inviteeUserId);
          return TeamMapper.invitationEntityToDTO(
            inv,
            undefined,
            undefined,
            inviteeProfile ? {
              id: inviteeProfile.id,
              fullName: inviteeProfile.fullName,
              avatarUrl: typeof (inviteeProfile.avatarUrl as any)?.getValue === 'function' ? (inviteeProfile.avatarUrl as any).getValue() : (inviteeProfile.avatarUrl || null)
            } : undefined
          );
        })
      );
    }

    const teamDTO = TeamMapper.entityToDTO(
      team,
      activeMembers.length,
      memberDTOs,
      hackathon ? {
        id: hackathon.id,
        title: typeof (hackathon as any).title?.getValue === 'function' ? (hackathon as any).title.getValue() : String(hackathon.title),
        slug: typeof (hackathon as any).slug?.getValue === 'function' ? (hackathon as any).slug.getValue() : String(hackathon.slug),
        coverImageUrl: typeof (hackathon as any).coverImageUrl?.getValue === 'function' ? (hackathon as any).coverImageUrl.getValue() : ((hackathon as any).coverImageUrl || null),
        startDate: typeof (hackathon as any).dateRange?.getStartDate === 'function'
          ? (hackathon as any).dateRange.getStartDate().toISOString()
          : new Date((hackathon as any).startDate || (hackathon as any).dateRange?.startDate || Date.now()).toISOString(),
        endDate: typeof (hackathon as any).dateRange?.getEndDate === 'function'
          ? (hackathon as any).dateRange.getEndDate().toISOString()
          : new Date((hackathon as any).endDate || (hackathon as any).dateRange?.endDate || Date.now()).toISOString(),
        minTeamSize: typeof (hackathon as any).teamSize?.getMinSize === 'function' ? (hackathon as any).teamSize.getMinSize() : ((hackathon as any).minTeamSize || 1),
        maxTeamSize: typeof (hackathon as any).teamSize?.getMaxSize === 'function' ? (hackathon as any).teamSize.getMaxSize() : ((hackathon as any).maxTeamSize || 4)
      } : undefined
    );

    return {
      team: teamDTO,
      isMember,
      isOwnerOrLead,
      invitations: invitationDTOs
    };
  }

  /**
   * Evaluates team compatibility and capability coverage deterministically.
   */
  public async getTeamIntelligence(
    context: RequestContext,
    teamId: string
  ): Promise<TeamCompatibilityResultDTO> {
    const team = await this.teamRepo.getTeamById(teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const hackathon = await this.hackathonRepo.findById(team.hackathonId);
    if (!hackathon) {
      throw new NotFoundError('Hackathon not found');
    }

    const hackathonAnalysis = HackathonAnalysisService.analyze(hackathon as unknown as Record<string, unknown>);
    const hackCapability = hackathonAnalysis.capabilityProfile;

    const memberEntities = await this.teamRepo.getMembersByTeamId(teamId);
    const activeMembers = memberEntities.filter(m => m.isActive());

    const now = Date.now();
    const memberCapabilityProfiles: DeveloperCapabilityProfile[] = await Promise.all(
      activeMembers.map(async m => {
        const profileEntity = await this.devProfileRepo.getByUserId(m.userId);
        const evidenceList = await this.devProfileRepo.getEvidenceByUserId(m.userId);
        return DeveloperCapabilityProfile.fromEvidence(m.userId, profileEntity, evidenceList, now);
      })
    );

    return TeamCompatibilityEngine.calculateTeamFit(hackCapability, memberCapabilityProfiles);
  }

  /**
   * Recommends complementary teammate candidates for a team.
   */
  public async getRecommendedTeammates(
    context: RequestContext,
    teamId: string,
    options: { limit?: number } = {}
  ): Promise<{
    candidates: TeammateCandidateDTO[];
    teamFitScore: number;
    hackathonTitle: string;
  }> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    const team = await this.teamRepo.getTeamById(teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const member = await this.teamRepo.getMember(teamId, userId);
    if (!member || !member.isActive()) {
      throw new AuthorizationError('You must be an active team member to find teammates');
    }

    const hackathon = await this.hackathonRepo.findById(team.hackathonId);
    if (!hackathon) {
      throw new NotFoundError('Hackathon not found');
    }

    const hackathonAnalysis = HackathonAnalysisService.analyze(hackathon as unknown as Record<string, unknown>);
    const hackCapability = hackathonAnalysis.capabilityProfile;

    const memberEntities = await this.teamRepo.getMembersByTeamId(teamId);
    const activeMembers = memberEntities.filter(m => m.isActive());
    const existingUserIds = new Set(activeMembers.map(m => m.userId));

    // Load active team member capability profiles
    const now = Date.now();
    const currentMemberProfiles: DeveloperCapabilityProfile[] = await Promise.all(
      activeMembers.map(async m => {
        const devProfile = await this.devProfileRepo.getByUserId(m.userId);
        const evidence = await this.devProfileRepo.getEvidenceByUserId(m.userId);
        return DeveloperCapabilityProfile.fromEvidence(m.userId, devProfile, evidence, now);
      })
    );

    const baselineTeamFit = TeamCompatibilityEngine.calculateTeamFit(hackCapability, currentMemberProfiles);

    // Fetch bidirectional blocked user IDs
    const blockedIds = this.userBlockRepo
      ? await this.userBlockRepo.getAllBlockedOrBlockerIds(userId)
      : new Set<string>();

    const excludedUserIds = Array.from(new Set([...existingUserIds, ...blockedIds, userId]));

    // Fetch discoverable users (bounded prefiltered set, excluding blocked/existing members)
    const discoverableIds = await this.teamRepo.getDiscoverableUserIds(60, 0, excludedUserIds);

    // Get pending invitations sent from this team
    const pendingInvites = await this.teamRepo.getInvitationsByTeamId(teamId);
    const pendingInviteeIds = new Set(pendingInvites.filter(i => i.isPending(now)).map(i => i.inviteeUserId));

    const candidateResults: TeammateCandidateDTO[] = [];
    const limit = Math.max(1, Math.min(20, options.limit || 8));

    for (const candUserId of discoverableIds) {
      if (existingUserIds.has(candUserId) || candUserId === userId || blockedIds.has(candUserId)) continue;

      // Check if user already has an active team for this hackathon
      const userActiveTeam = await this.teamRepo.getActiveTeamForUserAndHackathon(candUserId, team.hackathonId);
      if (userActiveTeam) continue;

      const userProfile = await this.profileRepo.findById(candUserId);
      if (!userProfile) continue;

      const devProfile = await this.devProfileRepo.getByUserId(candUserId);
      const evidence = await this.devProfileRepo.getEvidenceByUserId(candUserId);
      const candCapability = DeveloperCapabilityProfile.fromEvidence(candUserId, devProfile, evidence, now);

      // Determine connection state
      let connectionState: 'none' | 'pending_sent' | 'pending_received' | 'accepted' = 'none';
      if (this.connectionRepo) {
        const conn = await this.connectionRepo.getConnectionByPair(userId, candUserId);
        if (conn) {
          if (conn.isAccepted()) connectionState = 'accepted';
          else if (conn.isPending()) {
            connectionState = conn.initiatorUserId === userId ? 'pending_sent' : 'pending_received';
          }
        }
      }

      // Determine invitation state
      const hasPendingInvite = pendingInviteeIds.has(candUserId);
      const invitationState = hasPendingInvite ? 'pending' : 'none';

      const evaluated = TeamCompatibilityEngine.evaluateCandidateContribution(
        hackCapability,
        currentMemberProfiles,
        candCapability,
        connectionState,
        invitationState
      );

      candidateResults.push({
        ...evaluated,
        displayName: userProfile.fullName || 'Verified Developer',
        avatarUrl: typeof (userProfile.avatarUrl as any)?.getValue === 'function' ? (userProfile.avatarUrl as any).getValue() : (userProfile.avatarUrl || null),
        hasPendingInvite
      });
    }

    // Sort deterministically:
    // 1. Technical Marginal Contribution score (descending)
    // 2. Small connection tie-breaker (connected builders break ties)
    // 3. Deterministic userId tie-breaker
    candidateResults.sort((a, b) => {
      if (b.contributionScore !== a.contributionScore) {
        return b.contributionScore - a.contributionScore;
      }
      const aConn = a.connectionState === 'accepted' ? 1 : 0;
      const bConn = b.connectionState === 'accepted' ? 1 : 0;
      if (bConn !== aConn) {
        return bConn - aConn;
      }
      return a.userId.localeCompare(b.userId);
    });

    return {
      candidates: candidateResults.slice(0, limit),
      teamFitScore: baselineTeamFit.teamFitScore,
      hackathonTitle: typeof (hackathon as any).title?.getValue === 'function' ? (hackathon as any).title.getValue() : String(hackathon.title || '')
    };
  }
}
