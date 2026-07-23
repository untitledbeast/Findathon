import { supabase, MOCK_HACKATHONS, Hackathon } from './supabase';
import { HackathonDTO, toHackathonDTO } from './dto';

export interface HackathonQueryFilters {
  tags?: string[];
  startDate?: string;
  endDate?: string;
  onlineOnly?: boolean;
  prizeMin?: number;
  searchQuery?: string;
  difficulty?: string;
  lifecycleState?: string;
  limit?: number;
  offset?: number;
}

export interface IHackathonRepository {
  findAll(filters?: HackathonQueryFilters): Promise<HackathonDTO[]>;
  findById(id: string): Promise<HackathonDTO | null>;
  findWithinRadius(lat: number, lng: number, radiusKm: number): Promise<HackathonDTO[]>;
  findInBounds(south: number, west: number, north: number, east: number): Promise<HackathonDTO[]>;
  save(hackathon: Partial<HackathonDTO>): Promise<HackathonDTO>;
}

export class SupabaseHackathonRepository implements IHackathonRepository {
  async findAll(filters?: HackathonQueryFilters): Promise<HackathonDTO[]> {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        return new MockHackathonRepository().findAll(filters);
      }

      let query = supabase.from('hackathons').select('*');

      if (filters?.lifecycleState) {
        query = query.eq('lifecycle_state', filters.lifecycleState);
      } else {
        query = query.or('status.eq.approved,lifecycle_state.eq.published');
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      if (filters?.startDate) {
        query = query.gte('start_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('end_date', filters.endDate);
      }

      if (filters?.onlineOnly) {
        query = query.eq('is_online', true);
      }

      if (filters?.prizeMin && filters.prizeMin > 0) {
        query = query.gte('prize_amount', filters.prizeMin);
      }

      if (filters?.searchQuery) {
        const q = filters.searchQuery.trim();
        query = query.or(`title.ilike.%${q}%,location_city.ilike.%${q}%,organizer.ilike.%${q}%`);
      }

      const limit = filters?.limit || 100;
      const offset = filters?.offset || 0;
      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        return new MockHackathonRepository().findAll(filters);
      }

      return data.map(item => toHackathonDTO(item));
    } catch (err) {
      console.error('SupabaseHackathonRepository.findAll exception:', err);
      return new MockHackathonRepository().findAll(filters);
    }
  }

  async findById(id: string): Promise<HackathonDTO | null> {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        return new MockHackathonRepository().findById(id);
      }

      const { data, error } = await supabase
        .from('hackathons')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return new MockHackathonRepository().findById(id);
      }

      return toHackathonDTO(data);
    } catch {
      return new MockHackathonRepository().findById(id);
    }
  }

  async findWithinRadius(lat: number, lng: number, radiusKm: number = 100): Promise<HackathonDTO[]> {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        return new MockHackathonRepository().findWithinRadius(lat, lng, radiusKm);
      }

      const { data, error } = await supabase.rpc('hackathons_within_radius', {
        lat,
        lng,
        radius_km: Math.min(radiusKm, 500)
      });

      if (error || !data || data.length === 0) {
        return new MockHackathonRepository().findWithinRadius(lat, lng, radiusKm);
      }

      return data.map((item: Record<string, unknown>) => toHackathonDTO(item));
    } catch {
      return new MockHackathonRepository().findWithinRadius(lat, lng, radiusKm);
    }
  }

  async findInBounds(south: number, west: number, north: number, east: number): Promise<HackathonDTO[]> {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        return new MockHackathonRepository().findInBounds(south, west, north, east);
      }

      const { data, error } = await supabase.rpc('hackathons_in_bounds', { south, west, north, east });
      if (error || !data || data.length === 0) {
        return new MockHackathonRepository().findInBounds(south, west, north, east);
      }

      return data.map((item: Record<string, unknown>) => toHackathonDTO(item));
    } catch {
      return new MockHackathonRepository().findInBounds(south, west, north, east);
    }
  }

  async save(hackathon: Partial<HackathonDTO>): Promise<HackathonDTO> {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        return new MockHackathonRepository().save(hackathon);
      }

      const { data, error } = await supabase.from('hackathons').insert([hackathon]).select().single();
      if (error || !data) {
        return new MockHackathonRepository().save(hackathon);
      }

      return toHackathonDTO(data);
    } catch {
      return new MockHackathonRepository().save(hackathon);
    }
  }
}

export class MockHackathonRepository implements IHackathonRepository {
  private getMockItems(): HackathonDTO[] {
    return MOCK_HACKATHONS.map(item => toHackathonDTO(item as unknown as Record<string, unknown>));
  }

  async findAll(filters?: HackathonQueryFilters): Promise<HackathonDTO[]> {
    let result = this.getMockItems();

    if (filters?.tags && filters.tags.length > 0) {
      result = result.filter(h =>
        h.tags?.some(t => filters.tags!.some(ft => t.toLowerCase().includes(ft.toLowerCase())))
      );
    }

    if (filters?.onlineOnly) {
      result = result.filter(h => h.is_online);
    }

    if (filters?.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(h =>
        h.title.toLowerCase().includes(q) ||
        (h.location_city && h.location_city.toLowerCase().includes(q)) ||
        (h.organizer && h.organizer.toLowerCase().includes(q))
      );
    }

    return result;
  }

  async findById(id: string): Promise<HackathonDTO | null> {
    const found = this.getMockItems().find(h => h.id === id);
    return found || this.getMockItems()[0] || null;
  }

  async findWithinRadius(lat: number, lng: number, radiusKm: number = 100): Promise<HackathonDTO[]> {
    const items = this.getMockItems();
    return items.map(h => {
      if (h.latitude && h.longitude) {
        const d = this.calculateDistance(lat, lng, h.latitude, h.longitude);
        return { ...h, distance_km: Math.round(d * 10) / 10 };
      }
      return h;
    }).filter(h => h.distance_km === undefined || h.distance_km <= radiusKm)
      .sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
  }

  async findInBounds(south: number, west: number, north: number, east: number): Promise<HackathonDTO[]> {
    return this.getMockItems().filter(h => {
      if (!h.latitude || !h.longitude) return true;
      return h.latitude >= south && h.latitude <= north && h.longitude >= west && h.longitude <= east;
    });
  }

  async save(hackathon: Partial<HackathonDTO>): Promise<HackathonDTO> {
    const newItem = toHackathonDTO(hackathon);
    MOCK_HACKATHONS.unshift(newItem as unknown as Hackathon);
    return newItem;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
