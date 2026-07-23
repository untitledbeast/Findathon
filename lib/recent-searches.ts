'use client';

const RECENT_SEARCHES_KEY = 'findathon_recent_searches_v1';
const MAX_RECENT_SEARCHES = 6;

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read recent searches:', err);
    return [];
  }
}

export function addRecentSearch(query: string): string[] {
  if (typeof window === 'undefined') return [];
  const q = query.trim();
  if (!q) return getRecentSearches();

  try {
    const existing = getRecentSearches().filter(s => s.toLowerCase() !== q.toLowerCase());
    const updated = [q, ...existing].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save recent search:', err);
    return [];
  }
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (err) {
    console.error('Failed to clear recent searches:', err);
  }
}
