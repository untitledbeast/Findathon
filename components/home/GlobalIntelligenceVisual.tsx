'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Users, ShieldCheck, ArrowUpRight, Cpu } from 'lucide-react';

interface HubNode {
  id: string;
  name: string;
  country: string;
  x: number;
  y: number;
  hackathonsCount: number;
  activeDevelopers: number;
  primaryTrack: string;
}

const GLOBAL_HUBS: HubNode[] = [
  { id: 'bengaluru', name: 'Bengaluru', country: 'IN', x: 265, y: 195, hackathonsCount: 14, activeDevelopers: 420, primaryTrack: 'AI & Fullstack' },
  { id: 'sf', name: 'San Francisco', country: 'US', x: 75, y: 130, hackathonsCount: 22, activeDevelopers: 680, primaryTrack: 'LLMs & Agents' },
  { id: 'nyc', name: 'New York', country: 'US', x: 130, y: 120, hackathonsCount: 16, activeDevelopers: 510, primaryTrack: 'FinTech & Cloud' },
  { id: 'london', name: 'London', country: 'UK', x: 200, y: 100, hackathonsCount: 18, activeDevelopers: 490, primaryTrack: 'Web3 & AI' },
  { id: 'berlin', name: 'Berlin', country: 'DE', x: 220, y: 105, hackathonsCount: 11, activeDevelopers: 330, primaryTrack: 'Cybersecurity' },
  { id: 'singapore', name: 'Singapore', country: 'SG', x: 300, y: 220, hackathonsCount: 9, activeDevelopers: 290, primaryTrack: 'DeFi & Systems' },
  { id: 'tokyo', name: 'Tokyo', country: 'JP', x: 335, y: 145, hackathonsCount: 12, activeDevelopers: 380, primaryTrack: 'Robotics & Vision' },
];

