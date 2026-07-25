/**
 * ZET night lines.
 *
 * Four tram lines — 31, 32, 33, 34 — run only overnight, roughly from the last
 * day departure until the first one the next morning. They share the numbering
 * space with day lines and carry no marker in the GTFS feed, so the set is
 * listed here explicitly. If ZET ever renumbers night service or adds night
 * buses, this list is the one place to update.
 *
 * (For the record: the current feed backs the list up — 31/32/33/34 start
 * 94–100% of their trips inside the night window below, and no other route
 * exceeds 25%.)
 */

/** Route short names that only run overnight. */
export const NIGHT_LINE_SHORT_NAMES: ReadonlySet<string> = new Set(['31', '32', '33', '34']);

/** Minutes from midnight (inclusive) at which night service takes over. */
const NIGHT_START_MIN = 23 * 60;

/** Minutes from midnight (exclusive) at which day service resumes. */
const NIGHT_END_MIN = 5 * 60;

/** Whether a route runs only at night. */
export function isNightRoute(route: null | undefined | { shortName: string }): boolean {
  return !!route && NIGHT_LINE_SHORT_NAMES.has(route.shortName);
}

/**
 * Whether a minutes-from-midnight clock reading falls inside night-service
 * hours. Pair with `useCurrentTime()`, which supplies the same unit and honours
 * the debug time override.
 *
 * Night lines stay visible around the clock — someone planning tomorrow's trip
 * home at noon still needs to find them. This only drives the dimmed styling
 * that marks them as "not running right now".
 */
export function isNightTime(minutesFromMidnight: number): boolean {
  const m = ((minutesFromMidnight % 1440) + 1440) % 1440;
  return m >= NIGHT_START_MIN || m < NIGHT_END_MIN;
}
