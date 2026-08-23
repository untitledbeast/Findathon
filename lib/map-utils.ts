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

export type MarkerSemanticStatus = 'open' | 'closing_soon' | 'online' | 'featured' | 'closed';

export function getMarkerStatus(hackathon: MapHackathon): MarkerSemanticStatus {
  if (hackathon.is_featured) return 'featured';
  if (hackathon.is_online) return 'online';

  const now = new Date();
  const deadline = hackathon.registration_deadline
    ? new Date(hackathon.registration_deadline)
    : new Date(hackathon.start_date);
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return 'closed';
  if (daysLeft <= 5) return 'closing_soon';
  return 'open';
}

export const MARKER_COLORS: Record<MarkerSemanticStatus, string> = {
  open: '#00FFA3',         // Green
  closing_soon: '#F59E0B', // Orange
  online: '#4CC9F0',       // Blue
  featured: '#8B5CF6',     // Purple
  closed: '#64748B',       // Grey
};

export const MARKER_GLOW: Record<MarkerSemanticStatus, string> = {
  open: 'rgba(0, 255, 163, 0.5)',
  closing_soon: 'rgba(245, 158, 11, 0.5)',
  online: 'rgba(76, 201, 240, 0.5)',
  featured: 'rgba(139, 92, 246, 0.6)',
  closed: 'rgba(100, 116, 139, 0.3)',
};

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
    // Online events have no physical map coordinates
    if (h.is_online) return;

    if (h.latitude === null || h.latitude === undefined || h.longitude === null || h.longitude === undefined) {
      return;
    }

    const lat = Number(h.latitude);
    const lng = Number(h.longitude);

    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0) || !isFinite(lat) || !isFinite(lng)) {
      return;
    }

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
