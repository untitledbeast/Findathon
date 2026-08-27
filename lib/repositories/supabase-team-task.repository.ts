import { ITeamTaskRepository } from '../domain/repositories/team-task.repository.interface';
import { TeamTaskEntity } from '../domain/entities/team-task.entity';
import { TeamTaskMapper, TeamTaskDatabaseRow } from '../domain/mappers/team-task.mapper';
import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { DatabaseError } from '../errors';

export class SupabaseTeamTaskRepository implements ITeamTaskRepository {
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

  public async findById(id: string): Promise<TeamTaskEntity | null> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('team_tasks')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[TeamTaskRepository.findById] error:', error);
        throw new DatabaseError(error.message);
      }

      if (!data) return null;
      return TeamTaskMapper.rowToEntity(data as TeamTaskDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch team task');
    }
  }

  public async findByTeamId(teamId: string, includeArchived = false): Promise<TeamTaskEntity[]> {
    try {
      const client = await this.getClient();
      let query = client
        .from('team_tasks')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (!includeArchived) {
        query = query.is('archived_at', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[TeamTaskRepository.findByTeamId] error:', error);
        throw new DatabaseError(error.message);
      }

      return (data || []).map((row: TeamTaskDatabaseRow) => TeamTaskMapper.rowToEntity(row));
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to list team tasks');
    }
  }

  public async findByProjectId(projectId: string, includeArchived = false): Promise<TeamTaskEntity[]> {
    try {
      const client = await this.getClient();
      let query = client
        .from('team_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (!includeArchived) {
        query = query.is('archived_at', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[TeamTaskRepository.findByProjectId] error:', error);
        throw new DatabaseError(error.message);
      }

      return (data || []).map((row: TeamTaskDatabaseRow) => TeamTaskMapper.rowToEntity(row));
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to list team project tasks');
    }
  }

  public async create(task: TeamTaskEntity): Promise<TeamTaskEntity> {
    try {
      const client = await this.getClient();
      const payload = TeamTaskMapper.entityToRow(task);

      const { data, error } = await client
        .from('team_tasks')
        .insert([payload])
        .select('*')
        .single();

      if (error || !data) {
        console.error('[TeamTaskRepository.create] error:', error);
        throw new DatabaseError(error?.message || 'Failed to create team task');
      }

      return TeamTaskMapper.rowToEntity(data as TeamTaskDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to create team task');
    }
  }

  public async update(task: TeamTaskEntity): Promise<TeamTaskEntity> {
    try {
      const client = await this.getClient();
      const payload = TeamTaskMapper.entityToRow(task);

      const { data, error } = await client
        .from('team_tasks')
        .update({
          title: payload.title,
          description: payload.description,
          status: payload.status,
          priority: payload.priority,
          assigned_to: payload.assigned_to,
          due_at: payload.due_at,
          completed_at: payload.completed_at,
          updated_at: new Date().toISOString(),
          archived_at: payload.archived_at
        })
        .eq('id', task.id)
        .select('*')
        .single();

      if (error || !data) {
        console.error('[TeamTaskRepository.update] error:', error);
        throw new DatabaseError(error?.message || 'Failed to update team task');
      }

      return TeamTaskMapper.rowToEntity(data as TeamTaskDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to update team task');
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const client = await this.getClient();
      const { error } = await client
        .from('team_tasks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[TeamTaskRepository.delete] error:', error);
        throw new DatabaseError(error.message);
      }
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to delete team task');
    }
  }

  public async archive(id: string): Promise<void> {
    try {
      const client = await this.getClient();
      const { error } = await client
        .from('team_tasks')
        .update({
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('[TeamTaskRepository.archive] error:', error);
        throw new DatabaseError(error.message);
      }
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to archive team task');
    }
  }
}
