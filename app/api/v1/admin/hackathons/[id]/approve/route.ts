import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError, PermissionError } from '@/lib/errors';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: hackathonId } = await context.params;
    const user = await AuthService.getUser();
    if (!user) return formatError(new AuthenticationError('Authentication required'));
    
    if (!['admin', 'moderator'].includes(user.role)) {
      return formatError(new PermissionError('Admin or moderator access required'));
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await adminSupabase
      .from('hackathons')
      .update({ 
        status: 'approved', 
        updated_at: new Date().toISOString(),
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null
      })
      .eq('id', hackathonId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: error.message, code: 'UPDATE_FAILED', statusCode: 500 } }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return formatError(error as Error);
  }
}
