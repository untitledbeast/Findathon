import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { BaseError } from '@/lib/errors';
import { AuthService } from '@/lib/auth/auth.service';

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.requireAuth();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') || '',
          }
        }
      }
    );

    const { data, error } = await supabase
      .from('hackathons')
      .select('id, title, status, rejection_reason, mode, city, start_date, end_date, cover_image_url, created_at')
      .eq('submitted_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BaseError('Failed to fetch submissions', 'FETCH_ERROR', 500);
    }

    return formatResponse(data || []);
  } catch (err: unknown) {
    if (err instanceof BaseError) {
      return formatError(err);
    }
    return formatError(new BaseError('Failed to fetch submissions', 'INTERNAL_ERROR', 500));
  }
}
