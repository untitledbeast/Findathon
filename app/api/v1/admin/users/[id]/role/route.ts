import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await AuthService.getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { role } = body;

    if (!role || !['user', 'organizer', 'moderator', 'admin'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid role specified' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Fetch target user's profile and email
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', id)
      .maybeSingle();

    if (!targetProfile) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 });
    }

    // REQUIREMENT 4: Prevent self-lockout unless at least 1 other admin exists
    if (id === user.id && role !== 'admin') {
      const { count, error: countErr } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .neq('id', user.id);

      if (countErr || !count || count < 1) {
        return NextResponse.json({
          success: false,
          error: 'Cannot remove your own admin role as you are the last remaining admin on the platform.'
        }, { status: 400 });
      }
    }

    // Update target profile role
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateErr) {
      console.error('[Admin Role PATCH] update error:', updateErr.message);
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    // Insert audit log
    try {
      const action = role === 'admin' ? 'role_grant_admin' : 'role_revoke_admin';
      await supabase.from('admin_audit_logs').insert({
        performed_by: user.id,
        action,
        target_user_id: id,
        details: {
          previous_role: targetProfile.role,
          new_role: role,
          target_name: targetProfile.full_name,
          requester_id: user.id
        }
      });
    } catch (auditErr) {
      console.warn('[Admin Role PATCH] audit log error:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `User role updated to '${role}' successfully`
    });
  } catch (err: any) {
    console.error('[Admin Role PATCH] exception:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
