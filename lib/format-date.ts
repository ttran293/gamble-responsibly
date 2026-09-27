const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2026-08-01` or an ISO timestamp → `Aug 1, 26`. */
export function formatDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return value;
  return `${months[month - 1]} ${day}, ${String(year).slice(-2)}`;
}

/** `2026-08-01T14:30:00.000Z` → `Aug 1, 26, 14:30 UTC`. Date-only values stay date-only. */
export function formatStamp(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/.exec(value);
  if (!match) return value;
  const day = formatDay(match[1]);
  return match[2] ? `${day}, ${match[2]} UTC` : day;
}
