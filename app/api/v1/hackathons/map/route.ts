import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { HackathonDatabaseRow } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch approved hackathons
    const { data: hackathons, error } = await supabase
      .from('hackathons')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[map API] Supabase error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const items = (hackathons || []).map((h: HackathonDatabaseRow) => {
      const isOnline = Boolean(h.is_online);

      // STRICT RULE: Never fabricate coordinates.
      // Online events have NO physical marker (latitude: null, longitude: null).
      // Offline events only receive coordinates if valid.
      let lat: number | null = null;
      let lng: number | null = null;

      if (!isOnline && h.latitude !== undefined && h.latitude !== null && h.longitude !== undefined && h.longitude !== null) {
        const parsedLat = Number(h.latitude);
        const parsedLng = Number(h.longitude);
        if (!isNaN(parsedLat) && !isNaN(parsedLng) && isFinite(parsedLat) && isFinite(parsedLng) && (parsedLat !== 0 || parsedLng !== 0)) {
          lat = parsedLat;
          lng = parsedLng;
        }
      }

      return {
        id: h.id,
        title: h.title || 'Untitled Hackathon',
        tagline: h.tagline || null,
        description: h.description || '',
        start_date: h.start_date || new Date().toISOString(),
        end_date: h.end_date || new Date().toISOString(),
        registration_deadline: h.registration_deadline || h.start_date || null,
        location_city: h.location_city || (isOnline ? 'Online' : 'In-Person'),
        location_college: h.location_college || null,
        is_online: isOnline,
        mode: h.mode || (isOnline ? 'Online' : 'Offline'),
        tags: Array.isArray(h.tags) ? h.tags : [],
        register_url: h.register_url || `/hackathons/${h.id}`,
        organizer: h.organizer || 'Community Organizer',
        cover_image_url: h.cover_image_url || null,
        status: h.status || 'approved',
        latitude: lat,
        longitude: lng,
        prize_pool: h.prize_pool || null,
        prize_amount: h.prize_pool ? parseInt(h.prize_pool.replace(/[^0-9]/g, ''), 10) || 0 : 0,
        is_featured: Boolean(h.is_featured),
        is_verified: Boolean(h.is_verified || h.status === 'approved'),
        difficulty: h.difficulty || 'open'
      };
    });

    const res = NextResponse.json({
      success: true,
      data: items,
      meta: { total: items.length }
    });

    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res;
  } catch (err: unknown) {
    console.error('[map API] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch map hackathons' },
      { status: 500 }
    );
  }
}
