/**
 * Calendar days as the student lives them.
 *
 * requiem: server/day-is-local
 * The server counts the student's local days, from the time zone this browser
 * sends; these helpers keep the browser's own day keys in step with it.
 */

/** 'YYYY-MM-DD' for a moment, in this browser's time zone. */
export function localDay(d = new Date()) {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')].join('-');
}

/** Whole days from today until a 'YYYY-MM-DD' day; negative once it has passed. */
export function daysUntil(day) {
  const [y, m, d] = day.split('-').map(Number);
  const [ty, tm, td] = localDay().split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
}
