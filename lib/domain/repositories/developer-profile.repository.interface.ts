import { DeveloperProfileEntity } from '../entities/developer-profile.entity';
import { DeveloperSkillEvidenceEntity } from '../entities/developer-skill-evidence.entity';

export interface ExternalAccountData {
  id?: string;
  userId: string;
  provider: 'github' | 'leetcode' | 'linkedin';
  providerUserId?: string | null;
  accessTokenEncrypted?: string | null;
  refreshTokenEncrypted?: string | null;
  scopes?: string[];
  connectedAt?: string;
  lastSyncedAt?: string | null;
  status: 'active' | 'revoked' | 'error';
}

export interface IDeveloperProfileRepository {
  getByUserId(userId: string): Promise<DeveloperProfileEntity | null>;
  upsert(profile: DeveloperProfileEntity): Promise<DeveloperProfileEntity>;
  saveEvidence(evidence: DeveloperSkillEvidenceEntity): Promise<DeveloperSkillEvidenceEntity>;
  saveEvidenceBatch(evidenceList: DeveloperSkillEvidenceEntity[]): Promise<DeveloperSkillEvidenceEntity[]>;
  getEvidenceByUserId(userId: string): Promise<DeveloperSkillEvidenceEntity[]>;
  deleteEvidenceBySource(userId: string, source: string): Promise<void>;
  upsertExternalAccount(account: ExternalAccountData): Promise<void>;
  deleteExternalAccount(userId: string, provider: string): Promise<void>;
  getExternalAccount(userId: string, provider: string): Promise<ExternalAccountData | null>;
  getExternalAccounts(userId: string): Promise<ExternalAccountData[]>;
}
