'use client';

import React from 'react';
import { TimelineDTO } from '@/lib/domain/dtos/hackathon.dto';
import { Clock } from 'lucide-react';

interface TimelineSectionProps {
  timeline: TimelineDTO[];
  registrationDeadline: string | null;
  startDate: string;
}

export function TimelineSection({ timeline, registrationDeadline, startDate }: TimelineSectionProps) {
  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8 border border-purple-900/30 space-y-6">
      <h3 className="text-xl font-bold text-white flex items-center gap-2">
        <Clock className="w-5 h-5 text-purple-400" /> Event Timeline
      </h3>

      <div className="relative pl-6 space-y-6 border-l-2 border-purple-900/40">
        {timeline && timeline.length > 0 ? (
          timeline.map((item, idx) => (
            <div key={item.id || idx} className="relative group">
              <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 ${item.isCompleted ? 'bg-purple-500 border-purple-300 shadow-[0_0_10px_rgba(139,92,246,0.8)]' : 'bg-slate-900 border-slate-600'}`} />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-purple-400">
                    {new Date(item.milestoneDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {new Date(item.milestoneDate).toDateString() === new Date().toDateString() && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white animate-pulse">
                      TODAY
                    </span>
                  )}
                </div>
                <h4 className="text-base font-bold text-white">{item.milestoneName}</h4>
                {item.description && <p className="text-xs text-slate-400">{item.description}</p>}
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="relative">
              <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-purple-500 border-2 border-purple-300" />
              <span className="text-xs font-mono font-bold text-purple-400">Registration Opens</span>
              <h4 className="text-base font-bold text-white">Event Announced</h4>
            </div>
            {registrationDeadline && (
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-rose-500 border-2 border-rose-300" />
                <span className="text-xs font-mono font-bold text-rose-400">
                  {new Date(registrationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <h4 className="text-base font-bold text-white">Registration Deadline</h4>
              </div>
            )}
            <div className="relative">
              <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-cyan-500 border-2 border-cyan-300" />
              <span className="text-xs font-mono font-bold text-cyan-400">
                {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <h4 className="text-base font-bold text-white">Hackathon Starts</h4>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
