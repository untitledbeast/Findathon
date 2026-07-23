import { HackathonDTO } from './dto';

export type MapHackathon = HackathonDTO;

export type MarkerSemanticStatus = 'open' | 'closing_soon' | 'closed' | 'online' | 'featured' | 'verified';

export function getMarkerStatus(hackathon: MapHackathon): MarkerSemanticStatus {
  if (hackathon.is_featured) return 'featured';
  if (hackathon.is_verified) return 'verified';
  if (hackathon.is_online) return 'online';

  const now = new Date();
  const deadline = hackathon.registration_deadline
    ? new Date(hackathon.registration_deadline)
    : new Date(hackathon.start_date);
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return 'closed';
  if (daysLeft <= 3) return 'closing_soon';
  return 'open';
}

export const MARKER_COLORS: Record<MarkerSemanticStatus, string> = {
  open: '#00FFA3',         // Emerald Green
  closing_soon: '#F59E0B', // Amber
  closed: '#EF4444',       // Red
  online: '#4CC9F0',       // Cyan Blue
  featured: '#8B5CF6',     // Violet
  verified: '#10B981',     // Teal Verified
};

export const MARKER_GLOW: Record<MarkerSemanticStatus, string> = {
  open: 'rgba(0,255,163,0.4)',
  closing_soon: 'rgba(245,158,11,0.4)',
  closed: 'rgba(239,68,68,0.3)',
  online: 'rgba(76,201,240,0.4)',
  featured: 'rgba(139,92,246,0.5)',
  verified: 'rgba(16,185,129,0.5)',
};

export function getDaysLeft(dateStr?: string | null): number {
  if (!dateStr) return 999;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function formatPrize(prize: string | null): string {
  if (!prize) return '';
  return prize;
}

export interface ClusterPoint {
  lat: number;
  lng: number;
  count: number;
  hackathons: MapHackathon[];
}

export function clusterHackathons(hackathons: MapHackathon[], zoomLevel: number): ClusterPoint[] {
  const gridSize = zoomLevel < 5 ? 8 : zoomLevel < 8 ? 2.5 : zoomLevel < 11 ? 0.8 : 0.2;
  const clusters: Record<string, ClusterPoint> = {};

  hackathons.forEach(h => {
    if (h.latitude === null || h.latitude === undefined || h.longitude === null || h.longitude === undefined) {
      return;
    }

    const gridLat = Math.round(h.latitude / gridSize) * gridSize;
    const gridLng = Math.round(h.longitude / gridSize) * gridSize;
    const key = `${gridLat.toFixed(2)},${gridLng.toFixed(2)}`;

    if (!clusters[key]) {
      clusters[key] = { lat: gridLat, lng: gridLng, count: 0, hackathons: [] };
    }
    clusters[key].count++;
    clusters[key].hackathons.push(h);
  });

  return Object.values(clusters);
}
