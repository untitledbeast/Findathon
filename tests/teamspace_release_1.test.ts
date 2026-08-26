/* eslint-disable */
import { TeamEntity, TeamMemberEntity, TeamInvitationEntity } from '../lib/domain/entities/team.entity';
import { DeveloperCapabilityProfile } from '../lib/domain/value-objects/developer-capability-profile';
import { DeveloperProfileEntity } from '../lib/domain/entities/developer-profile.entity';
import { DeveloperSkillEvidenceEntity } from '../lib/domain/entities/developer-skill-evidence.entity';
import { HackathonCapabilityProfile } from '../lib/domain/value-objects/hackathon-capability-profile';
import { TeamCompatibilityEngine } from '../lib/domain/matching/team-compatibility-engine';
import { TeamGapEngine } from '../lib/domain/matching/team-gap-engine';
import { TeamMapper } from '../lib/domain/mappers/team.mapper';
import { ITeamRepository } from '../lib/domain/repositories/team.repository.interface';
import { IHackathonRepository } from '../lib/domain/repositories/hackathon.repository.interface';
import { IProfileRepository } from '../lib/domain/repositories/profile.repository.interface';
import { INotificationRepository } from '../lib/domain/repositories/notification.repository.interface';
import { IDeveloperProfileRepository, ExternalAccountData } from '../lib/domain/repositories/developer-profile.repository.interface';
import { TeamCommandService } from '../lib/services/team-command.service';
import { TeamQueryService } from '../lib/services/team-query.service';
import { createRequestContext } from '../lib/context/request-context';
import { HackathonEntity } from '../lib/domain/entities/hackathon.entity';
import { ProfileEntity } from '../lib/domain/entities/profile.entity';
import { Slug, Url, DateRange, RegistrationWindow, Location, PrizePool, TeamSize, HackathonStatusState } from '../lib/domain/value-objects';
import { HACKATHON_STATUS } from '../constants/status';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// ─── IN-MEMORY MOCKS ─────────────────────────────────────────────
class MockTeamRepository implements ITeamRepository {
  public teams = new Map<string, TeamEntity>();
  public members: TeamMemberEntity[] = [];
  public invitations: TeamInvitationEntity[] = [];
  public discoverableUsers: string[] = [];

  async createTeam(team: TeamEntity): Promise<TeamEntity> {
    this.teams.set(team.id, team);
    return team;
  }

  async getTeamById(id: string): Promise<TeamEntity | null> {
    return this.teams.get(id) || null;
  }

  async getTeamsByHackathon(hackathonId: string): Promise<TeamEntity[]> {
    return Array.from(this.teams.values()).filter(t => t.hackathonId === hackathonId);
  }

  async getTeamsByUserId(userId: string): Promise<TeamEntity[]> {
    const teamIds = this.members
      .filter(m => m.userId === userId && m.isActive())
      .map(m => m.teamId);
    return Array.from(this.teams.values()).filter(t => teamIds.includes(t.id));
  }

  async getActiveTeamForUserAndHackathon(userId: string, hackathonId: string): Promise<TeamEntity | null> {
    const activeMember = this.members.find(m => m.userId === userId && m.isActive());
    if (!activeMember) return null;
    const team = this.teams.get(activeMember.teamId);
    if (!team) return null;
    if (team.hackathonId === hackathonId && ['forming', 'active', 'locked', 'submitted'].includes(team.status)) {
      return team;
    }
    return null;
  }

  async updateTeam(team: TeamEntity): Promise<TeamEntity> {
    this.teams.set(team.id, team);
    return team;
  }

  async deleteTeam(id: string): Promise<void> {
    this.teams.delete(id);
    this.members = this.members.filter(m => m.teamId !== id);
    this.invitations = this.invitations.filter(i => i.teamId !== id);
  }

  async getMembersByTeamId(teamId: string): Promise<TeamMemberEntity[]> {
    return this.members.filter(m => m.teamId === teamId);
  }

  async getMember(teamId: string, userId: string): Promise<TeamMemberEntity | null> {
    return this.members.find(m => m.teamId === teamId && m.userId === userId) || null;
  }

  async addMember(member: TeamMemberEntity): Promise<TeamMemberEntity> {
    this.members.push(member);
    return member;
  }

