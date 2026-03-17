/**
 * Lazily fetches `public/data/timetables/{routeId}.json` and caches it for the
 * lifetime of the page. The timetable maps tripId → [[stopId, sequence, timeMinutes], ...]
 * and is used to show the next N scheduled stops for a selected vehicle.
 */

import { useState, useEffect, useRef } from 'react';
import { fetchRouteTimetable } from '../utils/gtfs';
import type { RouteTimetable } from '../utils/gtfs';

export function useRouteTimetable(
  routeId: string | null,
  dataDir: string,
): RouteTimetable | null {
  const [timetable, setTimetable] = useState<RouteTimetable | null>(null);
  const prevKey = useRef<string | null>(null);

  useEffect(() => {
    if (!routeId) {
      setTimetable(null);
      return;
    }

    const key = `${dataDir}:${routeId}`;
    if (prevKey.current === key) return;
    prevKey.current = key;

    let mounted = true;
    fetchRouteTimetable(routeId, dataDir)
      .then((data) => {
        if (mounted) setTimetable(data);
      })
      .catch(() => {
        // Non-fatal — the next-stops feature degrades gracefully
      });

    return () => {
      mounted = false;
    };
  }, [routeId, dataDir]);

  return timetable;
}
