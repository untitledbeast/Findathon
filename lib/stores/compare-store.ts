import { useState, useEffect } from 'react';

const COMPARE_STORAGE_KEY = 'findathon_compare_ids_v1';
const MAX_COMPARE_ITEMS = 3;

// Global Pub-Sub Event Listener for Compare Store State Synchronization
type Listener = (ids: string[]) => void;
const listeners = new Set<Listener>();

function getInitialCompareIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    const searchParams = new URLSearchParams(window.location.search);
    const qCompare = searchParams.get('compare');
    if (qCompare) return qCompare.split(',').filter(Boolean).slice(0, MAX_COMPARE_ITEMS);
  } catch (err) {
    console.error('Failed to read compare IDs:', err);
  }
  return [];
}

let globalCompareIds: string[] = getInitialCompareIds();

function notifyListeners() {
  listeners.forEach(fn => fn(globalCompareIds));
}

export function syncCompareToUrl(ids: string[]) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (ids.length > 0) {
    url.searchParams.set('compare', ids.join(','));
  } else {
    url.searchParams.delete('compare');
  }
  window.history.replaceState(null, '', url.toString());
}

export function toggleCompareId(id: string): string[] {
  const exists = globalCompareIds.includes(id);
  let updated: string[];

  if (exists) {
    updated = globalCompareIds.filter(item => item !== id);
  } else {
    if (globalCompareIds.length >= MAX_COMPARE_ITEMS) {
      updated = [...globalCompareIds.slice(1), id];
    } else {
      updated = [...globalCompareIds, id];
    }
  }

  globalCompareIds = updated;
  if (typeof window !== 'undefined') {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(updated));
    syncCompareToUrl(updated);
  }
  notifyListeners();
  return updated;
}

export function clearCompareIds(): void {
  globalCompareIds = [];
  if (typeof window !== 'undefined') {
    localStorage.removeItem(COMPARE_STORAGE_KEY);
    syncCompareToUrl([]);
  }
  notifyListeners();
}

export function useCompareStore() {
  const [compareIds, setCompareIds] = useState<string[]>(globalCompareIds);

  useEffect(() => {
    const handleUpdate = (newIds: string[]) => setCompareIds(newIds);
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  return {
    compareIds,
    toggleCompare: toggleCompareId,
    clearCompare: clearCompareIds,
    isComparing: (id: string) => compareIds.includes(id)
  };
}
