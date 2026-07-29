import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { BaseError } from '@/lib/errors';
import { AuthService } from '@/lib/auth/auth.service';

export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.requireAuth();

    // Use admin client to bypass RLS for deletion tasks and to delete the auth user
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false }
      }
    );

    // 1. Delete from saved_hackathons
    await adminClient.from('saved_hackathons').delete().eq('user_id', user.id);

    // 2. Delete from notifications
    await adminClient.from('notifications').delete().eq('user_id', user.id);

    // 3. Delete from reviews
    await adminClient.from('reviews').delete().eq('user_id', user.id);

    // 4. Reject pending submissions
    await adminClient
      .from('hackathons')
      .update({ status: 'rejected', rejection_reason: 'User account deleted' })
      .eq('submitted_by', user.id)
      .eq('status', 'pending');

    // 5. Delete profile
    await adminClient.from('profiles').delete().eq('id', user.id);

    // 6. Delete auth user
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);
    
    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      throw new BaseError('Failed to delete auth account', 'DELETE_ERROR', 500);
    }

    return formatResponse({ success: true });
  } catch (err: unknown) {
    console.error('Account deletion error:', err);
    if (err instanceof BaseError) {
      return formatError(err);
    }
    return formatError(new BaseError('Failed to delete account', 'INTERNAL_ERROR', 500));
  }
}
