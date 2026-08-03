import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();

    // 1. Fetch allowlist
    const { data: allowlist } = await supabase
      .from('admin_allowlist')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Fetch admin profiles
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, created_at, updated_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });

    // 3. Fetch audit logs
    const { data: auditLogs } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      success: true,
      data: {
        allowlist: allowlist || [],
        adminProfiles: adminProfiles || [],
        auditLogs: auditLogs || []
      }
    });
  } catch (err: any) {
    console.error('[Admin Allowlist GET] error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const rawEmail = body.email;
    if (!rawEmail || typeof rawEmail !== 'string' || !rawEmail.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email address is required' }, { status: 400 });
    }

    const email = rawEmail.trim().toLowerCase();
    const supabase = await createSupabaseServerClient();

    // 1. Insert into admin_allowlist
    const { error: insertErr } = await supabase
      .from('admin_allowlist')
      .upsert({ email, added_by: user.id }, { onConflict: 'email' });

    if (insertErr) {
      console.error('[Admin Allowlist POST] insert error:', insertErr.message);
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
    }

    // 2. Check if profiles match this email and promote if found
    const { data: matchingProfiles } = await supabase
      .from('profiles')
      .select('id, role');

    if (matchingProfiles && matchingProfiles.length > 0) {
      for (const p of matchingProfiles) {
        const { data: authUser } = await supabase.auth.admin.getUserById(p.id).catch(() => ({ data: null }));
        if (authUser?.user?.email?.toLowerCase() === email) {
          await supabase.from('profiles').update({ role: 'admin' }).eq('id', p.id);
        }
      }
    }

    // 3. Record Audit Log
    try {
      await supabase.from('admin_audit_logs').insert({
        performed_by: user.id,
        action: 'allowlist_add',
        target_email: email,
        details: { requester_id: user.id, requester_email: user.email }
      });
    } catch (auditErr) {
      console.warn('[Admin Allowlist POST] audit log error:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${email} to admin allowlist`
    });
  } catch (err: any) {
    console.error('[Admin Allowlist POST] exception:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const rawEmail = body.email;
    if (!rawEmail || typeof rawEmail !== 'string') {
      return NextResponse.json({ success: false, error: 'Email parameter required' }, { status: 400 });
    }

    const email = rawEmail.trim().toLowerCase();
    const supabase = await createSupabaseServerClient();

    // 1. Delete from admin_allowlist
    const { error: delErr } = await supabase
      .from('admin_allowlist')
      .delete()
      .eq('email', email);

    if (delErr) {
      console.error('[Admin Allowlist DELETE] delete error:', delErr.message);
      return NextResponse.json({ success: false, error: delErr.message }, { status: 500 });
    }

    // 2. Record Audit Log
    try {
      await supabase.from('admin_audit_logs').insert({
        performed_by: user.id,
        action: 'allowlist_remove',
        target_email: email,
        details: { requester_id: user.id, requester_email: user.email }
      });
    } catch (auditErr) {
      console.warn('[Admin Allowlist DELETE] audit log error:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${email} from allowlist`
    });
  } catch (err: any) {
    console.error('[Admin Allowlist DELETE] exception:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
