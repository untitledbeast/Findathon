'use client';

import React, { useEffect, useState } from 'react';
import { Eye, Bookmark, Star, Search, Activity, Trophy } from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/admin/analytics')
      .then(res => res.json())
      .then(res => {
        if (res.success) setData(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'view': return <Eye className="w-4 h-4 text-blue-400" />;
      case 'bookmark': return <Bookmark className="w-4 h-4 text-purple-400" />;
      case 'review': return <Star className="w-4 h-4 text-yellow-400" />;
      case 'search': return <Search className="w-4 h-4 text-emerald-400" />;
      default: return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8">
        <div className="h-10 w-64 bg-slate-900 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 bg-slate-900 animate-pulse rounded-2xl" />
          <div className="h-96 bg-slate-900 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  // Calculate some aggregate stats from the fetched data
  const totalViews = data?.topHackathons?.reduce((sum: number, h: any) => sum + h.viewCount, 0) || 0;
  const maxViews = Math.max(...(data?.topHackathons?.map((h: any) => h.viewCount) || [1]));
  const maxEvents = Math.max(...(data?.eventsByDay?.map((e: any) => e.count) || [1]));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Platform Analytics</h1>
          <p className="text-slate-400">Activity and Engagement Metrics</p>
        </div>
      </div>

      {/* Events Over Time (CSS Chart) */}
      <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Events Over Time (Last 30 Days)</h2>
        <div className="h-48 flex items-end gap-1 px-2">
          {data?.eventsByDay?.map((day: any, i: number) => {
            const heightPercentage = Math.max(5, (day.count / maxEvents) * 100);
            return (
              <div 
                key={day.date} 
                className="flex-1 flex flex-col justify-end group relative"
                title={`${new Date(day.date).toLocaleDateString()}: ${day.count} events`}
              >
                <div 
                  className="bg-purple-600 rounded-t-sm opacity-80 group-hover:opacity-100 transition-all w-full"
                  style={{ height: `${heightPercentage}%` }}
                />
                {/* Custom Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 border border-slate-700 shadow-xl">
                  {day.count} events<br/>
                  <span className="text-slate-400">{new Date(day.date).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500 px-2 border-t border-slate-800 pt-2">
          <span>{data?.eventsByDay?.[0]?.date && new Date(data.eventsByDay[0].date).toLocaleDateString()}</span>
          <span>Today</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Most Viewed */}
        <div className="bg-slate-900/80 border border-purple-900/30 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-white">Most Viewed Hackathons</h2>
          </div>
          
          <div className="space-y-4">
            {data?.topHackathons?.map((h: any, index: number) => (
              <div key={h.id} className="relative">
                <div className="flex justify-between text-sm mb-1 z-10 relative">
                  <span className="font-medium text-slate-200 truncate pr-4">
                    <span className="text-slate-500 mr-2">{index + 1}.</span>
                    {h.title}
                  </span>
                  <span className="text-slate-400 shrink-0">{h.viewCount.toLocaleString()} views</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500/50 rounded-full"
                    style={{ width: `${(h.viewCount / maxViews) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {/* Top Searches */}
          <div className="bg-slate-900/80 border border-purple-900/30 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Top Search Queries</h2>
            <div className="flex flex-wrap gap-2">
              {data?.searchTerms?.map((t: any, i: number) => (
                <div 
                  key={i} 
                  className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm"
                >
                  <Search className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-slate-200">{t.term}</span>
                  <span className="text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded text-xs">
                    {t.count}
                  </span>
                </div>
              ))}
              {(!data?.searchTerms || data.searchTerms.length === 0) && (
                <p className="text-slate-500 text-sm italic">No search data available.</p>
              )}
            </div>
          </div>

          {/* Recent Feed */}
          <div className="bg-slate-900/80 border border-purple-900/30 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity Feed</h2>
            <div className="space-y-3">
              {data?.recentEvents?.slice(0, 10).map((event: any) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div className="mt-0.5 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                    {getEventIcon(event.event)}
                  </div>
                  <div>
                    <p className="text-sm text-slate-300 capitalize">
                      {event.event.replace('_', ' ')}
                      {event.metadata?.query && ` "${event.metadata.query}"`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(event.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
