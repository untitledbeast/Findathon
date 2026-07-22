'use client';

import React, { useMemo } from 'react';

export default function AuroraBackground() {
  // Generate 80 deterministic star particles with memoization to prevent hydration mismatches
  const stars = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => {
      // Simple pseudo-random formula based on index
      const top = ((i * 37 + 13) % 100);
      const left = ((i * 59 + 7) % 100);
      const size = (i % 3 === 0) ? 2 : 1.5;
      const opacity = 0.2 + ((i * 17) % 65) / 100;
      const delay = ((i * 23) % 40) / 10;
      const duration = 2.5 + ((i * 11) % 30) / 10;
      const isPurple = i % 4 === 0;

      return {
        id: i,
        top: `${top}%`,
        left: `${left}%`,
        size: `${size}px`,
        opacity,
        delay: `${delay}s`,
        duration: `${duration}s`,
        color: isPurple ? '#A78BFA' : '#FFFFFF'
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#060816]">
      
      {/* AMBIENT AURORA BLURRED ORBS */}
      
      {/* Orb 1: Top-Left (Violet #8B5CF6 at 12%) */}
      <div
        className="absolute -top-24 -left-24 w-[600px] h-[600px] rounded-full blur-[120px] animate-aurora pointer-events-none"
        style={{
          background: '#8B5CF6',
          opacity: 0.12,
          willChange: 'transform'
        }}
      />

      {/* Orb 2: Top-Right (Blue #4CC9F0 at 10%, 5s delay) */}
      <div
        className="absolute -top-10 -right-20 w-[500px] h-[500px] rounded-full blur-[100px] animate-aurora pointer-events-none"
        style={{
          background: '#4CC9F0',
          opacity: 0.10,
          animationDelay: '5s',
          willChange: 'transform'
        }}
      />

      {/* Orb 3: Bottom-Center (Emerald #00FFA3 at 8%, 10s delay) */}
      <div
        className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full blur-[140px] animate-aurora pointer-events-none"
        style={{
          background: '#00FFA3',
          opacity: 0.08,
          animationDelay: '10s',
          willChange: 'transform'
        }}
      />

      {/* Orb 4: Center (Violet #8B5CF6 at 6%, 3s delay) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[80px] animate-aurora pointer-events-none"
        style={{
          background: '#8B5CF6',
          opacity: 0.06,
          animationDelay: '3s',
          willChange: 'transform'
        }}
      />

      {/* STAR FIELD PARTICLES */}
      <div className="absolute inset-0 z-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full animate-twinkle"
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              backgroundColor: star.color,
              opacity: star.opacity,
              animationDelay: star.delay,
              animationDuration: star.duration
            }}
          />
        ))}
      </div>

    </div>
  );
}
