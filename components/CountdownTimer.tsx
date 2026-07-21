'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string;
  label?: string;
}

export default function CountdownTimer({ targetDate, label = 'Registration Deadline' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.isExpired) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300">
        <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
        <span className="text-sm font-semibold">Event registration is underway or completed.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3 p-5 rounded-2xl bg-purple-950/40 border border-purple-800/40 backdrop-blur-md">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-300">
        <Clock className="w-4 h-4 text-purple-400 animate-pulse" />
        <span>{label}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
        
        {/* Days */}
        <div className="flex flex-col p-3 rounded-xl bg-slate-900/90 border border-purple-900/40">
          <span className="text-xl sm:text-2xl font-extrabold text-white">{timeLeft.days}</span>
          <span className="text-[10px] sm:text-xs text-purple-400 font-medium uppercase">Days</span>
        </div>

        {/* Hours */}
        <div className="flex flex-col p-3 rounded-xl bg-slate-900/90 border border-purple-900/40">
          <span className="text-xl sm:text-2xl font-extrabold text-white">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-[10px] sm:text-xs text-purple-400 font-medium uppercase">Hours</span>
        </div>

        {/* Minutes */}
        <div className="flex flex-col p-3 rounded-xl bg-slate-900/90 border border-purple-900/40">
          <span className="text-xl sm:text-2xl font-extrabold text-white">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-[10px] sm:text-xs text-purple-400 font-medium uppercase">Mins</span>
        </div>

        {/* Seconds */}
        <div className="flex flex-col p-3 rounded-xl bg-slate-900/90 border border-purple-900/40">
          <span className="text-xl sm:text-2xl font-extrabold text-purple-300">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-[10px] sm:text-xs text-purple-400 font-medium uppercase">Secs</span>
        </div>

      </div>
    </div>
  );
}
