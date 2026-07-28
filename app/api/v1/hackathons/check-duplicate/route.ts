import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/dto';
import { DeduplicationService, DuplicateCheckResult } from '@/lib/services/deduplication.service';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<DuplicateCheckResult>>> {
  const requestId = `req-${Date.now()}`;
  try {
    const { title, start_date } = await req.json();

    if (!title) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_PARAMETERS', message: 'Title is required', requestId }
      }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let existing: Array<{ id: string; title: string; start_date: string; end_date: string; status: string }> = [];
    if (supabaseUrl && !supabaseUrl.includes('placeholder') && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase.from('hackathons').select('id, title, start_date, end_date, status');
      existing = (data || []).map((d: Record<string, unknown>) => ({
        id: String(d.id || ''),
        title: String(d.title || ''),
        start_date: String(d.start_date || ''),
        end_date: String(d.end_date || ''),
        status: d.status ? String(d.status) : 'approved'
      }));
    } else {
      existing = [
        { id: '1', title: 'Mumbai AI DevFest 2026', start_date: '2026-08-15', end_date: '2026-08-17', status: 'approved' },
        { id: '2', title: 'Global Web3 Hackathon 2026', start_date: '2026-09-01', end_date: '2026-09-03', status: 'approved' }
      ];
    }

    const result = DeduplicationService.checkDuplicate(title, start_date, existing);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Duplicate check failed';
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message, requestId }
    }, { status: 500 });
  }
}