  async updateMember(member: TeamMemberEntity): Promise<TeamMemberEntity> {
    const idx = this.members.findIndex(m => m.id === member.id);
    if (idx >= 0) this.members[idx] = member;
    else this.members.push(member);
    return member;
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    this.members = this.members.filter(m => !(m.teamId === teamId && m.userId === userId));
  }

  async createInvitation(invitation: TeamInvitationEntity): Promise<TeamInvitationEntity> {
    this.invitations.push(invitation);
    return invitation;
  }

  async getInvitationById(id: string): Promise<TeamInvitationEntity | null> {
    return this.invitations.find(i => i.id === id) || null;
  }

  async getPendingInvitation(teamId: string, inviteeUserId: string): Promise<TeamInvitationEntity | null> {
    const now = Date.now();
    return this.invitations.find(i => i.teamId === teamId && i.inviteeUserId === inviteeUserId && i.isPending(now)) || null;
  }

  async getInvitationsByTeamId(teamId: string): Promise<TeamInvitationEntity[]> {
    return this.invitations.filter(i => i.teamId === teamId);
  }

  async getInvitationsByInvitee(inviteeUserId: string): Promise<TeamInvitationEntity[]> {
    const now = Date.now();
    return this.invitations.filter(i => i.inviteeUserId === inviteeUserId && i.isPending(now));
  }

  async updateInvitation(invitation: TeamInvitationEntity): Promise<TeamInvitationEntity> {
    const idx = this.invitations.findIndex(i => i.id === invitation.id);
    if (idx >= 0) this.invitations[idx] = invitation;
    else this.invitations.push(invitation);
    return invitation;
  }

  async getDiscoverableUserIds(): Promise<string[]> {
    return this.discoverableUsers;
  }
}

class MockHackathonRepository implements IHackathonRepository {
  public hackathons = new Map<string, HackathonEntity>();

  async findById(id: string): Promise<HackathonEntity | null> {
    return this.hackathons.get(id) || null;
  }
  async findAll(): Promise<HackathonEntity[]> { return Array.from(this.hackathons.values()); }
  async findBySlug(): Promise<HackathonEntity | null> { return null; }
  async findFeatured(): Promise<HackathonEntity[]> { return []; }
  async findUpcoming(): Promise<HackathonEntity[]> { return []; }
  async findByOrganizer(): Promise<HackathonEntity[]> { return []; }
  async save(hackathon: HackathonEntity): Promise<HackathonEntity> {
    this.hackathons.set(hackathon.id, hackathon);
    return hackathon;
  }
  async delete(id: string): Promise<void> { this.hackathons.delete(id); }
}

class MockProfileRepository implements IProfileRepository {
  public profiles = new Map<string, ProfileEntity>();

  async findById(id: string): Promise<ProfileEntity | null> {
    return this.profiles.get(id) || null;
  }
  async findByEmail(): Promise<ProfileEntity | null> { return null; }
  async save(profile: ProfileEntity): Promise<ProfileEntity> {
    this.profiles.set(profile.id, profile);
    return profile;
  }
  async delete(id: string): Promise<void> { this.profiles.delete(id); }
}

class MockNotificationRepository implements INotificationRepository {
  public notifications: any[] = [];
  async create(data: any): Promise<any> {
    const n = { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() };
    this.notifications.push(n);
    return n;
  }
  async createBulk(list: any[]): Promise<any[]> {
    for (const d of list) this.notifications.push(d);
    return list;
  }
  async findByUserId(userId: string): Promise<any[]> {
    return this.notifications.filter(n => n.userId === userId);
  }
  async markAsRead(): Promise<void> {}
  async markAllAsRead(): Promise<void> {}
  async getUnreadCount(): Promise<number> { return 0; }
}

class MockDevProfileRepository implements IDeveloperProfileRepository {
  public devProfiles = new Map<string, DeveloperProfileEntity>();
  public evidence = new Map<string, DeveloperSkillEvidenceEntity[]>();

