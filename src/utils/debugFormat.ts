/**
 * Small formatters shared by the debug panel tabs. Kept out of `format.ts`
 * because these are developer-facing (never translated, never user-visible).
 */

/** `-90` → `-1m 30s`, `45` → `45s` */
export function formatSignedSeconds(seconds: number): string {
  const abs = Math.abs(Math.round(seconds));
  if (abs < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const sign = seconds < 0 ? '-' : '';
  return `${sign}${m}m ${s}s`;
}

/** Age of a POSIX-seconds timestamp relative to `nowMs`, e.g. `12s ago` */
export function formatTimestampAge(posixSeconds: number, nowMs: number): string {
  return `${Math.round(nowMs / 1000 - posixSeconds)}s ago`;
}
