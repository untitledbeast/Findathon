'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HackathonCard from '@/components/HackathonCard';
import { UniversityRepository } from '@/lib/domain/university.repository';
import { UniversityEntity, RichHackathon } from '@/lib/domain/hackathon.repository';
import { storageService } from '@/lib/storage-service';
import { useAuth } from '@/lib/auth-context';
import { Hackathon } from '@/lib/supabase';
import {
  MapPin,
  Trophy,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });

export default function UniversityDetailPage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';
  const { user } = useAuth();

  const [university, setUniversity] = useState<UniversityEntity | null>(null);
  const [hackathons, setHackathons] = useState<RichHackathon[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<string[]>(() => storageService.getSavedIds());
  const [L, setL] = useState<typeof import('leaflet') | null>(null);

  useEffect(() => {
    import('leaflet').then(m => setL(m));
  }, []);

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;

    UniversityRepository.getBySlug(slug).then(async uni => {
      if (!isMounted) return;
      setUniversity(uni);
      if (uni) {
        const hacks = await UniversityRepository.getHackathons(uni.id);
        if (isMounted) setHackathons(hacks);
        if (user) {
          const following = await UniversityRepository.isFollowing(user.id, uni.id);
          if (isMounted) setIsFollowing(following);
        }
      }
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [slug, user]);

  const handleToggleFollow = async () => {
    if (!user || !university) return;
    const result = await UniversityRepository.toggleFollow(user.id, university.id);
    setIsFollowing(result);
  };

  const handleToggleSave = (hId: string) => {
    const updated = storageService.toggleSavedId(hId);
    setSavedIds(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060816] text-[#F6F8FC]">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 pt-28 pb-16 space-y-8">
          <div className="h-64 bg-slate-900 rounded-3xl animate-pulse" />
          <div className="h-40 bg-slate-900 rounded-2xl animate-pulse" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!university) {
    return (
      <div className="min-h-screen bg-[#060816] text-[#F6F8FC] flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
          <h2 className="text-2xl font-black text-white">University Not Found</h2>
          <p className="text-sm text-slate-400">The campus profile you are looking for does not exist.</p>
          <Link href="/" className="px-6 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs">
            Return to Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const customMarkerIcon = L ? L.divIcon({
    className: 'custom-university-pin',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #8B5CF6;
        border: 2px solid #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: 0 0 15px rgba(139,92,246,0.8);
      ">
        🎓
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  }) : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-[#060816] text-[#F6F8FC] selection:bg-purple-600 selection:text-white">
      <Navbar savedCount={savedIds.length} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 space-y-8">

        {/* BREADCRUMB */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-purple-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        {/* HERO BANNER */}
        <div className="glass-card rounded-3xl p-8 border border-purple-500/30 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-4 z-10">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-purple-950 border-2 border-purple-500/50 flex items-center justify-center text-3xl font-black text-purple-300">
                🎓
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-white">{university.name}</h1>
                  {university.ranking && (
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-950 text-amber-300 border border-amber-500/40">
                      Ranked #{university.ranking}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  {university.city || 'India'}, {university.state || ''} • {university.country || 'India'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs font-mono font-bold pt-2">
              <span className="text-purple-400">{hackathons.length} Campus Hackathons</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400">Verified Campus Partner</span>
            </div>
          </div>

          <div className="flex items-center gap-3 z-10">
            <button
              onClick={handleToggleFollow}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all ${
                isFollowing
                  ? 'bg-purple-950 text-purple-300 border border-purple-500/40 hover:bg-rose-950 hover:text-rose-300'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              {isFollowing ? 'Following Campus' : '+ Follow Campus'}
            </button>

            {university.website && (
              <a
                href={university.website}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl glass-card text-slate-300 hover:text-white border border-purple-900/40"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* CAMPUS MAP EMBED SECTION */}
        {university.latitude && university.longitude && L && (
          <div className="glass-card rounded-3xl overflow-hidden border border-purple-900/30 p-2 space-y-2">
            <div className="px-4 pt-2 flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-purple-400" /> Campus Location Map
              </span>
              <span className="font-mono text-slate-400">
                {university.latitude.toFixed(4)}° N, {university.longitude.toFixed(4)}° E
              </span>
            </div>

            <div className="h-52 w-full rounded-2xl overflow-hidden">
              <MapContainer
                center={[Number(university.latitude), Number(university.longitude)]}
                zoom={14}
                style={{ width: '100%', height: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                {customMarkerIcon && (
                  <Marker
                    position={[Number(university.latitude), Number(university.longitude)]}
                    icon={customMarkerIcon}
                  />
                )}
              </MapContainer>
            </div>
          </div>
        )}

        {/* CAMPUS HACKATHONS GRID */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" /> Hackathons Organized at {university.short_name || university.name}
          </h3>

          {hackathons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hackathons.map(h => (
                <HackathonCard
                  key={h.id}
                  hackathon={h as unknown as Hackathon}
                  isSaved={savedIds.includes(h.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <p>No active hackathons found for this campus right now.</p>
            </div>
          )}
        </div>

      </main>

      <Footer />
    </div>
  );
}
