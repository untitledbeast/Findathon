import { IDeveloperProfileRepository, ExternalAccountData } from '../domain/repositories/developer-profile.repository.interface';
import { DeveloperProfileEntity } from '../domain/entities/developer-profile.entity';
import { DeveloperSkillEvidenceEntity } from '../domain/entities/developer-skill-evidence.entity';
import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  DeveloperProfileMapper,
  DeveloperProfileDatabaseRow,
  DeveloperSkillEvidenceDatabaseRow,
  DeveloperExternalAccountDatabaseRow
} from '../domain/mappers/developer-profile.mapper';
import { DatabaseError } from '../errors';

export class SupabaseDeveloperProfileRepository implements IDeveloperProfileRepository {
  private async getClient() {
    if (typeof window === 'undefined') {
      try {
        return await createSupabaseServerClient();
      } catch {
        return supabase;
      }
    }
    return supabase;
  }

  public async getByUserId(userId: string): Promise<DeveloperProfileEntity | null> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('developer_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[DeveloperProfileRepository.getByUserId] Supabase error:', error);
        throw new DatabaseError(error.message);
      }
      if (!data) return null;

      return DeveloperProfileMapper.rowToEntity(data as unknown as DeveloperProfileDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch developer profile');
    }
  }

  public async upsert(profile: DeveloperProfileEntity): Promise<DeveloperProfileEntity> {
    try {
      const client = await this.getClient();
      const payload = DeveloperProfileMapper.entityToRow(profile);

      const { data, error } = await client
        .from('developer_profiles')
        .upsert([payload], { onConflict: 'user_id' })
        .select('*')
        .single();

      if (error || !data) {
        console.error('[DeveloperProfileRepository.upsert] Supabase error:', error);
        throw new DatabaseError(error?.message || 'Failed to upsert developer profile');
      }

      return DeveloperProfileMapper.rowToEntity(data as unknown as DeveloperProfileDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to save developer profile');
    }
  }

  public async saveEvidence(evidence: DeveloperSkillEvidenceEntity): Promise<DeveloperSkillEvidenceEntity> {
    try {
      const client = await this.getClient();
      const payload = DeveloperProfileMapper.evidenceEntityToRow(evidence);

      const { data, error } = await client
        .from('developer_skill_evidence')
        .upsert([payload], { onConflict: 'user_id,source,evidence_type,external_id' })
        .select('*')
        .single();

      if (error || !data) {
        console.error('[DeveloperProfileRepository.saveEvidence] Supabase error:', error);
        throw new DatabaseError(error?.message || 'Failed to save skill evidence');
      }

      return DeveloperProfileMapper.evidenceRowToEntity(data as unknown as DeveloperSkillEvidenceDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to record skill evidence');
    }
  }

  public async saveEvidenceBatch(evidenceList: DeveloperSkillEvidenceEntity[]): Promise<DeveloperSkillEvidenceEntity[]> {
    if (evidenceList.length === 0) return [];
    try {
      const client = await this.getClient();
      const payloads = evidenceList.map(e => DeveloperProfileMapper.evidenceEntityToRow(e));

      const { data, error } = await client
        .from('developer_skill_evidence')
        .upsert(payloads, { onConflict: 'user_id,source,evidence_type,external_id' })
        .select('*');

      if (error || !data) {
        console.error('[DeveloperProfileRepository.saveEvidenceBatch] Supabase error:', error);
        throw new DatabaseError(error?.message || 'Failed to batch save skill evidence');
      }

      return (data as unknown as DeveloperSkillEvidenceDatabaseRow[]).map(row =>
        DeveloperProfileMapper.evidenceRowToEntity(row)
      );
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to record skill evidence batch');
    }
  }

  public async getEvidenceByUserId(userId: string): Promise<DeveloperSkillEvidenceEntity[]> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('developer_skill_evidence')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[DeveloperProfileRepository.getEvidenceByUserId] Supabase error:', error);
        throw new DatabaseError(error.message);
      }
      if (!data) return [];

      return (data as unknown as DeveloperSkillEvidenceDatabaseRow[]).map(row =>
        DeveloperProfileMapper.evidenceRowToEntity(row)
      );
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to load skill evidence');
    }
  }

  public async deleteEvidenceBySource(userId: string, source: string): Promise<void> {
    try {
      const client = await this.getClient();
      const { error } = await client
        .from('developer_skill_evidence')
        .delete()
        .eq('user_id', userId)
        .eq('source', source);

      if (error) {
        console.error('[DeveloperProfileRepository.deleteEvidenceBySource] Supabase error:', error);
        throw new DatabaseError(error.message);
      }
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to delete skill evidence for source');
    }
  }

  public async upsertExternalAccount(account: ExternalAccountData): Promise<void> {
    try {
      const client = await this.getClient();
      const payload = DeveloperProfileMapper.accountDataToRow(account);

      const { error } = await client
        .from('developer_external_accounts')
        .upsert([payload], { onConflict: 'user_id,provider' });

      if (error) {
        console.error('[DeveloperProfileRepository.upsertExternalAccount] Supabase error:', error);
        throw new DatabaseError(error.message);
      }
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to connect external account');
    }
  }

  public async deleteExternalAccount(userId: string, provider: string): Promise<void> {
    try {
      const client = await this.getClient();
      const { error } = await client
        .from('developer_external_accounts')
        .delete()
        .eq('user_id', userId)
        .eq('provider', provider);

      if (error) {
        console.error('[DeveloperProfileRepository.deleteExternalAccount] Supabase error:', error);
        throw new DatabaseError(error.message);
      }
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to disconnect external account');
    }
  }

  public async getExternalAccount(userId: string, provider: string): Promise<ExternalAccountData | null> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('developer_external_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider)
        .maybeSingle();

      if (error) {
        console.error('[DeveloperProfileRepository.getExternalAccount] Supabase error:', error);
        throw new DatabaseError(error.message);
      }
      if (!data) return null;

      return DeveloperProfileMapper.accountRowToData(data as unknown as DeveloperExternalAccountDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to retrieve external account');
    }
  }

  public async getExternalAccounts(userId: string): Promise<ExternalAccountData[]> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('developer_external_accounts')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('[DeveloperProfileRepository.getExternalAccounts] Supabase error:', error);
        throw new DatabaseError(error.message);
      }
      if (!data) return [];

      return (data as unknown as DeveloperExternalAccountDatabaseRow[]).map(row =>
        DeveloperProfileMapper.accountRowToData(row)
      );
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to retrieve external accounts');
    }
  }

  public async findByProviderUserId(provider: 'github' | 'leetcode' | 'linkedin', providerUserId: string): Promise<ExternalAccountData | null> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('developer_external_accounts')
        .select('*')
        .eq('provider', provider)
        .eq('provider_user_id', providerUserId)
        .maybeSingle();

      if (error) {
        console.error('[DeveloperProfileRepository.findByProviderUserId] Supabase error:', error);
        throw new DatabaseError(error.message);
      }
      if (!data) return null;

      return DeveloperProfileMapper.accountRowToData(data as unknown as DeveloperExternalAccountDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to query external account by provider user ID');
    }
  }
}
