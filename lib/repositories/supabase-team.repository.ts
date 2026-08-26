import { ITeamRepository } from '../domain/repositories/team.repository.interface';
import { TeamEntity, TeamMemberEntity, TeamInvitationEntity } from '../domain/entities/team.entity';
import { TeamMapper } from '../domain/mappers/team.mapper';
import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { DatabaseError } from '../errors';

export class SupabaseTeamRepository implements ITeamRepository {
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

  public async createTeam(team: TeamEntity): Promise<TeamEntity> {
    try {
      const client = await this.getClient();
      const payload = TeamMapper.entityToRow(team);

      const { data, error } = await client
        .from('teams')
        .insert([payload])
        .select('*')
        .single();

      if (error || !data) {
        console.error('[TeamRepository.createTeam] Supabase error:', error);
        throw new DatabaseError(error?.message || 'Failed to create team');
      }

      return TeamMapper.rowToEntity(data);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to create team');
    }
  }

  public async getTeamById(id: string): Promise<TeamEntity | null> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('teams')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[TeamRepository.getTeamById] Supabase error:', error);
        throw new DatabaseError(error.message);
      }
      if (!data) return null;

      return TeamMapper.rowToEntity(data);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch team');
    }
  }

  public async getTeamsByHackathon(hackathonId: string): Promise<TeamEntity[]> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('teams')
        .select('*')
        .eq('hackathon_id', hackathonId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[TeamRepository.getTeamsByHackathon] Supabase error:', error);
        throw new DatabaseError(error.message);
      }

      return (data || []).map(TeamMapper.rowToEntity);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch hackathon teams');
    }
  }

  public async getTeamsByUserId(userId: string): Promise<TeamEntity[]> {
    try {
      const client = await this.getClient();
      // Join via team_members
      const { data: memberRows, error: memberError } = await client
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .eq('membership_status', 'active');

      if (memberError) {
        console.error('[TeamRepository.getTeamsByUserId] Supabase error:', memberError);
        throw new DatabaseError(memberError.message);
      }

      const teamIds = (memberRows || []).map(r => r.team_id);
      if (teamIds.length === 0) return [];

      const { data: teams, error: teamsError } = await client
        .from('teams')
        .select('*')
        .in('id', teamIds)
        .order('updated_at', { ascending: false });

      if (teamsError) {
        console.error('[TeamRepository.getTeamsByUserId] Supabase error:', teamsError);
        throw new DatabaseError(teamsError.message);
      }

      return (teams || []).map(TeamMapper.rowToEntity);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch user teams');
    }
  }

  public async getActiveTeamForUserAndHackathon(userId: string, hackathonId: string): Promise<TeamEntity | null> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('team_members')
        .select('team_id, teams!inner(*)')
        .eq('user_id', userId)
        .eq('membership_status', 'active')
        .eq('teams.hackathon_id', hackathonId)
        .in('teams.status', ['forming', 'active', 'locked', 'submitted'])
        .maybeSingle();

      if (error) {
        console.error('[TeamRepository.getActiveTeamForUserAndHackathon] Supabase error:', error);
        throw new DatabaseError(error.message);
      }
      if (!data || !data.teams) return null;

      const rawTeam = Array.isArray(data.teams) ? data.teams[0] : data.teams;
      if (!rawTeam) return null;

      return TeamMapper.rowToEntity(rawTeam as unknown as Record<string, unknown>);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to check active team membership');
    }
  }

  public async updateTeam(team: TeamEntity): Promise<TeamEntity> {
    try {
      const client = await this.getClient();
      const payload = TeamMapper.entityToRow(team);

      const { data, error } = await client
        .from('teams')
        .update(payload)
        .eq('id', team.id)
        .select('*')
        .single();

      if (error || !data) {
        console.error('[TeamRepository.updateTeam] Supabase error:', error);
        throw new DatabaseError(error?.message || 'Failed to update team');
      }

      return TeamMapper.rowToEntity(data);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to update team');
    }
  }

  public async deleteTeam(id: string): Promise<void> {
    try {
      const client = await this.getClient();
      const { error } = await client
        .from('teams')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[TeamRepository.deleteTeam] Supabase error:', error);
        throw new DatabaseError(error.message);
      }
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to delete team');
    }
  }

  public async getMembersByTeamId(teamId: string): Promise<TeamMemberEntity[]> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('[TeamRepository.getMembersByTeamId] Supabase error:', error);
        throw new DatabaseError(error.message);
      }

      return (data || []).map(TeamMapper.memberRowToEntity);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch team members');
    }
  }

  public async getMember(teamId: string, userId: string): Promise<TeamMemberEntity | null> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[TeamRepository.getMember] Supabase error:', error);
        throw new DatabaseError(error.message);
      }
      if (!data) return null;

      return TeamMapper.memberRowToEntity(data);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch member');
    }
  }

  public async addMember(member: TeamMemberEntity): Promise<TeamMemberEntity> {
    try {
      const client = await this.getClient();
      const payload = TeamMapper.memberEntityToRow(member);

      const { data, error } = await client
        .from('team_members')
        .insert([payload])
        .select('*')
        .single();

      if (error || !data) {
        console.error('[TeamRepository.addMember] Supabase error:', error);
        throw new DatabaseError(error?.message || 'Failed to add member');
      }

      return TeamMapper.memberRowToEntity(data);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to add team member');
    }
  }

  public async updateMember(member: TeamMemberEntity): Promise<TeamMemberEntity> {
    try {
      const client = await this.getClient();
      const payload = TeamMapper.memberEntityToRow(member);

      const { data, error } = await client
        .from('team_members')
        .update(payload)
        .eq('id', member.id)
        .select('*')
        .single();

      if (error || !data) {
        console.error('[TeamRepository.updateMember] Supabase error:', error);
        throw new DatabaseError(error?.message || 'Failed to update member');
      }

      return TeamMapper.memberRowToEntity(data);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to update member');
    }
  }

  public async removeMember(teamId: string, userId: string): Promise<void> {
    try {
      const client = await this.getClient();
      const { error } = await client
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) {
        console.error('[TeamRepository.removeMember] Supabase error:', error);
        throw new DatabaseError(error.message);
      }
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to remove member');
    }
  }

  public async createInvitation(invitation: TeamInvitationEntity): Promise<TeamInvitationEntity> {
    try {
      const client = await this.getClient();
      const payload = TeamMapper.invitationEntityToRow(invitation);

      const { data, error } = await client
        .from('team_invitations')
        .insert([payload])
        .select('*')
        .single();

      if (error || !data) {
        console.error('[TeamRepository.createInvitation] Supabase error:', error);
        throw new DatabaseError(error?.message || 'Failed to create invitation');
      }

      return TeamMapper.invitationRowToEntity(data);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to create invitation');
    }
  }

  public async getInvitationById(id: string): Promise<TeamInvitationEntity | null> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('team_invitations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[TeamRepository.getInvitationById] Supabase error:', error);
        throw new DatabaseError(error.message);
      }
      if (!data) return null;

      return TeamMapper.invitationRowToEntity(data);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch invitation');
    }
  }

  public async getPendingInvitation(teamId: string, inviteeUserId: string): Promise<TeamInvitationEntity | null> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('team_invitations')
        .select('*')
        .eq('team_id', teamId)
        .eq('invitee_user_id', inviteeUserId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) {
        console.error('[TeamRepository.getPendingInvitation] Supabase error:', error);
        throw new DatabaseError(error.message);
      }
      if (!data) return null;

      return TeamMapper.invitationRowToEntity(data);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch pending invitation');
    }
  }

  public async getInvitationsByTeamId(teamId: string): Promise<TeamInvitationEntity[]> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('team_invitations')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[TeamRepository.getInvitationsByTeamId] Supabase error:', error);
        throw new DatabaseError(error.message);
      }

      return (data || []).map(TeamMapper.invitationRowToEntity);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch team invitations');
    }
  }

  public async getInvitationsByInvitee(inviteeUserId: string): Promise<TeamInvitationEntity[]> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('team_invitations')
        .select('*')
        .eq('invitee_user_id', inviteeUserId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[TeamRepository.getInvitationsByInvitee] Supabase error:', error);
        throw new DatabaseError(error.message);
      }

      return (data || []).map(TeamMapper.invitationRowToEntity);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch user invitations');
    }
  }

  public async updateInvitation(invitation: TeamInvitationEntity): Promise<TeamInvitationEntity> {
    try {
      const client = await this.getClient();
      const payload = TeamMapper.invitationEntityToRow(invitation);

      const { data, error } = await client
        .from('team_invitations')
        .update(payload)
        .eq('id', invitation.id)
        .select('*')
        .single();

      if (error || !data) {
        console.error('[TeamRepository.updateInvitation] Supabase error:', error);
        throw new DatabaseError(error?.message || 'Failed to update invitation');
      }

      return TeamMapper.invitationRowToEntity(data);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to update invitation');
    }
  }

  public async getDiscoverableUserIds(limit = 50, offset = 0, excludedUserIds: string[] = []): Promise<string[]> {
    try {
      const client = await this.getClient();
      let query = client
        .from('profiles')
        .select('id')
        .eq('discoverable_for_teams', true);

      if (excludedUserIds && excludedUserIds.length > 0) {
        query = query.filter('id', 'not.in', `(${excludedUserIds.join(',')})`);
      }

      const { data, error } = await query.range(offset, offset + limit - 1);

      if (error) {
        console.error('[TeamRepository.getDiscoverableUserIds] Supabase error:', error);
        return [];
      }

      return (data || []).map(r => String(r.id));
    } catch {
      return [];
    }
  }

  public async transferOwnership(teamId: string, currentOwnerId: string, newOwnerId: string): Promise<TeamEntity> {
    try {
      const client = await this.getClient();

      // Execute atomic RPC if available, else transactional sequence
      const { data: rpcData, error: rpcError } = await client.rpc('transfer_team_ownership', {
        p_team_id: teamId,
        p_new_owner_user_id: newOwnerId
      });

      if (!rpcError && rpcData) {
        const team = await this.getTeamById(teamId);
        if (!team) throw new DatabaseError('Team not found after ownership transfer');
        return team;
      }

      // Fallback updates
      const { error: teamError } = await client
        .from('teams')
        .update({ owner_user_id: newOwnerId, updated_at: new Date().toISOString() })
        .eq('id', teamId)
        .eq('owner_user_id', currentOwnerId);

      if (teamError) {
        console.error('[TeamRepository.transferOwnership] teams error:', teamError);
        throw new DatabaseError(teamError.message);
      }

      await client
        .from('team_members')
        .update({ role: 'member', updated_at: new Date().toISOString() })
        .eq('team_id', teamId)
        .eq('user_id', currentOwnerId);

      await client
        .from('team_members')
        .update({ role: 'owner', updated_at: new Date().toISOString() })
        .eq('team_id', teamId)
        .eq('user_id', newOwnerId);

      const updatedTeam = await this.getTeamById(teamId);
      if (!updatedTeam) throw new DatabaseError('Failed to fetch updated team');
      return updatedTeam;
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to transfer team ownership');
    }
  }

  public async leaveTeamWithSuccession(teamId: string, userId: string): Promise<{ team: TeamEntity; action: string; newOwnerId?: string }> {
    try {
      const client = await this.getClient();

      // Execute atomic RPC if available
      const { data: rpcData, error: rpcError } = await client.rpc('leave_team_with_succession', {
        p_team_id: teamId
      });

      if (!rpcError && rpcData) {
        const team = await this.getTeamById(teamId);
        if (!team) throw new DatabaseError('Team not found after leave');
        return {
          team,
          action: rpcData.action || 'left',
          newOwnerId: rpcData.new_owner_id
        };
      }

      // Fallback application-layer succession
      const team = await this.getTeamById(teamId);
      if (!team) throw new DatabaseError('Team not found');

      const members = await this.getMembersByTeamId(teamId);
      const activeMembers = members.filter(m => m.isActive());

      if (team.ownerUserId !== userId) {
        // Regular non-owner leave
        await client
          .from('team_members')
          .update({ membership_status: 'left', updated_at: new Date().toISOString() })
          .eq('team_id', teamId)
          .eq('user_id', userId);

        const updated = await this.getTeamById(teamId);
        return { team: updated || team, action: 'left' };
      }

      // Owner is leaving
      const remainingActive = activeMembers.filter(m => m.userId !== userId);
      if (remainingActive.length === 0) {
        // No remaining active members -> archive team
        await client
          .from('team_members')
          .update({ membership_status: 'left', updated_at: new Date().toISOString() })
          .eq('team_id', teamId)
          .eq('user_id', userId);

        await client
          .from('teams')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('id', teamId);

        const updated = await this.getTeamById(teamId);
        return { team: updated || team, action: 'left_and_archived' };
      }

      // Deterministic succession: lead first, otherwise earliest joined active member
      const successor = remainingActive.find(m => m.role === 'lead') ||
        remainingActive.sort((a, b) => a.joinedAt - b.joinedAt)[0];

      await client
        .from('teams')
        .update({ owner_user_id: successor.userId, updated_at: new Date().toISOString() })
        .eq('id', teamId);

      await client
        .from('team_members')
        .update({ role: 'owner', updated_at: new Date().toISOString() })
        .eq('team_id', teamId)
        .eq('user_id', successor.userId);

      await client
        .from('team_members')
        .update({ membership_status: 'left', updated_at: new Date().toISOString() })
        .eq('team_id', teamId)
        .eq('user_id', userId);

      const updated = await this.getTeamById(teamId);
      return {
        team: updated || team,
        action: 'left_with_succession',
        newOwnerId: successor.userId
      };
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to leave team');
    }
  }
}