export default function GlobalIntelligenceVisual() {
  const [activeHub, setActiveHub] = useState<HubNode>(GLOBAL_HUBS[0]);
  const [pulseIndex, setPulseIndex] = useState(0);

  // Periodic cycle of telemetry focus for subtle dynamism
  useEffect(() => {
    const timer = setInterval(() => {
      setPulseIndex((prev) => (prev + 1) % GLOBAL_HUBS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const currentFocus = GLOBAL_HUBS[pulseIndex] || activeHub;

  return (
    <div className="relative w-full max-w-lg lg:max-w-xl mx-auto select-none">
      {/* GLOWING ORBITAL BACKDROP */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/10 via-cyan-500/10 to-indigo-600/15 rounded-3xl blur-2xl -z-10" />

      <div className="relative rounded-3xl border border-purple-500/20 bg-slate-950/70 backdrop-blur-xl p-5 sm:p-6 shadow-2xl overflow-hidden">
        
        {/* TOP STATUS BAR */}
        <div className="flex items-center justify-between gap-3 pb-4 mb-2 border-b border-purple-900/30 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono font-bold text-slate-300 text-[11px] tracking-wider uppercase">
              Global Telemetry · Live
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300 text-[11px] font-mono">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span>Deterministic Match</span>
          </div>
        </div>

        {/* INTERACTIVE SVG NETWORK MAP */}
        <div className="relative w-full aspect-[400/270] rounded-2xl bg-[#060813] border border-purple-900/20 overflow-hidden flex items-center justify-center">
          
          {/* Subtle Grid Lines */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#8B5CF6_1px,transparent_1px)] [background-size:16px_16px]" />

          <svg
            viewBox="0 0 400 270"
            className="w-full h-full text-purple-500/30"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Concentric Coordinate Rings */}
            <circle cx="200" cy="135" r="110" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" className="text-purple-500/20 animate-spin" style={{ animationDuration: '60s' }} />
            <circle cx="200" cy="135" r="75" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" className="text-cyan-500/20 animate-spin" style={{ animationDuration: '40s', animationDirection: 'reverse' }} />
            <circle cx="200" cy="135" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-purple-500/20" />

            {/* Connecting Telemetry Arcs */}
            <path d="M75 130 Q130 90 200 100" fill="none" stroke="url(#lineGrad1)" strokeWidth="1.5" strokeDasharray="4 2" />
            <path d="M200 100 Q230 140 265 195" fill="none" stroke="url(#lineGrad2)" strokeWidth="1.5" strokeDasharray="4 2" />
            <path d="M265 195 Q285 205 300 220" fill="none" stroke="url(#lineGrad1)" strokeWidth="1.2" strokeDasharray="3 2" />
            <path d="M265 195 Q300 160 335 145" fill="none" stroke="url(#lineGrad2)" strokeWidth="1.2" strokeDasharray="3 2" />
            <path d="M130 120 Q165 105 220 105" fill="none" stroke="url(#lineGrad1)" strokeWidth="1.2" strokeDasharray="3 2" />
            <path d="M75 130 Q105 125 130 120" fill="none" stroke="url(#lineGrad2)" strokeWidth="1.5" />

            {/* Gradients */}
            <defs>
              <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00FFA3" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Hub Nodes */}
            {GLOBAL_HUBS.map((hub) => {
              const isSelected = activeHub.id === hub.id;
              const isPulsing = currentFocus.id === hub.id;

              return (
                <g
                  key={hub.id}
                  className="cursor-pointer group"
                  onClick={() => setActiveHub(hub)}
                >
                  {/* Ping Animation for Active Node */}
                  {(isSelected || isPulsing) && (
                    <circle
                      cx={hub.x}
                      cy={hub.y}
                      r="12"
                      fill="none"
                      stroke={isSelected ? '#00FFA3' : '#8B5CF6'}
                      strokeWidth="1"
                      className="animate-ping opacity-60"
                    />
                  )}

                  {/* Outer Ring */}
                  <circle
                    cx={hub.x}
                    cy={hub.y}
                    r={isSelected ? 6 : 4}
                    fill={isSelected ? '#8B5CF6' : '#1E1B4B'}
                    stroke={isSelected ? '#00E5FF' : '#6366F1'}
                    strokeWidth="1.5"
                    className="transition-all duration-300 group-hover:scale-125"
                  />

                  {/* Core Dot */}
                  <circle
                    cx={hub.x}
                    cy={hub.y}
                    r="2"
                    fill={isSelected ? '#FFFFFF' : '#A5B4FC'}
                  />

                  {/* Label */}
                  <text
                    x={hub.x}
                    y={hub.y - 8}
                    textAnchor="middle"
                    className={`text-[9px] font-mono font-bold transition-colors ${
                      isSelected ? 'fill-cyan-300 font-black' : 'fill-slate-400 group-hover:fill-slate-200'
                    }`}
                  >
                    {hub.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* FLOATING TELEMETRY CARD */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:left-3 sm:right-3 p-2.5 rounded-xl bg-slate-950/90 border border-purple-500/30 backdrop-blur-md flex items-center justify-between text-xs transition-all shadow-lg">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-900/50 text-purple-300">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div>
                <p className="font-bold text-white text-xs leading-none">
                  {currentFocus.name}, {currentFocus.country}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  Track: <span className="text-purple-300 font-bold">{currentFocus.primaryTrack}</span>
                </p>
              </div>
            </div>

            <Link
              href={`/map?city=${encodeURIComponent(currentFocus.name)}`}
              className="px-2.5 py-1 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0"
            >
              <span>Explore Map</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* BOTTOM REAL-TIME INSIGHTS ROW */}
        <div className="grid grid-cols-2 gap-3 pt-3">
          <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-900/40 space-y-0.5">
            <div className="flex items-center gap-1.5 text-[11px] text-purple-300 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified Evidence</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              GitHub + LeetCode verified scoring
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-900/40 space-y-0.5">
            <div className="flex items-center gap-1.5 text-[11px] text-cyan-300 font-bold">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Team Intelligence</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Deterministic squad gap detection
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
