import { IDeveloperProfileRepository } from '../domain/repositories/developer-profile.repository.interface';
import { DeveloperProfileEntity } from '../domain/entities/developer-profile.entity';
import { DeveloperSkillEvidenceEntity } from '../domain/entities/developer-skill-evidence.entity';

export interface DeveloperProfileQueryResult {
  profile: DeveloperProfileEntity;
  evidenceCount: number;
  recentEvidence: DeveloperSkillEvidenceEntity[];
}

export class DeveloperProfileQueryService {
  constructor(private readonly repository: IDeveloperProfileRepository) {}

  /**
   * Retrieves user developer skill profile and summary evidence.
   */
  public async getProfile(userId: string): Promise<DeveloperProfileQueryResult> {
    const profile = await this.repository.getByUserId(userId);
    const evidenceList = await this.repository.getEvidenceByUserId(userId);

    const fallbackProfile = profile || new DeveloperProfileEntity({
      id: crypto.randomUUID(),
      userId,
      topLanguages: {},
      topSkills: {},
      interests: [],
      experienceLevel: null,
      githubConnected: false,
      leetcodeConnected: false,
      linkedinConnected: false,
      lastComputedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    return {
      profile: fallbackProfile,
      evidenceCount: evidenceList.length,
      recentEvidence: evidenceList.slice(0, 10)
    };
  }
}
