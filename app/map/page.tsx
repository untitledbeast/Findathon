'use client';

import React, { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import HackathonCard from '@/components/HackathonCard';
import MapMarkerPreview from '@/components/MapMarkerPreview';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/components/AuthModal';
import { storageService } from '@/lib/storage-service';
import { Hackathon } from '@/lib/supabase';
import {
  MapHackathon,
  clusterHackathons,
  getMarkerStatus,
  MARKER_COLORS,
  MARKER_GLOW,
  getDaysLeft
} from '@/lib/map-utils';
import {
  Search,
  X,
  MapPin,
  Calendar as CalendarIcon,
  List as ListIcon,
  Map as MapIcon,
  SlidersHorizontal,
  Crosshair,
  Clock,
  Flame,
  Filter,
  Sparkles,
  RefreshCw,
  Trophy,
  Building2,
  ExternalLink
} from 'lucide-react';

// Dynamic Leaflet Components (SSR Disabled)
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(m => m.Circle), { ssr: false });

const CATEGORY_TAGS = [
  'AI/ML', 'Web3', 'Cloud', 'Cybersecurity', 'Mobile',
  'Blockchain', 'Data Science', 'Game Dev', 'Open Source', 'Robotics'
];

function DiscoveryPlatformContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();

  // Leaflet Module Instance
  const [L, setL] = useState<typeof import('leaflet') | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'calendar'>(() => {
    const qView = searchParams.get('view');
    return (qView === 'list' || qView === 'calendar') ? qView : 'map';
  });

  const [filters, setFilters] = useState(() => ({
    search: searchParams.get('search') || '',
    tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',') : [] as string[],
    onlineOnly: searchParams.get('online') === 'true',
    prizeMin: Number(searchParams.get('prizeMin') || 0),
    status: (searchParams.get('status') as 'all' | 'open' | 'closing_soon' | 'closed') || 'all'
  }));

  // Data fetching state
  const [hackathons, setHackathons] = useState<MapHackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedHackathon, setSelectedHackathon] = useState<MapHackathon | null>(null);
  const [hoveredHackathon, setHoveredHackathon] = useState<MapHackathon | null>(null);
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [savedIds, setSavedIds] = useState<string[]>(() => storageService.getSavedIds());
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Geolocation & Radius State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  // Timeline State
  const [timelineDays, setTimelineDays] = useState<number>(180);

  const mapRef = useRef<L.Map | null>(null);

  // Dynamically load Leaflet ESM module
  useEffect(() => {
    import('leaflet').then(m => setL(m));
  }, []);

  // Fetch hackathons from GET /api/v1/hackathons/map
  useEffect(() => {
    let active = true;
    async function fetchMapHackathons() {
      try {
        const res = await fetch('/api/v1/hackathons/map');
        if (!res.ok) throw new Error('Failed to load map data');
        const json = await res.json();
        if (!active) return;
        if (json.success && Array.isArray(json.data)) {
          setHackathons(json.data);
        } else {
          throw new Error(json.error || 'Invalid API response format');
        }
      } catch (err: unknown) {
        if (!active) return;
        console.error('[Map Engine] fetch error:', err);
        const message = err instanceof Error ? err.message : 'Unable to load hackathon coordinates.';
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchMapHackathons();
    return () => {
      active = false;
    };
  }, []);

  // URL Param Sync
  const updateUrlParams = (newFilters: typeof filters, newView: string, selectedId?: string | null) => {
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.status !== 'all') params.set('status', newFilters.status);
    if (newFilters.onlineOnly) params.set('online', 'true');
    if (newFilters.tags.length > 0) params.set('tags', newFilters.tags.join(','));
    if (newFilters.prizeMin > 0) params.set('prizeMin', newFilters.prizeMin.toString());
    if (newView !== 'map') params.set('view', newView);
    if (selectedId) params.set('id', selectedId);

    const queryString = params.toString();
    const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', targetUrl);
    }
  };

  const handleFilterChange = (updater: (prev: typeof filters) => typeof filters) => {
    setFilters(prev => {
      const next = updater(prev);
      updateUrlParams(next, viewMode, selectedHackathon?.id);
      return next;
    });
  };

  const handleViewModeChange = (mode: 'map' | 'list' | 'calendar') => {
    setViewMode(mode);
    updateUrlParams(filters, mode, selectedHackathon?.id);
  };

  // Real-time Filtering
  const filteredHackathons = useMemo(() => {
    return hackathons.filter(h => {
      // 1. Search Query
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const matchTitle = h.title.toLowerCase().includes(q);
        const matchCity = h.location_city?.toLowerCase().includes(q) || false;
        const matchOrganizer = h.organizer?.toLowerCase().includes(q) || false;
        const matchTags = h.tags?.some(t => t.toLowerCase().includes(q)) || false;
        if (!matchTitle && !matchCity && !matchOrganizer && !matchTags) return false;
      }

      // 2. Status Filter
      const status = getMarkerStatus(h);
      if (filters.status === 'open' && status !== 'open' && status !== 'featured') return false;
      if (filters.status === 'closing_soon' && status !== 'closing_soon') return false;
      if (filters.status === 'closed' && status !== 'closed') return false;

      // 3. Online Only
      if (filters.onlineOnly && !h.is_online) return false;

      // 4. Tags
      if (filters.tags.length > 0) {
        const hasTag = filters.tags.some(ft =>
          h.tags?.some(t => t.toLowerCase().includes(ft.toLowerCase()))
        );
        if (!hasTag) return false;
      }

      // 5. Min Prize
      if (filters.prizeMin > 0 && (h.prize_amount || 0) < filters.prizeMin) return false;

      // 6. Timeline Slider
      if (timelineDays < 180) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + timelineDays);
        if (new Date(h.start_date) > targetDate) return false;
      }

      // 7. Location Radius
      if (userLocation && radiusKm && h.latitude && h.longitude) {
        const dist = calculateDist(userLocation.lat, userLocation.lng, Number(h.latitude), Number(h.longitude));
        if (dist > radiusKm) return false;
      }

      return true;
    });
  }, [hackathons, filters, timelineDays, userLocation, radiusKm]);

  // Dynamic Live Metrics
  const stats = useMemo(() => ({
    total: filteredHackathons.length,
    closingToday: filteredHackathons.filter(h => getDaysLeft(h.registration_deadline) <= 5 && getDaysLeft(h.registration_deadline) >= 0).length,
    online: filteredHackathons.filter(h => h.is_online).length,
    featured: filteredHackathons.filter(h => h.is_featured || h.is_verified).length
  }), [filteredHackathons]);

  // Marker Clustering
  const clusters = useMemo(() => {
    return clusterHackathons(filteredHackathons, 6);
  }, [filteredHackathons]);

  // Auto-fit map bounds when markers load or update
  useEffect(() => {
    if (L && mapRef.current && filteredHackathons.length > 0) {
      const validCoords = filteredHackathons
        .filter(h => h.latitude && h.longitude)
        .map(h => [Number(h.latitude), Number(h.longitude)] as [number, number]);

      if (validCoords.length > 0) {
        try {
          const bounds = L.latLngBounds(validCoords);
          mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
        } catch {
          // Ignore invalid bounds
        }
      }
    }
  }, [L, filteredHackathons]);

  // Geolocation Handler
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setRadiusKm(100);
        setLocating(false);

        if (mapRef.current) {
          mapRef.current.flyTo([coords.lat, coords.lng], 9, { duration: 1.5 });
        }
        showToast('Located! Showing hackathons within 100km radius.');
      },
      (err) => {
        console.error(err);
        setLocating(false);
        showToast('Unable to retrieve location.');
      }
    );
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleSave = (id: string) => {
    if (!user) {
      openAuthModal();
      return;
    }
    const updated = storageService.toggleSavedId(id);
    setSavedIds(updated);
  };

  function calculateDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Custom Glowing DivIcon Renderer
  const createDivIcon = (hackathon: MapHackathon) => {
    if (!L) return undefined;
    const isSelected = selectedHackathon?.id === hackathon.id;
    const status = getMarkerStatus(hackathon);
    const color = MARKER_COLORS[status];
    const glow = MARKER_GLOW[status];
    const size = isSelected ? 24 : 18;

    const html = `
      <div style="
        width: ${size}px; height: ${size}px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid rgba(255, 255, 255, 0.95);
        box-shadow: 0 0 ${isSelected ? '24px' : '12px'} ${glow}, 0 0 0 ${isSelected ? '6px' : '3px'} ${color}44;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        position: relative;
      ">
        ${isSelected ? `<div style="
          position: absolute; inset: -8px;
          border-radius: 50%;
          border: 2px solid ${color};
          animation: ping 1.2s cubic-bezier(0,0,0.2,1) infinite;
          opacity: 0.7;
        "></div>` : ''}
      </div>
    `;

    return L.divIcon({
      html,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  };

  const createClusterDivIcon = (count: number) => {
    if (!L) return undefined;
    const size = count > 50 ? 48 : count > 10 ? 40 : 34;

    const html = `
      <div style="
        width: ${size}px; height: ${size}px;
        border-radius: 50%;
        background: rgba(13, 18, 36, 0.95);
        border: 2px solid #8B5CF6;
        box-shadow: 0 0 16px rgba(139, 92, 246, 0.6);
        display: flex; align-items: center; justify-content: center;
        color: white; font-size: ${count > 99 ? '10px' : '12px'};
        font-family: monospace;
        font-weight: 800;
        cursor: pointer;
      ">${count}</div>
    `;

    return L.divIcon({
      html,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  };

  return (
    <div className="fixed inset-0 h-screen w-screen bg-[#060816] text-[#F6F8FC] overflow-hidden select-none">

      {/* 1. MAP CANVAS */}
      <div className="absolute inset-0 h-full w-full z-0">
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          ref={mapRef}
          style={{ height: '100%', width: '100%', backgroundColor: '#060816' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          />

          {userLocation && radiusKm && (
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={radiusKm * 1000}
              pathOptions={{
                color: '#8B5CF6',
                fillColor: '#8B5CF6',
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: '6,6'
              }}
            />
          )}

          {clusters.map((cluster, idx) => {
            if (cluster.count > 1) {
              return (
                <Marker
                  key={`cluster-${idx}`}
                  position={[cluster.lat, cluster.lng]}
                  icon={createClusterDivIcon(cluster.count)}
                  eventHandlers={{
                    click: () => {
                      if (mapRef.current) {
                        mapRef.current.flyTo([cluster.lat, cluster.lng], 9, { duration: 1 });
                      }
                    }
                  }}
                />
              );
            }

            const hackathon = cluster.hackathons[0];
            if (!hackathon || hackathon.latitude === null || hackathon.longitude === null) return null;

            return (
              <Marker
                key={hackathon.id}
                position={[Number(hackathon.latitude), Number(hackathon.longitude)]}
                icon={createDivIcon(hackathon)}
                eventHandlers={{
                  click: () => {
                    setSelectedHackathon(hackathon);
                    setBottomSheetOpen(true);
                    updateUrlParams(filters, viewMode, hackathon.id);
                  },
                  mouseover: (e) => {
                    setHoveredHackathon(hackathon);
                    setPreviewPos({ x: e.originalEvent.clientX, y: e.originalEvent.clientY });
                  },
                  mouseout: () => {
                    setHoveredHackathon(null);
                  }
                }}
              />
            );
          })}
        </MapContainer>

        {hoveredHackathon && (
          <MapMarkerPreview
            hackathon={hoveredHackathon}
            x={previewPos.x}
            y={previewPos.y}
            visible={Boolean(hoveredHackathon)}
          />
        )}
      </div>

      {/* 2. FLOATING TOP NAV */}
      <header className="fixed top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 md:left-6 md:right-6 lg:left-8 lg:right-8 z-40 bg-[#0D1224]/85 backdrop-blur-2xl border border-purple-500/30 rounded-2xl sm:rounded-3xl px-3 sm:px-5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(139,92,246,0.15)] flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-purple-400 group-hover:rotate-12 transition-transform text-lg">✦</span>
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-white">
              Find<span className="text-gradient">athon</span>
            </span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40">
            <MapIcon className="w-3 h-3" /> Map Engine
          </span>
        </div>

        {/* View Switcher & Search */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center p-1 rounded-full bg-slate-950/80 border border-purple-900/40 shadow-inner">
            <button
              onClick={() => handleViewModeChange('map')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'map' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
            >
              <MapIcon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Map</span>
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
            >
              <ListIcon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => handleViewModeChange('calendar')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'calendar' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Calendar</span>
            </button>
          </div>

          <div className="relative hidden md:flex items-center w-56 lg:w-72">
            <Search className="absolute left-3 w-4 h-4 text-purple-400 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search hackathons, cities..."
              className="w-full pl-9 pr-8 py-1.5 rounded-full bg-slate-950/80 border border-purple-900/40 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner"
            />
            {filters.search && (
              <button onClick={() => handleFilterChange(prev => ({ ...prev, search: '' }))} className="absolute right-2.5 text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Live Metrics */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-3 text-xs font-mono-num font-bold">
            <span className="text-emerald-400 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {stats.total} Live
            </span>
            <span className="text-amber-400 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/50 border border-amber-500/30">
              <Flame className="w-3.5 h-3.5" />
              {stats.closingToday} Urgent
            </span>
          </div>

          <button
            onClick={handleLocateMe}
            disabled={locating}
            title="Locate me"
            className="p-2 rounded-full bg-slate-950/80 border border-purple-500/40 text-purple-300 hover:text-white hover:bg-purple-600/30 transition-all shadow-md"
          >
            <Crosshair className={`w-4 h-4 ${locating ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            title="Filter options"
            className="p-2 rounded-full bg-slate-950/80 border border-purple-500/40 text-slate-300 hover:text-white hover:bg-purple-600/30 transition-all shadow-md"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3. FLOATING LEFT SIDEBAR (Map Mode Only) */}
      {viewMode === 'map' && (
        <aside className="fixed top-20 left-3 sm:top-20 sm:left-4 md:left-6 lg:left-8 bottom-6 z-30 w-72 sm:w-80 md:w-84 max-h-[calc(100vh-6rem)] hidden md:flex flex-col bg-[#0D1224]/85 backdrop-blur-2xl border border-purple-500/30 rounded-2xl sm:rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(139,92,246,0.15)] overflow-hidden transition-all duration-300">
          <div className="p-4 border-b border-purple-900/30 space-y-2 bg-slate-950/40 shrink-0">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-purple-400" /> Discovery Controls
              </h4>
              <span className="text-[10px] font-bold text-purple-400 font-mono-num px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/30">
                {filteredHackathons.length} Events
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-300 pt-1">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#00FFA3]" /> Open</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Closing Soon</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#4CC9F0]" /> Online</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" /> Featured</div>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="p-4 space-y-4 border-b border-purple-900/30 shrink-0 bg-slate-950/20">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
              <div className="flex flex-wrap gap-1">
                {(['all', 'open', 'closing_soon', 'closed'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleFilterChange(prev => ({ ...prev, status: st }))}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize border transition-all ${
                      filters.status === st
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                        : 'bg-slate-950/60 text-slate-400 border-purple-900/30 hover:text-white'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category Tags</label>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto scrollbar-none">
                {CATEGORY_TAGS.map((tag) => {
                  const selected = filters.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        handleFilterChange(prev => ({
                          ...prev,
                          tags: selected ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
                        }));
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                        selected
                          ? 'bg-purple-600 text-white border-purple-400'
                          : 'bg-slate-950/60 text-slate-400 border-purple-900/30 hover:text-white'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-300 font-medium">Online Events Only</span>
              <button
                onClick={() => handleFilterChange(prev => ({ ...prev, onlineOnly: !prev.onlineOnly }))}
                className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                  filters.onlineOnly ? 'bg-purple-600' : 'bg-slate-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  filters.onlineOnly ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Results List or Empty State */}
          <div className="flex-1 p-3 space-y-2 overflow-y-auto scrollbar-none">
            {loading ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Loading map hackathons...</p>
              </div>
            ) : filteredHackathons.length > 0 ? (
              filteredHackathons.map((h) => {
                const isSelected = selectedHackathon?.id === h.id;
                const status = getMarkerStatus(h);
                const color = MARKER_COLORS[status];

                return (
                  <div
                    key={h.id}
                    onClick={() => {
                      setSelectedHackathon(h);
                      setBottomSheetOpen(true);
                      updateUrlParams(filters, viewMode, h.id);
                      if (h.latitude && h.longitude && mapRef.current) {
                        mapRef.current.flyTo([Number(h.latitude), Number(h.longitude)], 12, { duration: 1 });
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                      isSelected
                        ? 'border-purple-500 bg-purple-950/60 shadow-lg'
                        : 'border-purple-900/20 bg-slate-950/40 hover:border-purple-500/40 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-white truncate">{h.title}</h5>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <MapPin className="w-3 h-3 text-purple-400 shrink-0" />
                      <span className="truncate">{h.is_online ? 'Online' : h.location_city || 'In-Person'}</span>
                      {h.prize_pool && (
                        <span className="ml-auto text-amber-300 font-mono-num">{h.prize_pool}</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 space-y-3 px-4">
                <div className="w-12 h-12 rounded-full bg-purple-950/50 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">No events match filters</p>
                  <p className="text-[11px] text-slate-400 mt-1">Try resetting search query, status, or timeline slider.</p>
                </div>
                <button
                  onClick={() => {
                    setTimelineDays(180);
                    handleFilterChange(() => ({ search: '', tags: [], onlineOnly: false, prizeMin: 0, status: 'all' }));
                  }}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* 4. LIST & CALENDAR OVERLAY VIEWS (Only rendered when viewMode is NOT 'map') */}
      {viewMode !== 'map' && (
        <div className="absolute inset-0 z-20 pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-[1600px] w-full mx-auto h-full overflow-y-auto scrollbar-none bg-[#060816]/95 backdrop-blur-3xl">
          {viewMode === 'list' && (
            <div className="space-y-6 pt-4 pb-12">
              <div className="flex items-center justify-between border-b border-purple-900/30 pb-4">
                <h3 className="text-xl sm:text-2xl font-black text-white">Ranked Discovery List</h3>
                <span className="text-xs sm:text-sm font-bold text-purple-400 font-mono-num">{filteredHackathons.length} hackathons found</span>
              </div>

              {filteredHackathons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredHackathons.map((h) => (
                    <HackathonCard
                      key={h.id}
                      hackathon={h as unknown as Hackathon}
                      isSaved={savedIds.includes(h.id)}
                      onToggleSave={handleToggleSave}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 space-y-4">
                  <p className="text-base font-semibold">No hackathons match your filter criteria.</p>
                  <button
                    onClick={() => handleFilterChange(() => ({ search: '', tags: [], onlineOnly: false, prizeMin: 0, status: 'all' }))}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>
          )}

          {viewMode === 'calendar' && (
            <div className="space-y-6 pt-4 pb-12">
              <div className="flex items-center justify-between border-b border-purple-900/30 pb-4">
                <h3 className="text-xl sm:text-2xl font-black text-white">Hackathon Event Calendar</h3>
                <span className="text-xs sm:text-sm font-bold text-purple-400 font-mono-num">Event Schedule</span>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 pb-2">
                <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 31 }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateStr = `-${dayNum < 10 ? '0' + dayNum : dayNum}`;
                  const dayEvents = filteredHackathons.filter(h => h.start_date.includes(dateStr));

                  return (
                    <div key={dayNum} className="min-h-[90px] p-2 rounded-xl bg-slate-950/80 border border-purple-900/30 flex flex-col justify-between">
                      <span className="text-xs font-bold text-slate-400 font-mono-num">{dayNum}</span>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => {
                              setSelectedHackathon(ev);
                              setBottomSheetOpen(true);
                              updateUrlParams(filters, viewMode, ev.id);
                            }}
                            className="p-1 rounded text-[10px] font-semibold bg-purple-950/80 text-purple-200 border border-purple-500/30 truncate cursor-pointer hover:bg-purple-900/80 transition-colors"
                          >
                            {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[9px] font-bold text-purple-400">+{dayEvents.length - 2} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. FLOATING BOTTOM TIMELINE CONTROLLER (Map Mode Only) */}
      {viewMode === 'map' && (
        <div className="fixed bottom-4 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto sm:min-w-[460px] z-30 bg-[#0D1224]/90 backdrop-blur-2xl rounded-2xl sm:rounded-full px-5 py-2.5 border border-purple-500/30 shadow-2xl flex items-center justify-between gap-4">
          <span className="text-xs font-bold text-purple-300 shrink-0 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-purple-400" /> Timeline:
          </span>

          <input
            type="range"
            min={7}
            max={180}
            step={7}
            value={timelineDays}
            onChange={(e) => setTimelineDays(Number(e.target.value))}
            className="w-full accent-purple-500 bg-slate-900 rounded-lg h-1.5 cursor-pointer"
          />

          <span className="text-xs font-bold text-slate-300 font-mono-num shrink-0">
            {timelineDays >= 180 ? 'All 6 Months' : `Next ${timelineDays} Days`}
          </span>
        </div>
      )}

      {/* 6. HACKATHON DETAIL DRAWER MODAL */}
      {bottomSheetOpen && selectedHackathon && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-xl bg-[#0D1224] border border-purple-500/40 rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-in-up">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  {selectedHackathon.is_online ? 'Worldwide Online' : selectedHackathon.location_city || 'In-Person'}
                </span>
                <h3 className="text-lg font-extrabold text-white mt-0.5">{selectedHackathon.title}</h3>
              </div>
              <button
                onClick={() => setBottomSheetOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{selectedHackathon.description}</p>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-purple-900/30">
                <span className="text-slate-400 text-[10px] uppercase block">Dates</span>
                <span className="font-bold text-white">{selectedHackathon.start_date}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-purple-900/30">
                <span className="text-slate-400 text-[10px] uppercase block">Prize Pool</span>
                <span className="font-bold text-amber-300 font-mono-num">{selectedHackathon.prize_pool || 'Prizes & Swag'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link
                href={`/hackathons/${selectedHackathon.id}`}
                className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs text-center transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>View Full Details</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 7. COMPACT FILTER DRAWER MODAL */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D1224] border border-purple-500/40 rounded-3xl p-6 space-y-4 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-purple-900/30">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Filter className="w-4 h-4 text-purple-400" /> Filter Hackathons
              </h3>
              <button onClick={() => setMobileDrawerOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'open', 'closing_soon', 'closed'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleFilterChange(prev => ({ ...prev, status: st }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border ${
                      filters.status === st
                        ? 'bg-purple-600 text-white border-purple-400'
                        : 'bg-slate-950 text-slate-400 border-purple-900/40 hover:text-white'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Categories</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_TAGS.map((tag) => {
                  const selected = filters.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        handleFilterChange(prev => ({
                          ...prev,
                          tags: selected ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
                        }));
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        selected ? 'bg-purple-600 text-white border-purple-400' : 'bg-slate-950 text-slate-400 border-purple-900/40 hover:text-white'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400 uppercase">Min Prize Pool</span>
                <span className="text-amber-300 font-mono-num">
                  {filters.prizeMin > 0 ? `₹${filters.prizeMin.toLocaleString()}+` : 'Any'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={500000}
                step={10000}
                value={filters.prizeMin}
                onChange={(e) => handleFilterChange(prev => ({ ...prev, prizeMin: Number(e.target.value) }))}
                className="w-full accent-purple-500 bg-slate-900 rounded-lg h-1.5 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-300 font-semibold">Online Events Only</span>
              <button
                onClick={() => handleFilterChange(prev => ({ ...prev, onlineOnly: !prev.onlineOnly }))}
                className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                  filters.onlineOnly ? 'bg-purple-600' : 'bg-slate-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  filters.onlineOnly ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => handleFilterChange(() => ({ search: '', tags: [], onlineOnly: false, prizeMin: 0, status: 'all' }))}
                className="px-4 py-3 rounded-xl bg-slate-900 border border-purple-900/40 text-slate-300 hover:text-white font-bold text-xs shrink-0"
              >
                Reset
              </button>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-colors"
              >
                Apply ({filteredHackathons.length} Results)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. TOAST */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900/90 border border-purple-500/40 text-purple-200 text-xs font-bold shadow-2xl backdrop-blur-md animate-fade-in-up">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[#060816] flex items-center justify-center text-slate-400 text-sm">Loading map platform...</div>}>
      <DiscoveryPlatformContent />
    </Suspense>
  );
}