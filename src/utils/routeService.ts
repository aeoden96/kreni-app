/**
 * Suspended lines.
 *
 * ZET does not pull a suspended line out of the feed — tram 13 kept its trips
 * and shapes right through its summer 2026 suspension and simply had no service
 * days until it came back. So a line can look completely ordinary in the app
 * while being one nobody can board for weeks.
 *
 * process_gtfs.py finds those holes (a week or longer, so an ordinary weekday-
 * only line idling over the weekend is not one) and writes them onto the route
 * as `serviceGaps`. Whether a gap is happening *now* is decided here, at render
 * time, because the built data is cached for up to a week and a flag baked in at
 * build time would outlive the date it was true for.
 */

import type { Route } from './gtfs';

/**
 * The gap a route is currently sitting in, or null if it is running.
 *
 * `until` is the day service resumes, so it reads directly as "ne prometuje do
 * …" and the route counts as running again on that date.
 */
export function getRouteSuspension(
  route: null | Route | undefined,
  now: Date
): null | { until: string } {
  if (!route?.serviceGaps?.length) return null;
  const today = toFeedDate(now);
  const gap = route.serviceGaps.find((g) => today >= g.from && today < g.until);
  return gap ? { until: gap.until } : null;
}

/** Parse a `YYYYMMDD` feed date into a local Date, for formatting. */
export function parseFeedDate(feedDate: string): Date {
  return new Date(
    Number(feedDate.slice(0, 4)),
    Number(feedDate.slice(4, 6)) - 1,
    Number(feedDate.slice(6, 8))
  );
}

/** `YYYYMMDD`, the form the pipeline and GTFS both use — sorts as a string. */
function toFeedDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
