'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Shield, LayoutDashboard, Inbox, List, Users, BarChart3, Star, ArrowLeft, Zap } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [stats, setStats] = useState<{ pending: number } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/?auth=required');
    } else if (!loading && profile && !['admin', 'moderator'].includes(profile.role || 'user')) {
      router.push('/');
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (profile && ['admin', 'moderator'].includes(profile.role || 'user')) {
      fetch('/api/v1/admin/stats')
        .then(res => res.json())
        .then(data => {
          if (data.success) setStats(data.data);
        })
        .catch(console.error);
    }
  }, [profile]);

  if (loading || !profile || !['admin', 'moderator'].includes(profile.role || 'user')) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  const links = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/quick-add', label: 'Quick Add', icon: Zap, iconColor: 'text-yellow-400 fill-yellow-400/20' },
    { href: '/admin/submissions', label: 'Submissions', icon: Inbox, badge: stats?.pending },
    { href: '/admin/hackathons', label: 'All Hackathons', icon: List },
    ...(profile?.role === 'admin' ? [
      { href: '/admin?tab=admins', label: 'Manage Admins', icon: Shield },
      { href: '/admin/users', label: 'Users', icon: Users }
    ] : []),
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/reviews', label: 'Reviews', icon: Star },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/80 border-r border-purple-900/30 flex flex-col">
        <div className="p-6 border-b border-purple-900/30">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-purple-400" />
            <h1 className="font-bold text-lg text-white">Findathon Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-xs text-slate-400 truncate">{profile?.full_name || (profile as any)?.fullName || 'Admin User'}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 uppercase tracking-wider">
              {profile?.role || 'admin'}
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-purple-600/20 text-purple-400' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${link.iconColor || ''}`} />
                <span className="flex-1">{link.label}</span>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-xs font-bold">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-purple-900/30">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Site
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
