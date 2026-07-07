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
  const prevKey = useRef<null | string>(null);

  useEffect(() => {
    if (!routeId) {
      setTimetable(null);
      setLoading(false);
      return;
    }

    const key = `${dataDir}:${routeId}`;
    if (prevKey.current === key) return;
    prevKey.current = key;

    let mounted = true;
    setLoading(true);
    fetchRouteTimetable(routeId, dataDir)
      .then((data) => {
        if (mounted) {
          setTimetable(data);
          setLoading(false);
        }
      })
      .catch(() => {
        // Non-fatal — the next-stops feature degrades gracefully
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [routeId, dataDir]);

  return { data: timetable, loading };
}
