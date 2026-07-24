export function toISOUTC(date: string | Date): string {
  return new Date(date).toISOString();
}

export function isPast(dateStr: string): boolean {
  return new Date(dateStr).getTime() < Date.now();
}

export function isFuture(dateStr: string): boolean {
  return new Date(dateStr).getTime() > Date.now();
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
}
