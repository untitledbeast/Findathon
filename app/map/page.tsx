'use client';

import React, { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import HackathonCard from '@/components/HackathonCard';
import MapMarkerPreview from '@/components/MapMarkerPreview';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/components/AuthModal';
import { discoveryEngine } from '@/lib/discovery-engine';
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
  Bell,
  Bookmark,
  ExternalLink,
  SlidersHorizontal,
  Crosshair,
  Layers,
  Clock,
  Flame,
  Sparkles
} from 'lucide-react';

// Dynamic SSR-disabled Leaflet Components
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
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();

  // Leaflet ESM Module Instance
  const [L, setL] = useState<typeof import('leaflet') | null>(null);

  // Primary Data & View State
  const [hackathons, setHackathons] = useState<MapHackathon[]>([]);
  // Lazy state initializers reading from URL searchParams
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
  const [selectedHackathon, setSelectedHackathon] = useState<MapHackathon | null>(null);
  const [hoveredHackathon, setHoveredHackathon] = useState<MapHackathon | null>(null);
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [savedIds, setSavedIds] = useState<string[]>([]);
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

  // Load Leaflet dynamically via ESM import
  useEffect(() => {
    import('leaflet').then(m => setL(m));
  }, []);

  // Load Hackathons via Unified Discovery Engine & Centralized Storage Service
  useEffect(() => {
    async function loadData() {
      const data = await discoveryEngine.discover();
      setHackathons(data);
      setSavedIds(storageService.getSavedIds());

      // Selected hackathon via URL ID parameter if present
      const targetId = searchParams.get('id');
      if (targetId) {
        const found = data.find(item => item.id === targetId);
        if (found) {
          setSelectedHackathon(found);
          setBottomSheetOpen(true);
        }
      }
    }
    loadData();
  }, [searchParams]);

  // Update URL Search Parameters whenever filters change
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

  // Filtered & Ranked Hackathons Computation
  const filteredHackathons = useMemo(() => {
    return hackathons.filter(h => {
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const matchTitle = h.title.toLowerCase().includes(q);
        const matchCity = h.location_city?.toLowerCase().includes(q) || false;
        const matchOrganizer = h.organizer?.toLowerCase().includes(q) || false;
        const matchTags = h.tags?.some(t => t.toLowerCase().includes(q)) || false;
        if (!matchTitle && !matchCity && !matchOrganizer && !matchTags) return false;
      }

      const status = getMarkerStatus(h);
      if (filters.status === 'open' && status !== 'open' && status !== 'featured' && status !== 'verified') return false;
      if (filters.status === 'closing_soon' && status !== 'closing_soon') return false;
      if (filters.status === 'closed' && status !== 'closed') return false;

      if (filters.onlineOnly && !h.is_online) return false;

      if (filters.tags.length > 0) {
        const hasTag = filters.tags.some(ft =>
          h.tags?.some(t => t.toLowerCase().includes(ft.toLowerCase()))
        );
        if (!hasTag) return false;
      }

      if (filters.prizeMin > 0 && (h.prize_amount || 0) < filters.prizeMin) return false;

      if (timelineDays < 180) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + timelineDays);
        if (new Date(h.start_date) > targetDate) return false;
      }

      if (userLocation && radiusKm && h.latitude && h.longitude) {
        const dist = h.distance_km !== undefined
          ? h.distance_km
          : calculateDist(userLocation.lat, userLocation.lng, h.latitude, h.longitude);
        if (dist > radiusKm) return false;
      }

      return true;
    });
  }, [hackathons, filters, timelineDays, userLocation, radiusKm]);

  // Live Metrics
  const stats = useMemo(() => ({
    total: filteredHackathons.length,
    closingToday: filteredHackathons.filter(h => getDaysLeft(h.registration_deadline) <= 1 && getDaysLeft(h.registration_deadline) >= 0).length,
    online: filteredHackathons.filter(h => h.is_online).length,
    featured: filteredHackathons.filter(h => h.is_featured || h.is_verified).length
  }), [filteredHackathons]);

  // Cluster Computation for Map View
  const clusters = useMemo(() => {
    return clusterHackathons(filteredHackathons, 6);
  }, [filteredHackathons]);

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
        setRadiusKm(50);
        setLocating(false);

        if (mapRef.current) {
          mapRef.current.flyTo([coords.lat, coords.lng], 10, { duration: 1.5 });
        }
        showToast('Located! Showing hackathons within 50km radius.');
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

  const handleFollowArea = (areaName: string) => {
    if (!user) {
      openAuthModal();
      return;
    }
    showToast(`Subscribed! You will receive notifications for events in ${areaName}`);
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

  // Leaflet Custom Marker Icons using imported Leaflet module
  const createDivIcon = (hackathon: MapHackathon) => {
    if (!L) return undefined;
    const isSelected = selectedHackathon?.id === hackathon.id;
    const status = getMarkerStatus(hackathon);
    const color = MARKER_COLORS[status];
    const glow = MARKER_GLOW[status];
    const size = isSelected ? 22 : 16;

    const html = `
      <div style="
        width: ${size}px; height: ${size}px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid rgba(255,255,255,0.9);
        box-shadow: 0 0 ${isSelected ? '20px' : '10px'} ${glow}, 0 0 0 ${isSelected ? '6px' : '3px'} ${color}33;
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
    const size = count > 50 ? 46 : count > 10 ? 38 : 32;

    const html = `
      <div style="
        width: ${size}px; height: ${size}px;
        border-radius: 50%;
        background: rgba(6, 8, 22, 0.92);
        border: 2px solid #8B5CF6;
        box-shadow: 0 0 15px rgba(139, 92, 246, 0.5);
        display: flex; align-items: center; justify-content: center;
        color: white; font-size: ${count > 99 ? '10px' : '12px'};
        font-family: 'JetBrains Mono', monospace;
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
    <div className="h-screen w-screen flex flex-col bg-[#060816] text-[#F6F8FC] overflow-hidden selection:bg-purple-600 selection:text-white">

      {/* TOP BAR NAVIGATION */}
      <header className="h-14 bg-[#0D1224]/90 backdrop-blur-xl border-b border-purple-500/20 px-4 sm:px-6 flex items-center justify-between gap-4 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-purple-400 group-hover:rotate-12 transition-transform text-lg">✦</span>
            <span className="text-base font-extrabold tracking-tight text-white">
              Find<span className="text-gradient">athon</span>
            </span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
            <MapIcon className="w-3 h-3" /> Discovery Map
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-full glass-card border border-purple-900/40">
            <button
              onClick={() => handleViewModeChange('map')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'map' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Map</span>
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'list' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => handleViewModeChange('calendar')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'calendar' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Calendar</span>
            </button>
          </div>

          <div className="relative hidden md:flex items-center w-64">
            <Search className="absolute left-3 w-4 h-4 text-purple-400 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search hackathons, cities..."
              className="w-full pl-9 pr-8 py-1.5 rounded-full bg-slate-950/80 border border-purple-900/40 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            {filters.search && (
              <button onClick={() => handleFilterChange(prev => ({ ...prev, search: '' }))} className="absolute right-2.5 text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3 text-xs font-mono-num font-bold">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {stats.total} Live
            </span>
            <span className="text-amber-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              {stats.closingToday} Closing Soon
            </span>
          </div>

          <button
            onClick={handleLocateMe}
            disabled={locating}
            title="Locate me"
            className="p-2 rounded-full glass-card border border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-600/30 transition-all"
          >
            <Crosshair className={`w-4 h-4 ${locating ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="md:hidden p-2 rounded-full glass-card border border-purple-500/30 text-slate-300"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN BODY AREA */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* LEFT SIDEBAR FILTERS & LIST */}
        <aside className="w-72 bg-[#060816]/90 backdrop-blur-xl border-r border-purple-900/30 hidden md:flex flex-col z-20 shrink-0 overflow-y-auto scrollbar-none">
          
          <div className="p-4 border-b border-purple-900/20 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-400" /> Map Legend
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-300">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#00FFA3]" /> Open</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Closing Soon</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#4CC9F0]" /> Online</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" /> Featured</div>
            </div>
          </div>

          <div className="p-4 space-y-4 border-b border-purple-900/20">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
              <div className="flex flex-wrap gap-1">
                {(['all', 'open', 'closing_soon', 'closed'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleFilterChange(prev => ({ ...prev, status: st }))}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize border transition-all ${
                      filters.status === st
                        ? 'bg-purple-600 text-white border-purple-400'
                        : 'glass-card text-slate-400 border-purple-900/30 hover:text-white'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category Tags</label>
              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto scrollbar-none">
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
                          : 'glass-card text-slate-400 border-purple-900/30 hover:text-white'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="text-slate-400 uppercase tracking-wider">Min Prize Pool</span>
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

          <div className="flex-1 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Results ({filteredHackathons.length})</span>
              {userLocation && <span className="text-[10px] text-cyan-400 font-mono-num">Near me (50km)</span>}
            </div>

            {filteredHackathons.length > 0 ? (
              <div className="space-y-2">
                {filteredHackathons.map((h) => {
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
                          mapRef.current.flyTo([h.latitude, h.longitude], 12, { duration: 1 });
                        }
                      }}
                      className={`p-3 rounded-xl glass-card border transition-all cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'border-purple-500 bg-purple-950/40 shadow-lg'
                          : 'border-purple-900/20 hover:border-purple-500/40 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-xs font-bold text-white truncate">{h.title}</h5>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <MapPin className="w-3 h-3 text-purple-400 shrink-0" />
                        <span className="truncate">{h.is_online ? 'Online' : h.location_city || 'In-Person'}</span>
                        {h.distance_km !== undefined && (
                          <span className="ml-auto text-cyan-300 font-mono-num">{h.distance_km}km</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <p>No hackathons match criteria</p>
                <button
                  onClick={() => handleFilterChange(() => ({ search: '', tags: [], onlineOnly: false, prizeMin: 0, status: 'all', difficulty: '' }))}
                  className="px-3 py-1 rounded-lg bg-purple-600 text-white font-bold text-[11px]"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER VIEWPORT CONTAINER */}
        <main className="flex-1 relative h-full w-full">
          {viewMode === 'map' && (
            <div className="h-full w-full relative">
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
                  if (!hackathon || !hackathon.latitude || !hackathon.longitude) return null;

                  return (
                    <Marker
                      key={hackathon.id}
                      position={[hackathon.latitude, hackathon.longitude]}
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

              <div className="absolute bottom-4 left-4 right-4 sm:left-12 sm:right-12 z-30 glass-card rounded-2xl p-3 border border-purple-500/30 flex items-center justify-between gap-4 bg-[#0D1224]/90 backdrop-blur-md">
                <span className="text-xs font-bold text-purple-300 shrink-0 flex items-center gap-1">
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
            </div>
          )}

          {viewMode === 'list' && (
            <div className="h-full w-full overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-white">Ranked Discovery List</h3>
                <span className="text-xs font-bold text-purple-400 font-mono-num">{filteredHackathons.length} hackathons</span>
              </div>

              {filteredHackathons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <div className="py-16 text-center text-slate-400">
                  <p>No hackathons match criteria</p>
                </div>
              )}
            </div>
          )}

          {viewMode === 'calendar' && (
            <div className="h-full w-full overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-white">Hackathon Event Calendar</h3>
                <span className="text-xs font-bold text-purple-400 font-mono-num">July 2026</span>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 pb-2">
                <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 31 }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateStr = `2026-07-${dayNum < 10 ? '0' + dayNum : dayNum}`;
                  const dayEvents = filteredHackathons.filter(h => h.start_date.startsWith(dateStr));

                  return (
                    <div key={dayNum} className="min-h-[90px] p-2 rounded-xl glass-card border border-purple-900/20 flex flex-col justify-between">
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
                            className="p-1 rounded text-[10px] font-semibold bg-purple-950/80 text-purple-200 border border-purple-500/30 truncate cursor-pointer"
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

          {/* BOTTOM SHEET */}
          {selectedHackathon && (
            <div className={`absolute bottom-0 left-0 right-0 z-40 glass-card rounded-t-3xl border-t border-purple-500/40 bg-[#0D1224]/95 backdrop-blur-2xl transition-transform duration-300 shadow-2xl ${
              bottomSheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-4rem)]'
            }`}>
              <div
                onClick={() => setBottomSheetOpen(!bottomSheetOpen)}
                className="h-14 px-6 flex items-center justify-between cursor-pointer border-b border-purple-900/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-1 rounded-full bg-purple-500/50 mx-auto" />
                  <span className="text-sm font-bold text-white truncate max-w-sm sm:max-w-md">
                    {selectedHackathon.title}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSave(selectedHackathon.id);
                    }}
                    className="p-2 rounded-full glass-card text-slate-300 hover:text-purple-300"
                  >
                    <Bookmark className={`w-4 h-4 ${savedIds.includes(selectedHackathon.id) ? 'fill-purple-500 text-purple-500' : ''}`} />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedHackathon(null);
                      updateUrlParams(filters, viewMode, null);
                    }}
                    className="p-1 rounded-full text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {bottomSheetOpen && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-96 overflow-y-auto">
                  <div className="space-y-3">
                    <img
                      src={selectedHackathon.cover_image_url || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop'}
                      alt={selectedHackathon.title}
                      className="w-full h-36 rounded-2xl object-cover border border-purple-900/30"
                    />
                    <div className="flex items-center justify-between text-xs">
                      {selectedHackathon.prize_pool && (
                        <span className="px-3 py-1 rounded-full font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">
                          🏆 {selectedHackathon.prize_pool}
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-full font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40">
                        {selectedHackathon.is_online ? 'Online' : 'In-Person'}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-purple-400">
                        Organized by {selectedHackathon.organizer}
                      </div>

                      <h3 className="text-xl font-black text-white">{selectedHackathon.title}</h3>
                      <p className="text-xs text-slate-300 line-clamp-2">{selectedHackathon.description}</p>

                      <div className="flex flex-wrap gap-4 text-xs text-slate-300 pt-1 font-medium">
                        <span>📅 {selectedHackathon.start_date} — {selectedHackathon.end_date}</span>
                        <span>📍 {selectedHackathon.is_online ? 'Worldwide (Online)' : selectedHackathon.location_city}</span>
                        <span>👥 Max Team: {selectedHackathon.participant_count || 4}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-purple-900/30 flex flex-wrap items-center justify-between gap-3">
                      <button
                        onClick={() => handleFollowArea(selectedHackathon.location_city || 'City')}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold glass-card text-purple-300 hover:text-white flex items-center gap-1.5"
                      >
                        <Bell className="w-3.5 h-3.5" /> Follow City
                      </button>

                      <div className="flex items-center gap-3">
                        <Link
                          href={`/hackathons/${selectedHackathon.id}`}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white"
                        >
                          View Details →
                        </Link>
                        <a
                          href={selectedHackathon.register_url}
                          target="_blank"
                          rel="noreferrer"
                          className="aurora-border px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1"
                        >
                          Register Now <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-50 px-4 py-2.5 rounded-2xl glass-card border border-purple-500/50 bg-[#0D1224]/95 text-xs font-bold text-purple-200 shadow-2xl animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default function DiscoveryPlatformPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-[#060816] text-purple-300 font-semibold text-sm">
        Loading Findathon Discovery Platform...
      </div>
    }>
      <DiscoveryPlatformContent />
    </Suspense>
  );
}
