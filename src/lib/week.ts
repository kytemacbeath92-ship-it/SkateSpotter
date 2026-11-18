/** Monday 00:00 UTC of the ISO week containing `at`. */
export function isoWeekStartUtc(at: Date = new Date()): Date {
  const date = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export function isoWeekEndUtc(at: Date = new Date()): Date {
  const start = isoWeekStartUtc(at);
  return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
}
