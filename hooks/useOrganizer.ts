'use client';

import { useState, useEffect } from 'react';
import { OrganizerRepository } from '@/lib/domain/organizer.repository';
import { OrganizerEntity, RichHackathon } from '@/lib/domain/hackathon.repository';
import { useAuth } from '@/lib/auth-context';

export function useOrganizer(slug: string) {
  const { user } = useAuth();
  const [organizer, setOrganizer] = useState<OrganizerEntity | null>(null);
  const [hackathons, setHackathons] = useState<RichHackathon[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;

    OrganizerRepository.getBySlug(slug).then(async org => {
      if (!isMounted) return;
      setOrganizer(org);
      if (org) {
        const hacks = await OrganizerRepository.getHackathons(org.id);
        if (isMounted) setHackathons(hacks);
        if (user) {
          const following = await OrganizerRepository.isFollowing(user.id, org.id);
          if (isMounted) setIsFollowing(following);
        }
      }
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [slug, user]);

  const toggleFollow = async () => {
    if (!user || !organizer) return;
    const result = await OrganizerRepository.toggleFollow(user.id, organizer.id);
    setIsFollowing(result);
    setOrganizer(prev => prev ? ({
      ...prev,
      follower_count: prev.follower_count + (result ? 1 : -1)
    }) : null);
  };

  return { organizer, hackathons, isFollowing, toggleFollow, loading };
}
