/**
 * Centralized, fault-tolerant formatting utilities for Findathon.
 * Guarantees zero crashes when handling null, undefined, 0, or malformed data.
 */

/**
 * Safely format prize amounts without crashing on null/undefined.
 * Handles strings, numbers, zero amounts, and custom currency formatting.
 */
export function formatPrize(
  prizePool?: string | null,
  prizeAmount?: number | string | null,
  defaultCurrency = '$'
): string {
  // 1. If explicit prizePool string is already formatted (e.g. "$10,000" or "₹50,000")
  if (prizePool && typeof prizePool === 'string') {
    const trimmed = prizePool.trim();
    if (trimmed && trimmed.toLowerCase() !== 'null' && trimmed.toLowerCase() !== 'undefined') {
      return trimmed;
    }
  }

  // 2. If prizeAmount is supplied as a valid number
  if (typeof prizeAmount === 'number' && !isNaN(prizeAmount)) {
    if (prizeAmount === 0) return 'Free Registration';
    return `${defaultCurrency}${prizeAmount.toLocaleString('en-US')}`;
  }

  // 3. If prizeAmount is supplied as a numeric string
  if (typeof prizeAmount === 'string') {
    const numericOnly = prizeAmount.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(numericOnly);
    if (!isNaN(parsed) && parsed > 0) {
      return `${defaultCurrency}${parsed.toLocaleString('en-US')}`;
    }
  }

  return 'TBD';
}

/**
 * Safely format a date string into a readable format.
 * Never outputs "Invalid Date" or crashes.
 */
export function formatDate(
  dateStr?: string | Date | null,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
  fallback = 'TBD'
): string {
  if (!dateStr) return fallback;
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString('en-US', options);
  } catch {
    return fallback;
  }
}

/**
 * Safely format a start and end date range into a concise human-readable string.
 * e.g. "Aug 10–12, 2026" or "Aug 30 – Sep 2, 2026" or "Aug 10, 2026"
 */
export function formatDateRange(
  startStr?: string | Date | null,
  endStr?: string | Date | null,
  fallback = 'Dates Announced Soon'
): string {
  if (!startStr) return fallback;

  try {
    const start = typeof startStr === 'string' ? new Date(startStr) : startStr;
    if (isNaN(start.getTime())) return fallback;

    if (!endStr) {
      return formatDate(start);
    }

    const end = typeof endStr === 'string' ? new Date(endStr) : endStr;
    if (isNaN(end.getTime()) || start.toDateString() === end.toDateString()) {
      return formatDate(start);
    }

    const sameYear = start.getFullYear() === end.getFullYear();
    const sameMonth = sameYear && start.getMonth() === end.getMonth();

    if (sameMonth) {
      const month = start.toLocaleDateString('en-US', { month: 'short' });
      const year = start.getFullYear();
      return `${month} ${start.getDate()}–${end.getDate()}, ${year}`;
    } else if (sameYear) {
      const startMonth = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endMonth = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${startMonth} – ${endMonth}, ${start.getFullYear()}`;
    } else {
      const startFull = formatDate(start);
      const endFull = formatDate(end);
      return `${startFull} – ${endFull}`;
    }
  } catch {
    return fallback;
  }
}

/**
 * Calculates days remaining until a target date.
 */
export function getDaysUntil(targetDateStr?: string | Date | null): {
  days: number;
  isPast: boolean;
  isToday: boolean;
  label: string;
} {
  if (!targetDateStr) {
    return { days: 0, isPast: false, isToday: false, label: 'Open' };
  }

  try {
    const target = typeof targetDateStr === 'string' ? new Date(targetDateStr) : targetDateStr;
    if (isNaN(target.getTime())) {
      return { days: 0, isPast: false, isToday: false, label: 'Open' };
    }

    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { days: diffDays, isPast: true, isToday: false, label: 'Ended' };
    } else if (diffDays === 0) {
      return { days: 0, isPast: false, isToday: true, label: 'Ends Today' };
    } else if (diffDays === 1) {
      return { days: 1, isPast: false, isToday: false, label: '1 day left' };
    } else {
      return { days: diffDays, isPast: false, isToday: false, label: `${diffDays} days left` };
    }
  } catch {
    return { days: 0, isPast: false, isToday: false, label: 'Open' };
  }
}

/**
 * Sanitizes and validates external URLs for safe navigation.
 * Rejects javascript: or data: URIs and ensures https:// prefix when missing.
 */
export function normalizeUrl(url?: string | null, fallback = '#'): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#' || trimmed.toLowerCase() === 'null') return fallback;

  // Block dangerous protocol schemes
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return fallback;
  }

  // Prepend https:// if protocol is missing
  if (!/^https?:\/\//i.test(trimmed)) {
    // If it looks like a domain name or path
    if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  }

  return trimmed;
}

/**
 * Validates whether a URL is a valid external web link.
 */
export function isValidExternalUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const normalized = normalizeUrl(url);
  return normalized.startsWith('http://') || normalized.startsWith('https://');
}

/**
 * Returns a guaranteed valid image URL with fallback.
 */
export const DEFAULT_HACKATHON_COVER =
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200&auto=format&fit=crop';

export function getSafeImageUrl(url?: string | null, fallback = DEFAULT_HACKATHON_COVER): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return fallback;
  }
  return normalizeUrl(trimmed, fallback);
}

/**
 * Safely format ratings (e.g. 4.8 / 5.0) without crashing on null/undefined.
 */
export function formatRating(rating?: number | null, fallback = '5.0'): string {
  if (typeof rating !== 'number' || isNaN(rating)) return fallback;
  return Math.min(5, Math.max(0, rating)).toFixed(1);
}

/**
 * Safely format count numbers (e.g. 12,450) without crashing.
 */
export function formatCount(count?: number | null, fallback = '0'): string {
  if (typeof count !== 'number' || isNaN(count)) return fallback;
  return count.toLocaleString('en-US');
}
