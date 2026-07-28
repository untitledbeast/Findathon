import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/context/request-context';
import { AuthService } from '@/lib/auth/auth.service';
import { createHackathonModule } from '@/lib/composition';
import { container } from '@/lib/composition/container';
import { supabase } from '@/lib/supabase';
import { computeDynamicScore } from '@/lib/discovery-score';
import { formatError } from '@/lib/errors';
import { HackathonDTO } from '@/lib/dto';

function toLegacyDto(input: unknown): HackathonDTO {
  const dto = (input || {}) as Record<string, unknown>;
  return {
    id: String(dto.id || ''),
    title: String(dto.title || ''),
    description: String(dto.description || ''),
    tagline: dto.tagline ? String(dto.tagline) : undefined,
    start_date: String(dto.startDate || dto.start_date || new Date().toISOString()),
    end_date: String(dto.endDate || dto.end_date || new Date().toISOString()),
    registration_deadline: dto.registrationDeadline || dto.registration_deadline ? String(dto.registrationDeadline || dto.registration_deadline) : undefined,
    location_city: dto.locationCity || dto.location_city ? String(dto.locationCity || dto.location_city) : undefined,
    location_college: dto.locationCollege || dto.location_college ? String(dto.locationCollege || dto.location_college) : undefined,
    is_online: dto.isOnline !== undefined ? Boolean(dto.isOnline) : Boolean(dto.is_online),
    register_url: String(dto.registrationUrl || dto.register_url || `/hackathons/${dto.id || ''}`),
    prize_amount: Number(dto.prizeAmount || dto.prize_amount || 0),
    tags: Array.isArray(dto.tags) ? dto.tags as string[] : [],
    latitude: dto.latitude !== undefined ? Number(dto.latitude) : null,
    longitude: dto.longitude !== undefined ? Number(dto.longitude) : null,
    is_featured: dto.isFeatured !== undefined ? Boolean(dto.isFeatured) : Boolean(dto.is_featured),
    is_verified: dto.isVerified !== undefined ? Boolean(dto.isVerified) : Boolean(dto.is_verified),
    base_score: Number(dto.baseScore || dto.base_score || 50)
  } as unknown as HackathonDTO;
}

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    
    // Logged-out users get generic recent list
    if (!user) {
      const { searchHandler } = createHackathonModule();
      const headers: Record<string, string | undefined> = {};
      req.headers.forEach((val, key) => { headers[key] = val; });
      const context = createRequestContext(null, headers);
      const searchRes = await searchHandler.execute(context, { limit: 6 });
      if (!searchRes.ok) {
        const err = formatError(searchRes.error);
        return NextResponse.json({ success: false, error: err }, { status: searchRes.error.statusCode });
      }
      return NextResponse.json({
        success: true,
        data: searchRes.value.hackathons
      });
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((val, key) => { headers[key] = val; });
    const context = createRequestContext(user, headers);

    const { searchHandler } = createHackathonModule();
    const searchRes = await searchHandler.execute(context, { limit: 20 });

    if (!searchRes.ok) {
      const err = formatError(searchRes.error);
      return NextResponse.json({ success: false, error: err }, { status: searchRes.error.statusCode });
    }

    // Fetch user profile from repository
    const profileRepo = container.getProfileRepository();
    const profile = await profileRepo.findById(user.id);

    // Fetch user saved hackathons' tags
    const { data: saved } = await supabase
      .from('bookmarks')
      .select('hackathon_id')
      .eq('user_id', user.id);

    const savedHackathonIds = (saved || []).map(s => s.hackathon_id);
    let savedTags: string[] = [];
    if (savedHackathonIds.length > 0) {
      const { data: hackathons } = await supabase
        .from('hackathons')
        .select('tags')
        .in('id', savedHackathonIds);
      if (hackathons) {
        savedTags = hackathons.flatMap(h => h.tags || []);
      }
    }

    // Combine tags (interests + skills + saved hackathons)
    const userTags = Array.from(new Set([
      ...(profile?.interests || []),
      ...(profile?.skills || []),
      ...savedTags
    ])).filter(Boolean);

    // Geocode user location based on profile organization/city
    let userLat: number | undefined;
    let userLng: number | undefined;

    if (profile?.organization) {
      const queryStr = encodeURIComponent(profile.organization);
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${queryStr}&format=json&limit=1`,
        { headers: { 'User-Agent': 'Findathon/1.0 (findathon.app)' } }
      ).catch(() => null);
      if (geoRes && geoRes.ok) {
        const data = await geoRes.json();
        if (Array.isArray(data) && data.length > 0) {
          userLat = parseFloat(data[0].lat);
          userLng = parseFloat(data[0].lon);
        }
      }
    }

    // Score & rank hackathons
    const scored = searchRes.value.hackathons.map(h => {
      const score = computeDynamicScore(toLegacyDto(h), {
        userLat,
        userLng,
        userTags
      });

      return {
        ...h,
        dynamic_score: score,
        recommendationReason: userTags.length > 0
          ? `Matches interest in ${userTags.slice(0, 2).join(' & ')}`
          : 'Highly rated hackathon near you'
      };
    }).sort((a, b) => b.dynamic_score - a.dynamic_score).slice(0, 6);

    const res = NextResponse.json({
      success: true,
      data: scored
    });

    res.headers.set('Cache-Control', 'private, s-maxage=600, stale-while-revalidate=1200');
    return res;
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json({ success: false, error: formatted }, { status: formatted.statusCode });
  }
}
