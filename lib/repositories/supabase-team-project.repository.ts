import { ITeamProjectRepository } from '../domain/repositories/team-project.repository.interface';
import { TeamProjectEntity } from '../domain/entities/team-project.entity';
import { TeamProjectMapper, TeamProjectDatabaseRow } from '../domain/mappers/team-project.mapper';
import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { DatabaseError } from '../errors';

export class SupabaseTeamProjectRepository implements ITeamProjectRepository {
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

  public async findByTeamId(teamId: string): Promise<TeamProjectEntity | null> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('team_projects')
        .select('*')
        .eq('team_id', teamId)
        .maybeSingle();

      if (error) {
        console.error('[TeamProjectRepository.findByTeamId] error:', error);
        throw new DatabaseError(error.message);
      }

      if (!data) return null;
      return TeamProjectMapper.rowToEntity(data as TeamProjectDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch team project');
    }
  }

  public async create(project: TeamProjectEntity): Promise<TeamProjectEntity> {
    try {
      const client = await this.getClient();
      const payload = TeamProjectMapper.entityToRow(project);

      const { data, error } = await client
        .from('team_projects')
        .insert([payload])
        .select('*')
        .single();

      if (error || !data) {
        console.error('[TeamProjectRepository.create] error:', error);
        throw new DatabaseError(error?.message || 'Failed to create team project');
      }

      return TeamProjectMapper.rowToEntity(data as TeamProjectDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to create team project');
    }
  }

  public async update(project: TeamProjectEntity): Promise<TeamProjectEntity> {
    try {
      const client = await this.getClient();
      const payload = TeamProjectMapper.entityToRow(project);

      const { data, error } = await client
        .from('team_projects')
        .update({
          title: payload.title,
          problem_statement: payload.problem_statement,
          solution_approach: payload.solution_approach,
          tech_stack: payload.tech_stack,
          repository_url: payload.repository_url,
          demo_url: payload.demo_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id)
        .select('*')
        .single();

      if (error || !data) {
        console.error('[TeamProjectRepository.update] error:', error);
        throw new DatabaseError(error?.message || 'Failed to update team project');
      }

      return TeamProjectMapper.rowToEntity(data as TeamProjectDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to update team project');
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const client = await this.getClient();
      const { error } = await client
        .from('team_projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[TeamProjectRepository.delete] error:', error);
        throw new DatabaseError(error.message);
      }
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to delete team project');
    }
  }
}
