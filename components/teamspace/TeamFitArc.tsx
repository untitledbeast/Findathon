'use client';

import React from 'react';
import { Users } from 'lucide-react';

interface TeamFitArcProps {
  score: number;
  size?: number;
}

export default function TeamFitArc({ score, size = 110 }: TeamFitArcProps) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  
  // Semicircle arc parameters
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2 + 10;
  
  // Arc length for semicircle (pi * r)
  const arcLength = Math.PI * radius;
  const dashOffset = arcLength - (clampedScore / 100) * arcLength;

  let strokeColor = '#94A3B8'; // Slate < 50
  if (clampedScore >= 80) {
    strokeColor = '#10B981'; // Emerald >= 80
  } else if (clampedScore >= 50) {
    strokeColor = '#F59E0B'; // Amber >= 50
  }

  return (
    <div className="relative flex flex-col items-center justify-center select-none" style={{ width: size, height: size * 0.75 }}>
      <svg
        width={size}
        height={size * 0.75}
        viewBox={`0 0 ${size} ${size * 0.75}`}
        className="overflow-visible"
      >
        {/* Background Arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Filled Score Arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={arcLength}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center Icon and Score */}
      <div className="absolute inset-x-0 bottom-2 flex flex-col items-center justify-center">
        <Users className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
}
