'use client';

import { useState, useEffect, useCallback } from 'react';
import { NotificationDTO } from '@/types';
import { notificationsApi } from '@/lib/api/notifications';
import { realtimeProvider } from '@/lib/realtime';
import { useAuth } from '@/lib/auth-context';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(user));
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setIsFetching(true);
    setError(null);
    try {
      const res = await notificationsApi.getUserNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    if (!user?.id) return;

    notificationsApi.getUserNotifications().then(res => {
      if (isMounted) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
        setTotal(res.total);
        setIsLoading(false);
      }
    }).catch(err => {
      if (isMounted) {
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
        setIsLoading(false);
      }
    });

    const interval = setInterval(fetchNotifications, 60000);

    const unsubscribe = realtimeProvider.subscribeToUserNotifications(user.id, (payload) => {
      const newNotif: NotificationDTO = {
        id: String(payload.id || `notif-${Date.now()}`),
        userId: String(payload.user_id || user.id),
        type: String(payload.type || 'info'),
        title: String(payload.title || 'New Notification'),
        body: String(payload.body || ''),
        isRead: false,
        metadata: (payload.metadata as Record<string, unknown>) || {},
        createdAt: String(payload.created_at || new Date().toISOString())
      };

      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubscribe();
    };
  }, [user, fetchNotifications]);

  const markRead = useCallback(async (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await notificationsApi.markRead(notificationId);
    } catch {
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead();
    } catch {
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  return {
    data: notifications,
    notifications,
    unreadCount: user ? unreadCount : 0,
    total,
    error,
    isLoading: user ? isLoading : false,
    isFetching,
    isSubmitting: false,
    isRefreshing: false,
    markRead,
    markAllRead,
    refresh: fetchNotifications,
    mutate: (updater: (prev: NotificationDTO[]) => NotificationDTO[]) => setNotifications(updater),
    invalidate: fetchNotifications,
    prefetch: () => {},
    reset: () => { setNotifications([]); setUnreadCount(0); setError(null); }
  };
}
