import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Default city coordinates fallback map
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  mumbai: { lat: 19.0760, lng: 72.8777 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  delhi: { lat: 28.7041, lng: 77.1025 },
  newdelhi: { lat: 28.6139, lng: 77.2090 },
  pune: { lat: 18.5204, lng: 73.8567 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  noida: { lat: 28.5355, lng: 77.3910 },
  gurugram: { lat: 28.4595, lng: 77.0266 },
  gurgaon: { lat: 28.4595, lng: 77.0266 },
  indore: { lat: 22.7196, lng: 75.8577 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  online: { lat: 20.5937, lng: 78.9629 },
  global: { lat: 20.5937, lng: 78.9629 }
};

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: hackathons, error } = await supabase
      .from('hackathons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[map API] Supabase error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const items = (hackathons || []).map((h: any) => {
      let lat: number | null = h.latitude ? Number(h.latitude) : null;
      let lng: number | null = h.longitude ? Number(h.longitude) : null;

      // If coordinates missing in DB, resolve from city or online fallback
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        const cityKey = (h.location_city || '').toLowerCase().replace(/[^a-z]/g, '');
        const titleKey = (h.title || '').toLowerCase();

        if (cityKey && CITY_COORDINATES[cityKey]) {
          lat = CITY_COORDINATES[cityKey].lat;
          lng = CITY_COORDINATES[cityKey].lng;
        } else if (h.is_online || titleKey.includes('online') || titleKey.includes('global')) {
          lat = 20.5937;
          lng = 78.9629;
        } else {
          // Default to Mumbai
          lat = 19.0760;
          lng = 72.8777;
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
        location_city: h.location_city || (h.is_online ? 'Online' : 'In-Person'),
        location_college: h.location_college || null,
        is_online: Boolean(h.is_online),
        mode: h.mode || (h.is_online ? 'Online' : 'Offline'),
        tags: Array.isArray(h.tags) ? h.tags : [],
        register_url: h.register_url || '#',
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

    return NextResponse.json({
      success: true,
      data: items,
      meta: { total: items.length }
    });
  } catch (err: any) {
    console.error('[map API] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch map hackathons' },
      { status: 500 }
    );
  }
}
