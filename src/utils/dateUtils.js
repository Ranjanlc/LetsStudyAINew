/**
 * Calendar date as YYYY-MM-DD in the user's local timezone.
 * Prefer this over toISOString().split('T')[0], which uses UTC and can shift the day.
 */
export function formatLocalDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