  async getByUserId(userId: string): Promise<DeveloperProfileEntity | null> {
    return this.devProfiles.get(userId) || null;
  }
  async upsert(profile: DeveloperProfileEntity): Promise<DeveloperProfileEntity> {
    this.devProfiles.set(profile.userId, profile);
    return profile;
  }
  async addEvidence(ev: DeveloperSkillEvidenceEntity): Promise<DeveloperSkillEvidenceEntity> {
    const list = this.evidence.get(ev.userId) || [];
    list.push(ev);
    this.evidence.set(ev.userId, list);
    return ev;
  }
  async addEvidenceBatch(list: DeveloperSkillEvidenceEntity[]): Promise<void> {
    for (const ev of list) await this.addEvidence(ev);
  }
  async getEvidenceByUserId(userId: string): Promise<DeveloperSkillEvidenceEntity[]> {
    return this.evidence.get(userId) || [];
  }
  async linkExternalAccount(): Promise<ExternalAccountData> { throw new Error('Not needed'); }
  async getExternalAccounts(): Promise<ExternalAccountData[]> { return []; }
  async removeExternalAccount(): Promise<void> {}
  async touchProfile(): Promise<void> {}
}

const createTestEvidence = (
  userId: string,
  skillId: string,
  source: 'github' | 'leetcode' | 'linkedin',
  weight = 0.8
): DeveloperSkillEvidenceEntity => {
  const signals: Record<string, unknown> = {};
  if (skillId.startsWith('language.')) {
    signals.language = skillId.replace('language.', '');
  } else if (skillId.startsWith('framework.') || skillId.startsWith('domain.') || skillId.startsWith('database.')) {
    const rawTag = skillId === 'domain.ai_ml' ? 'ai' : (skillId === 'framework.fastapi' ? 'fastapi' : (skillId === 'framework.react' ? 'react' : skillId.replace(/^[a-z_]+\./, '')));
    signals.topics = [rawTag, skillId];
  }
  return new DeveloperSkillEvidenceEntity({
    id: `ev-${userId}-${skillId}`,
    userId,
    source,
    evidenceType: 'repo',
    externalId: `ext-${skillId}`,
    url: 'https://github.com/example/repo',
    signals,
    weight,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
};

const createTestHackathon = (id: string, title = 'Global AI Challenge', maxTeam = 4): HackathonEntity => {
  const now = Date.now();
  const dateRange = new DateRange(new Date(now + 86400000), new Date(now + 3 * 86400000));
  const registrationWindow = new RegistrationWindow(new Date(now + 43200000), dateRange);

  return new HackathonEntity({
    id,
    title,
    slug: new Slug('global-ai-challenge'),
    tagline: 'Build next-gen AI',
    description: 'Annual AI Hackathon',
    organizer: 'AI Org',
    organization: 'AI Corp',
    coverImageUrl: null,
    registerUrl: new Url('https://example.com'),
    dateRange,
    registrationWindow,
    location: new Location({ isOnline: true }),
    prizePool: new PrizePool(10000, 'USD', '$10,000'),
    tags: ['ai'],
    status: new HackathonStatusState(HACKATHON_STATUS.APPROVED),
    teamSize: new TeamSize(1, maxTeam),
    eligibility: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    socialTwitter: null,
    socialLinkedin: null,
    socialDiscord: null,
    socialInstagram: null,
    submittedBy: null,
    viewCount: 0,
    saveCount: 0,
    avgRating: 5,
    reviewCount: 0,
    isVerified: true,
    isFeatured: false,
    difficulty: 'intermediate',
    hasCertificate: true,
    isHiring: true,
    createdAt: new Date(now),
    updatedAt: new Date(now)
  });
};

// ─── MASTER TESTS ────────────────────────────────────────────────
async function runTeamSpaceTests() {
  console.log('🚀 Running Findathon TeamSpace Release 1 Master Test Suite...\n');
  let passed = 0;
  const total = 12;
  const now = Date.now();

  // Test 1: Team Entity & Membership Roles
  try {
    const team = new TeamEntity({
      id: 'team-alpha',
      hackathonId: 'hack-1',
      ownerUserId: 'user-owner',
      name: 'Alpha Squad',
      description: 'AI & Web3 track',
      status: 'forming',
      visibility: 'private',
      maxMembers: 4,
      createdAt: now,
      updatedAt: now
    });
    assert(team.name === 'Alpha Squad', 'Team name matches');
    assert(team.canAcceptNewMembers(3) === true, 'Can accept member at count 3');
    assert(team.canAcceptNewMembers(4) === false, 'Cannot accept member at max capacity 4');
    passed++;
    console.log('✅ Checkpoint 1: TeamEntity capacity & status boundaries passed');
  } catch (err: any) {
    console.error('❌ Checkpoint 1 failed:', err.message);
  }

  // Test 2: TeamGapEngine Critical Gap Detection
  try {
    const hackathon = new HackathonCapabilityProfile({
      requiredLanguages: ['language.python', 'language.typescript'],
      preferredLanguages: ['framework.fastapi'],
      frameworks: ['framework.fastapi'],
      domains: ['domain.ai_ml'],
      difficulty: 'intermediate',
      rawTags: ['ai', 'python']
    });

    const devProfile = new DeveloperProfileEntity({
      id: 'dev-1',
      userId: 'user-ts',
      topLanguages: { 'language.typescript': 0.85 },
      topSkills: { 'framework.react': 0.85 },
      interests: [],
      experienceLevel: 'intermediate',
      githubConnected: true,
      leetcodeConnected: false,
      linkedinConnected: false,
      lastComputedAt: now,
      createdAt: now,
      updatedAt: now
    });

    const evTS = createTestEvidence('user-ts', 'language.typescript', 'github', 0.9);
    const capTS = DeveloperCapabilityProfile.fromEvidence('user-ts', devProfile, [evTS], now);
    const gaps = TeamGapEngine.evaluateGaps(hackathon, [capTS]);

    assert(gaps.criticalGaps.length >= 1, 'Critical gap detected for missing Python');
    assert(gaps.criticalGaps.some(g => g.skillId === 'language.python'), 'Python is flagged as critical gap');
    assert(gaps.importantGaps.some(g => g.skillId === 'framework.fastapi' || g.skillId === 'role.backend'), 'FastAPI/Backend flagged as important gap');
    passed++;
    console.log('✅ Checkpoint 2: TeamGapEngine mandatory & domain gap analysis passed');
  } catch (err: any) {
    console.error('❌ Checkpoint 2 failed:', err.message);
  }

  // Test 3: TeamCompatibilityEngine Deterministic Team Fit Score
  try {
    const hackathon = new HackathonCapabilityProfile({
      requiredLanguages: ['language.python', 'language.typescript'],
      preferredLanguages: ['framework.fastapi', 'framework.react'],
      frameworks: ['framework.fastapi', 'framework.react'],
      domains: ['domain.ai_ml', 'domain.backend'],
      difficulty: 'intermediate',
      rawTags: ['ai', 'fullstack']
    });

    // Dev 1: Frontend (TS + React)
    const dev1 = DeveloperCapabilityProfile.fromEvidence('dev-1', null, [
      createTestEvidence('dev-1', 'language.typescript', 'github', 0.9),
      createTestEvidence('dev-1', 'framework.react', 'github', 0.9)
    ], now);

    // Dev 2: Backend + AI/ML (Python + AI/ML + FastAPI)
    const dev2 = DeveloperCapabilityProfile.fromEvidence('dev-2', null, [
      createTestEvidence('dev-2', 'language.python', 'github', 0.95),
      createTestEvidence('dev-2', 'domain.ai_ml', 'github', 0.9),
      createTestEvidence('dev-2', 'framework.fastapi', 'github', 0.85)
    ], now);

    const fitSingle = TeamCompatibilityEngine.calculateTeamFit(hackathon, [dev1]);
    const fitCombined = TeamCompatibilityEngine.calculateTeamFit(hackathon, [dev1, dev2]);

    assert(fitCombined.teamFitScore > fitSingle.teamFitScore, 'Combined team has higher fit score');
    assert(fitCombined.roleBreakdown.frontend >= 0.7, 'Frontend role coverage verified');
    assert(fitCombined.roleBreakdown.backend >= 0.7, 'Backend role coverage verified');
    assert(fitCombined.roleBreakdown.aiMl >= 0.7, 'AI/ML role coverage verified');
    passed++;
    console.log('✅ Checkpoint 3: TeamCompatibilityEngine role & multi-stack fit passed');
  } catch (err: any) {
    console.error('❌ Checkpoint 3 failed:', err.message);
  }

  // Test 4: Redundancy Penalty on Monolithic Teams
  try {
    const hackathon = new HackathonCapabilityProfile({
      requiredLanguages: ['language.python', 'language.go'],
      preferredLanguages: [],
      frameworks: [],
      domains: ['domain.backend'],
      difficulty: 'intermediate',
      rawTags: []
    });

    const m1 = DeveloperCapabilityProfile.fromEvidence('u1', null, [createTestEvidence('u1', 'language.typescript', 'github', 0.9)], now);
    const m2 = DeveloperCapabilityProfile.fromEvidence('u2', null, [createTestEvidence('u2', 'language.typescript', 'github', 0.9)], now);
    const m3 = DeveloperCapabilityProfile.fromEvidence('u3', null, [createTestEvidence('u3', 'language.typescript', 'github', 0.9)], now);

    const fit = TeamCompatibilityEngine.calculateTeamFit(hackathon, [m1, m2, m3]);
    assert(fit.redundancyPenalty > 0, 'Redundancy penalty applied for duplicated single role');
    assert(fit.explanationCodes.includes('HIGH_ROLE_REDUNDANCY'), 'Explanation code present');
    passed++;
    console.log('✅ Checkpoint 4: Bounded redundancy penalty invariant passed');
  } catch (err: any) {
    console.error('❌ Checkpoint 4 failed:', err.message);
  }

  // Test 5: Candidate Contribution Ranking
  try {
    const hackathon = new HackathonCapabilityProfile({
      requiredLanguages: ['language.python'],
      preferredLanguages: ['framework.fastapi'],
      frameworks: ['framework.fastapi'],
      domains: ['domain.ai_ml'],
      difficulty: 'intermediate',
      rawTags: ['ai']
    });

    const teamDev = DeveloperCapabilityProfile.fromEvidence('team-1', null, [
      createTestEvidence('team-1', 'language.typescript', 'github', 0.9),
      createTestEvidence('team-1', 'framework.react', 'github', 0.9)
    ], now);

    const candAI = DeveloperCapabilityProfile.fromEvidence('cand-ai', null, [
      createTestEvidence('cand-ai', 'language.python', 'github', 0.95),
      createTestEvidence('cand-ai', 'domain.ai_ml', 'github', 0.9)
    ], now);

    const candTS = DeveloperCapabilityProfile.fromEvidence('cand-ts', null, [
      createTestEvidence('cand-ts', 'language.typescript', 'github', 0.8)
    ], now);

    const contribAI = TeamCompatibilityEngine.evaluateCandidateContribution(hackathon, [teamDev], candAI);
    const contribTS = TeamCompatibilityEngine.evaluateCandidateContribution(hackathon, [teamDev], candTS);

    assert(contribAI.contributionScore > contribTS.contributionScore, 'AI candidate has higher contribution');
    assert(contribAI.fillsGaps.length > 0, 'AI candidate explicitly fills critical gaps');
    assert(contribAI.addsSkills.includes('Python'), 'AI candidate adds Python to team stack');
    passed++;
    console.log('✅ Checkpoint 5: Candidate contribution ranking & gap filling passed');
  } catch (err: any) {
    console.error('❌ Checkpoint 5 failed:', err.message);
  }

  // Test 6: LinkedIn Identity Contributes 0 Technical Evidence
  try {
    const hackathon = new HackathonCapabilityProfile({
      requiredLanguages: ['language.python'],
      preferredLanguages: [],
      frameworks: [],
      domains: ['domain.ai_ml'],
      difficulty: 'intermediate',
      rawTags: ['python']
    });

    const liDev = DeveloperCapabilityProfile.fromEvidence('u-li', null, [
      createTestEvidence('u-li', 'identity.linkedin_verified', 'linkedin', 0.0)
    ], now);

    assert(liDev.confidenceScore === 0, 'LinkedIn evidence has 0 technical confidence');
    const fit = TeamCompatibilityEngine.calculateTeamFit(hackathon, [liDev]);
    assert(fit.confidence === 'low', 'Confidence remains low');
    assert(fit.roleBreakdown.aiMl === 0, 'Zero artificial AI skills added');
    passed++;
    console.log('✅ Checkpoint 6: LinkedIn-only 0-weight technical isolation passed');
  } catch (err: any) {
    console.error('❌ Checkpoint 6 failed:', err.message);
  }

  // Test 7: TeamCommandService - Atomic Team Creation & 1 Active Team Per Hackathon
  try {
    const teamRepo = new MockTeamRepository();
    const hackRepo = new MockHackathonRepository();
    const profRepo = new MockProfileRepository();
    const notifRepo = new MockNotificationRepository();

    const hackathon = createTestHackathon('hack-test-1', 'Global AI Challenge', 4);
    await hackRepo.save(hackathon);

    const userProfile = new ProfileEntity({
      id: 'user-leader',
      role: 'user',
      fullName: 'Alice Leader',
      discoverableForTeams: true,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    });
    await profRepo.save(userProfile);

    const service = new TeamCommandService(teamRepo, hackRepo, profRepo, notifRepo);
    const ctx = createRequestContext({ id: 'user-leader', email: 'alice@example.com', name: 'Alice Leader', role: 'user' });

    const createdTeam = await service.createTeam(ctx, {
      hackathonId: 'hack-test-1',
      name: 'Neural Pioneers',
      description: 'Building AI agents'
    });

    assert(createdTeam.name === 'Neural Pioneers', 'Team created successfully');
    assert(createdTeam.maxMembers === 4, 'Max members bounded to hackathon limit 4');

    const members = await teamRepo.getMembersByTeamId(createdTeam.id);
    assert(members.length === 1, 'Owner membership created atomically');
    assert(members[0].role === 'owner', 'Owner role assigned');

    // Attempt to create second team for same hackathon -> Must Fail with ConflictError
    let duplicateFailed = false;
    try {
      await service.createTeam(ctx, {
        hackathonId: 'hack-test-1',
        name: 'Second Team'
      });
    } catch (err: any) {
      duplicateFailed = true;
      assert(err.message.includes('already have an active team'), 'Duplicate error message verified');
    }
    assert(duplicateFailed, 'One active team per hackathon strictly enforced');
    passed++;
    console.log('✅ Checkpoint 7: Atomic team creation & 1-team-per-hackathon invariant passed');
  } catch (err: any) {
    console.error('❌ Checkpoint 7 failed:', err.stack || err.message);
  }

  // Test 8: Team Invitations & Discoverability Filter
  try {
    const teamRepo = new MockTeamRepository();
    const hackRepo = new MockHackathonRepository();
    const profRepo = new MockProfileRepository();
    const notifRepo = new MockNotificationRepository();

    const hackathon = createTestHackathon('hack-test-1', 'Global AI Challenge', 2);
    await hackRepo.save(hackathon);

    // Leader Profile
    await profRepo.save(new ProfileEntity({
      id: 'user-leader',
      role: 'user',
      fullName: 'Alice Leader',
      discoverableForTeams: true,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    }));

    // Discoverable User
    await profRepo.save(new ProfileEntity({
      id: 'user-candidate-opted-in',
      role: 'user',
      fullName: 'Bob Builder',
      discoverableForTeams: true,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    }));

    // Non-Discoverable User
    await profRepo.save(new ProfileEntity({
      id: 'user-candidate-private',
      role: 'user',
      fullName: 'Charlie Private',
      discoverableForTeams: false,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    }));

    const service = new TeamCommandService(teamRepo, hackRepo, profRepo, notifRepo);
    const leaderCtx = createRequestContext({ id: 'user-leader', email: 'alice@example.com', name: 'Alice Leader', role: 'user' });

    const team = await service.createTeam(leaderCtx, {
      hackathonId: 'hack-test-1',
      name: 'Duo Squad',
      maxMembers: 2
    });

    // 1. Inviting non-discoverable user should fail
    let privateInviteFailed = false;
    try {
      await service.inviteMember(leaderCtx, team.id, {
        inviteeUserId: 'user-candidate-private'
      });
    } catch (err: any) {
      privateInviteFailed = true;
      assert(err.message.includes('has not enabled teammate discovery'), 'Privacy rejection verified');
    }
    assert(privateInviteFailed, 'Non-discoverable user protected from unsolicited invitations');

    // 2. Inviting discoverable user succeeds
    const invite = await service.inviteMember(leaderCtx, team.id, {
      inviteeUserId: 'user-candidate-opted-in',
      message: 'Join our team!'
    });
    assert(invite.status === 'pending', 'Invitation is in pending state');
    assert(notifRepo.notifications.length === 1, 'In-app notification sent to invitee');

    // 3. Duplicate pending invite should fail
    let duplicateInviteFailed = false;
    try {
      await service.inviteMember(leaderCtx, team.id, {
        inviteeUserId: 'user-candidate-opted-in'
      });
    } catch {
      duplicateInviteFailed = true;
    }
    assert(duplicateInviteFailed, 'Duplicate pending invite strictly blocked');
    passed++;
    console.log('✅ Checkpoint 8: Discoverability opt-in privacy & invitation uniqueness passed');
  } catch (err: any) {
    console.error('❌ Checkpoint 8 failed:', err.message);
  }

  // Test 9: Atomic Invitation Acceptance & Capacity Bounds
  try {
    const teamRepo = new MockTeamRepository();
    const hackRepo = new MockHackathonRepository();
    const profRepo = new MockProfileRepository();
    const notifRepo = new MockNotificationRepository();

    const hackathon = createTestHackathon('hack-test-1', 'Global AI Challenge', 2);
    await hackRepo.save(hackathon);

    await profRepo.save(new ProfileEntity({ id: 'u-lead', role: 'user', fullName: 'Lead', discoverableForTeams: true, createdAt: new Date(now), updatedAt: new Date(now) }));
    await profRepo.save(new ProfileEntity({ id: 'u-cand1', role: 'user', fullName: 'Cand1', discoverableForTeams: true, createdAt: new Date(now), updatedAt: new Date(now) }));
    await profRepo.save(new ProfileEntity({ id: 'u-cand2', role: 'user', fullName: 'Cand2', discoverableForTeams: true, createdAt: new Date(now), updatedAt: new Date(now) }));

    const service = new TeamCommandService(teamRepo, hackRepo, profRepo, notifRepo);
    const leadCtx = createRequestContext({ id: 'u-lead', email: 'lead@test.com', name: 'Lead', role: 'user' });

    const team = await service.createTeam(leadCtx, { hackathonId: 'hack-test-1', name: 'Capacity Duo', maxMembers: 2 });
    const inv1 = await service.inviteMember(leadCtx, team.id, { inviteeUserId: 'u-cand1' });
    const inv2 = await service.inviteMember(leadCtx, team.id, { inviteeUserId: 'u-cand2' });

    // Cand1 accepts -> Success, fills team to 2/2
    const cand1Ctx = createRequestContext({ id: 'u-cand1', email: 'c1@test.com', name: 'Cand1', role: 'user' });
    const accepted1 = await service.acceptInvitation(cand1Ctx, inv1.id);
    assert(accepted1.member.membershipStatus === 'active', 'Member 1 active');

    // Cand2 attempts to accept last slot when full -> Must Fail
    const cand2Ctx = createRequestContext({ id: 'u-cand2', email: 'c2@test.com', name: 'Cand2', role: 'user' });
    let fullCapacityFailed = false;
    try {
      await service.acceptInvitation(cand2Ctx, inv2.id);
    } catch (err: any) {
      fullCapacityFailed = true;
      assert(err.message.includes('reached maximum capacity'), 'Capacity error verified');
    }
    assert(fullCapacityFailed, 'Concurrent invitation cannot exceed team capacity');
    passed++;
    console.log('✅ Checkpoint 9: Atomic invitation acceptance & capacity protection passed');
  } catch (err: any) {
    console.error('❌ Checkpoint 9 failed:', err.message);
  }

  // Test 10: Owner Succession on Member Leave
  try {
    const teamRepo = new MockTeamRepository();
    const hackRepo = new MockHackathonRepository();
    const profRepo = new MockProfileRepository();
    const notifRepo = new MockNotificationRepository();

    const hackathon = createTestHackathon('hack-1', 'Hack', 4);
    await hackRepo.save(hackathon);
    await profRepo.save(new ProfileEntity({ id: 'owner-1', role: 'user', fullName: 'Owner 1', discoverableForTeams: true, createdAt: new Date(now), updatedAt: new Date(now) }));
    await profRepo.save(new ProfileEntity({ id: 'member-2', role: 'user', fullName: 'Member 2', discoverableForTeams: true, createdAt: new Date(now), updatedAt: new Date(now) }));

    const service = new TeamCommandService(teamRepo, hackRepo, profRepo, notifRepo);
    const ownerCtx = createRequestContext({ id: 'owner-1', email: 'o1@test.com', name: 'Owner 1', role: 'user' });
    const memberCtx = createRequestContext({ id: 'member-2', email: 'm2@test.com', name: 'Member 2', role: 'user' });

    const team = await service.createTeam(ownerCtx, { hackathonId: 'hack-1', name: 'Succession Team' });
    const inv = await service.inviteMember(ownerCtx, team.id, { inviteeUserId: 'member-2' });
    await service.acceptInvitation(memberCtx, inv.id);

    // Owner leaves -> Ownership transfers to Member 2
    const leaveRes = await service.leaveOrRemoveMember(ownerCtx, team.id, 'owner-1');
    assert(leaveRes.teamArchived === false, 'Team not archived because member remains');
    assert(leaveRes.newOwnerId === 'member-2', 'Member 2 promoted to owner');

    const updatedTeam = await teamRepo.getTeamById(team.id);
    assert(updatedTeam?.ownerUserId === 'member-2', 'Team entity owner updated');

    // Member 2 (now owner) leaves -> Team archives
    const finalLeave = await service.leaveOrRemoveMember(memberCtx, team.id, 'member-2');
    assert(finalLeave.teamArchived === true, 'Empty team safely archived');
    passed++;
    console.log('✅ Checkpoint 10: Owner succession & empty team archiving passed');
  } catch (err: any) {
    console.error('❌ Checkpoint 10 failed:', err.message);
  }

  // Test 11: TeamQueryService Bounded Discovery Search
  try {
    const teamRepo = new MockTeamRepository();
    const hackRepo = new MockHackathonRepository();
    const devRepo = new MockDevProfileRepository();
    const profRepo = new MockProfileRepository();

    const hackathon = createTestHackathon('hack-ai', 'Next Gen AI', 4);
    await hackRepo.save(hackathon);

    const team = new TeamEntity({
      id: 'team-search',
      hackathonId: 'hack-ai',
      ownerUserId: 'lead-user',
      name: 'Search Team',
      description: null,
      status: 'forming',
      visibility: 'private',
      maxMembers: 4,
      createdAt: now,
      updatedAt: now
    });
    await teamRepo.createTeam(team);
    await teamRepo.addMember(new TeamMemberEntity({ id: 'tm-l', teamId: team.id, userId: 'lead-user', role: 'owner', membershipStatus: 'active', joinedAt: now, updatedAt: now }));

    // Set discoverable pool
    teamRepo.discoverableUsers = ['cand-1', 'cand-2', 'lead-user'];
    await profRepo.save(new ProfileEntity({ id: 'cand-1', role: 'user', fullName: 'Candidate One', discoverableForTeams: true, createdAt: new Date(now), updatedAt: new Date(now) }));
    await profRepo.save(new ProfileEntity({ id: 'cand-2', role: 'user', fullName: 'Candidate Two', discoverableForTeams: true, createdAt: new Date(now), updatedAt: new Date(now) }));

    const queryService = new TeamQueryService(teamRepo, hackRepo, devRepo, profRepo);
    const ctx = createRequestContext({ id: 'lead-user', email: 'l@test.com', name: 'Lead', role: 'user' });

    const recs = await queryService.getRecommendedTeammates(ctx, team.id, { limit: 5 });

    assert(recs.candidates.length === 2, 'Caller excluded, only candidates 1 & 2 returned');
    assert(!recs.candidates.some(c => c.userId === 'lead-user'), 'Existing team member excluded from recommendations');
    passed++;
    console.log('✅ Checkpoint 11: Teammate recommendation pipeline & candidate filtering passed');
  } catch (err: any) {
    console.error('❌ Checkpoint 11 failed:', err.message);
  }

  // Test 12: TeamMapper Bijective Mapping
  try {
    const row = {
      id: 'tm-uuid',
      hackathon_id: 'hack-uuid',
      owner_user_id: 'owner-uuid',
      name: 'Map Squad',
      description: 'Mapping test',
      status: 'forming',
      visibility: 'private',
      max_members: 4,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString()
    };

    const entity = TeamMapper.rowToEntity(row);
    assert(entity.id === 'tm-uuid', 'Row to entity mapped');
    const dto = TeamMapper.entityToDTO(entity, 2);
    assert(dto.memberCount === 2, 'Entity to DTO mapped');
    const newRow = TeamMapper.entityToRow(entity);
    assert(newRow.name === 'Map Squad', 'Entity to row mapped');
    passed++;
    console.log('✅ Checkpoint 12: TeamMapper bijective mapping passed');
  } catch (err: any) {
    console.error('❌ Checkpoint 12 failed:', err.message);
  }

  console.log(`\n======================================================`);
  console.log(`🎉 FINDATHON TEAMSPACE RELEASE 1 TEST RESULTS: ${passed}/${total} PASS`);
  console.log(`======================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTeamSpaceTests().catch(err => {
  console.error('Master test run aborted:', err);
  process.exit(1);
});
