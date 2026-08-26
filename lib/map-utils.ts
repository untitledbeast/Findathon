export interface MapHackathon {
  id: string;
  title: string;
  tagline?: string | null;
  description: string;
  start_date: string;
  end_date: string;
  registration_deadline?: string | null;
  location_city?: string | null;
  location_college?: string | null;
  is_online: boolean;
  mode?: string;
  tags: string[];
  register_url: string;
  organizer: string;
  cover_image_url?: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  prize_pool?: string | null;
  prize_amount?: number;
  is_featured?: boolean;
  is_verified?: boolean;
  difficulty?: string;
  distance_km?: number;
}

export type EventLifecycle = 'upcoming' | 'live' | 'ended';

/**
 * Calculates deterministic event lifecycle with timezone-safe date parsing.
 */
export function getHackathonLifecycle(
  hackathon: { start_date?: string | null; end_date?: string | null },
  now = new Date()
): EventLifecycle {
  if (!hackathon.start_date || !hackathon.end_date) return 'upcoming';

  const start = new Date(hackathon.start_date);
  const end = new Date(hackathon.end_date);

  // If date-only format (YYYY-MM-DD), extend end date to end of day in local/event time
  if (hackathon.end_date.length === 10) {
    end.setHours(23, 59, 59, 999);
  }

  const nowMs = now.getTime();
  if (nowMs < start.getTime()) return 'upcoming';
  if (nowMs >= start.getTime() && nowMs <= end.getTime()) return 'live';
  return 'ended';
}

export type MarkerSemanticStatus = 'live' | 'open' | 'closing_soon' | 'online' | 'featured' | 'closed';

/**
 * Derives the visual marker semantic status.
 */
export function getMarkerStatus(hackathon: MapHackathon, now = new Date()): MarkerSemanticStatus {
  const lifecycle = getHackathonLifecycle(hackathon, now);
  if (lifecycle === 'live') return 'live';
  if (hackathon.is_featured) return 'featured';
  if (hackathon.is_online) return 'online';

  const deadline = hackathon.registration_deadline
    ? new Date(hackathon.registration_deadline)
    : new Date(hackathon.start_date);
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (lifecycle === 'ended' || daysLeft < 0) return 'closed';
  if (daysLeft <= 5) return 'closing_soon';
  return 'open';
}

export const MARKER_COLORS: Record<MarkerSemanticStatus, string> = {
  live: '#EF4444',         // Pulsing Red/Crimson for Live Now
  open: '#00FFA3',         // Emerald Green
  closing_soon: '#F59E0B', // Amber Orange
  online: '#4CC9F0',       // Cyan Blue
  featured: '#8B5CF6',     // Violet Purple
  closed: '#64748B',       // Slate Grey
};

export const MARKER_GLOW: Record<MarkerSemanticStatus, string> = {
  live: 'rgba(239, 68, 68, 0.8)',
  open: 'rgba(0, 255, 163, 0.5)',
  closing_soon: 'rgba(245, 158, 11, 0.5)',
  online: 'rgba(76, 201, 240, 0.5)',
  featured: 'rgba(139, 92, 246, 0.6)',
  closed: 'rgba(100, 116, 139, 0.3)',
};

/**
 * Single source of truth for physical marker eligibility.
 */
export function isMarkerEligible(hackathon: MapHackathon): boolean {
  if (hackathon.is_online) return false;
  if (hackathon.latitude === null || hackathon.latitude === undefined || hackathon.longitude === null || hackathon.longitude === undefined) {
    return false;
  }
  const lat = Number(hackathon.latitude);
  const lng = Number(hackathon.longitude);
  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
    return false;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return false;
  }
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
    return false; // Reject Null Island (0,0)
  }
  return true;
}

export function getDaysLeft(dateStr?: string | null): number {
  if (!dateStr) return 999;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function formatPrize(prize?: string | null): string {
  if (!prize) return 'Free';
  return prize;
}

export interface ClusterPoint {
  lat: number;
  lng: number;
  count: number;
  hackathons: MapHackathon[];
}

export function clusterHackathons(hackathons: MapHackathon[], zoomLevel: number): ClusterPoint[] {
  const gridSize = zoomLevel < 5 ? 6 : zoomLevel < 8 ? 2.0 : zoomLevel < 11 ? 0.6 : 0.15;
  const clusters: Record<string, ClusterPoint> = {};

  hackathons.forEach(h => {
    if (!isMarkerEligible(h)) return;

    const lat = Number(h.latitude);
    const lng = Number(h.longitude);

    const gridLat = Math.round(lat / gridSize) * gridSize;
    const gridLng = Math.round(lng / gridSize) * gridSize;
    const key = `${gridLat.toFixed(2)},${gridLng.toFixed(2)}`;

    if (!clusters[key]) {
      clusters[key] = { lat: gridLat, lng: gridLng, count: 0, hackathons: [] };
    }
    clusters[key].count++;
    clusters[key].hackathons.push(h);
  });

  return Object.values(clusters);
}
