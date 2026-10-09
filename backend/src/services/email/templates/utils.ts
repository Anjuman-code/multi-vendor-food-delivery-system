/**
 * Escapes characters for HTML output to prevent injection attacks.
 */
export function escapeHtml(unsafe: unknown): string {
  if (unsafe === null || unsafe === undefined) return '';
  const str = String(unsafe);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format currency amount in Bangladesh Taka (৳).
 * Consistent with frontend formatting rules.
 */
export function formatTaka(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const parts = Math.abs(safeAmount).toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = safeAmount < 0 ? '-' : '';
  return `${sign}৳${integerPart}.${parts[1]}`;
}

/**
 * Format a Date object into human-friendly time string (e.g., "3:45 PM").
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a Date object into a readable date string (e.g., "Oct 9, 2026").
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
