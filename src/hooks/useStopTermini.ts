/**
 * Hook that resolves the terminus stop names for a given stop.
 *
 * For each route serving the stop, finds which direction of orderedStops
 * contains this stop, then reads the last stop in that direction list.
 * Returns up to 3 deduplicated terminus names. If more than 3 unique termini
 * are found, returns an empty array so callers can fall back to compass direction.
 */

import { useEffect, useState } from 'react';

import type { Route, Stop } from '../utils/gtfs';

import { fetchRouteStops, fetchStopTimetable } from '../utils/gtfs';

/** Maximum number of unique termini before we fall back to compass direction */
const MAX_TERMINI = 3;

export function useStopTermini(
  stopId: null | string,
  stopsById: Map<string, Stop>,
  /** routesById is accepted but not strictly needed — included for API symmetry */
  _routesById?: Map<string, Route>,
  options: { dataDir?: string } = {}
): { loading: boolean; termini: string[] } {
  const { dataDir = 'data' } = options;
  const [termini, setTermini] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stopId) {
      setTermini([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchStopTimetable(stopId, dataDir)
      .then(async (timetable) => {
        if (cancelled) return;

        const routeIds = Object.keys(timetable);

        // Fetch orderedStops for each route in parallel
        const settled = await Promise.all(
          routeIds.map(async (routeId) => {
            try {
              const data = await fetchRouteStops(routeId, dataDir);
              return data;
            } catch {
              return null;
            }
          })
        );

        if (cancelled) return;

        const seenNames = new Set<string>();
        const names: string[] = [];

        for (const routeStopsData of settled) {
          if (!routeStopsData?.orderedStops) continue;
          for (const stopList of Object.values(routeStopsData.orderedStops)) {
            const idx = stopList.indexOf(stopId);
            if (idx === -1) continue;
            // This direction contains our stop — grab the terminus (last stop)
            const terminusId = stopList[stopList.length - 1];
            if (!terminusId) continue;
            const terminusStop = stopsById.get(terminusId);
            if (!terminusStop) continue;
            // Deduplicate by name — multiple platforms can share the same stop name
            if (seenNames.has(terminusStop.name)) continue;
            seenNames.add(terminusStop.name);
            names.push(terminusStop.name);
          }
        }

        // If too many termini, return empty so callers fall back to compass direction
        setTermini(names.length > MAX_TERMINI ? [] : names);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setTermini([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [stopId, stopsById, dataDir]);

  return { loading, termini };
}
