/**
 * Lazily fetches `public/data/timetables/{routeId}.json` and caches it for the
 * lifetime of the page. The timetable maps tripId → [[stopId, sequence, timeMinutes], ...]
 * and is used to show the next N scheduled stops for a selected vehicle.
 */

import { useEffect, useRef, useState } from 'react';

import type { RouteTimetable } from '../utils/gtfs';

import { fetchRouteTimetable } from '../utils/gtfs';

export function useRouteTimetable(
  routeId: null | string,
  dataDir: string
): { data: null | RouteTimetable; loading: boolean } {
  const [timetable, setTimetable] = useState<null | RouteTimetable>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Key of the request whose result we still want. Used *only* to discard
   * out-of-order responses — never to skip a fetch. Skipping on a key match
   * used to strand the hook at `{ data: null, loading: false }` whenever the
   * successful response was dropped (StrictMode's double-invoke, any remount)
   * or whenever the same route was selected, cleared, then selected again.
   * `fetchRouteTimetable` is memoised, so re-running is cheap.
   */
  const requestedKey = useRef<null | string>(null);

  useEffect(() => {
    if (!routeId) {
      requestedKey.current = null;
      setTimetable(null);
      setLoading(false);
      return;
    }

    const key = `${dataDir}:${routeId}`;
    requestedKey.current = key;
    setTimetable(null);
    setLoading(true);

    fetchRouteTimetable(routeId, dataDir)
      .then((data) => {
        if (requestedKey.current !== key) return;
        setTimetable(data);
        setLoading(false);
      })
      .catch(() => {
        // Non-fatal — the next-stops feature degrades gracefully
        if (requestedKey.current !== key) return;
        setLoading(false);
      });
  }, [routeId, dataDir]);

  return { data: timetable, loading };
}
