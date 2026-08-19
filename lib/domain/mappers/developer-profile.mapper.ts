import { DeveloperProfileEntity, ExperienceLevel } from '../entities/developer-profile.entity';
import { DeveloperSkillEvidenceEntity, SkillEvidenceSource, SkillEvidenceType } from '../entities/developer-skill-evidence.entity';
import { ExternalAccountData } from '../repositories/developer-profile.repository.interface';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates whether a string is a standard 36-character RFC 4122 UUID.
 */
export function isValidUUID(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id.trim());
}

export interface DeveloperProfileDatabaseRow {
  id: string;
  user_id: string;
  top_languages: Record<string, number>;
  top_skills: Record<string, number>;
  interests: string[];
  experience_level: string | null;
  github_connected: boolean;
  leetcode_connected: boolean;
  linkedin_connected: boolean;
  last_computed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeveloperSkillEvidenceDatabaseRow {
  id: string;
  user_id: string;
  source: string;
  evidence_type: string;
  external_id: string | null;
  url: string | null;
  signals: Record<string, unknown>;
  weight: number | string;
  created_at: string;
  updated_at: string;
}

export interface DeveloperExternalAccountDatabaseRow {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  scopes: string[] | null;
  connected_at: string;
  last_synced_at: string | null;
  status: string;
}

export interface DeveloperProfileDTO {
  id: string;
  userId: string;
  topLanguages: Record<string, number>;
  topSkills: Record<string, number>;
  interests: string[];
  experienceLevel: ExperienceLevel | null;
  githubConnected: boolean;
  leetcodeConnected: boolean;
  linkedinConnected: boolean;
  lastComputedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export class DeveloperProfileMapper {
  public static rowToEntity(row: DeveloperProfileDatabaseRow): DeveloperProfileEntity {
    return new DeveloperProfileEntity({
      id: row.id,
      userId: row.user_id,
      topLanguages: row.top_languages || {},
      topSkills: row.top_skills || {},
      interests: row.interests || [],
      experienceLevel: (row.experience_level as ExperienceLevel) || null,
      githubConnected: Boolean(row.github_connected),
      leetcodeConnected: Boolean(row.leetcode_connected),
      linkedinConnected: Boolean(row.linkedin_connected),
      lastComputedAt: row.last_computed_at ? new Date(row.last_computed_at).getTime() : null,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
    });
  }

  public static entityToRow(entity: DeveloperProfileEntity): Record<string, unknown> {
    const row: Record<string, unknown> = {
      user_id: entity.userId,
      top_languages: entity.topLanguages,
      top_skills: entity.topSkills,
      interests: entity.interests,
      experience_level: entity.experienceLevel,
      github_connected: entity.githubConnected,
      leetcode_connected: entity.leetcodeConnected,
      linkedin_connected: entity.linkedinConnected,
      last_computed_at: entity.lastComputedAt ? new Date(entity.lastComputedAt).toISOString() : null,
      updated_at: new Date().toISOString()
    };

    // Only assign id if it is a valid database UUID; otherwise let PostgreSQL auto-generate gen_random_uuid()
    if (isValidUUID(entity.id)) {
      row.id = entity.id;
    }

    return row;
  }

  public static entityToDTO(entity: DeveloperProfileEntity): DeveloperProfileDTO {
    return entity.toProps();
  }

  public static evidenceRowToEntity(row: DeveloperSkillEvidenceDatabaseRow): DeveloperSkillEvidenceEntity {
    return new DeveloperSkillEvidenceEntity({
      id: row.id,
      userId: row.user_id,
      source: row.source as SkillEvidenceSource,
      evidenceType: row.evidence_type as SkillEvidenceType,
      externalId: row.external_id || null,
      url: row.url || null,
      signals: row.signals || {},
      weight: Number(row.weight || 1),
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
    });
  }

  public static evidenceEntityToRow(entity: DeveloperSkillEvidenceEntity): Record<string, unknown> {
    const row: Record<string, unknown> = {
      user_id: entity.userId,
      source: entity.source,
      evidence_type: entity.evidenceType,
      external_id: entity.externalId,
      url: entity.url,
      signals: entity.signals,
      weight: entity.weight,
      updated_at: new Date().toISOString()
    };

    // Only assign id if it is a valid database UUID; otherwise let PostgreSQL auto-generate gen_random_uuid()
    if (isValidUUID(entity.id)) {
      row.id = entity.id;
    }

    return row;
  }

  public static accountRowToData(row: DeveloperExternalAccountDatabaseRow): ExternalAccountData {
    return {
      id: row.id,
      userId: row.user_id,
      provider: row.provider as 'github' | 'leetcode' | 'linkedin',
      providerUserId: row.provider_user_id || null,
      accessTokenEncrypted: row.access_token_encrypted || null,
      refreshTokenEncrypted: row.refresh_token_encrypted || null,
      scopes: row.scopes || [],
      connectedAt: row.connected_at,
      lastSyncedAt: row.last_synced_at || null,
      status: (row.status as 'active' | 'revoked' | 'error') || 'active'
    };
  }

  public static accountDataToRow(account: ExternalAccountData): Record<string, unknown> {
    const row: Record<string, unknown> = {
      user_id: account.userId,
      provider: account.provider,
      provider_user_id: account.providerUserId || null,
      access_token_encrypted: account.accessTokenEncrypted || null,
      refresh_token_encrypted: account.refreshTokenEncrypted || null,
      scopes: account.scopes || [],
      status: account.status || 'active'
    };

    // Only assign id if it is a valid database UUID; otherwise let PostgreSQL auto-generate gen_random_uuid()
    if (account.id && isValidUUID(account.id)) {
      row.id = account.id;
    }
    if (account.connectedAt) {
      row.connected_at = account.connectedAt;
    }
    if (account.lastSyncedAt !== undefined) {
      row.last_synced_at = account.lastSyncedAt;
    }

    return row;
  }
}
