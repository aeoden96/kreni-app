/**
 * Hook that resolves the Route objects serving a given stop.
 *
 * Fetches the stop timetable to obtain route IDs, then resolves each
 * to a Route via routesById. Routes are sorted numerically by shortName
 * to match the order shown in the spider-graph overlays.
 */

import { useEffect, useState } from 'react';

import type { Route } from '../utils/gtfs';

import { fetchStopTimetable } from '../utils/gtfs';

export function useStopRoutes(
  stopId: null | string,
  routesById: Map<string, Route>,
  options: { dataDir?: string } = {}
): { loading: boolean; routes: Route[] } {
  const { dataDir = 'data' } = options;
  const [routes, setRoutes] = useState<Route[]>([]);
  const [resolvedKey, setResolvedKey] = useState<null | string>(null);
  const key = stopId === null ? null : `${stopId}|${dataDir}`;

  // Derived, not a useState(false): the effect only runs after the first paint,
  // so a state flag reports "loaded" for one frame and callers flash empty
  // content before the skeleton appears.
  const loading = key !== null && resolvedKey !== key;

  useEffect(() => {
    if (!stopId) {
      setRoutes([]);
      setResolvedKey(null);
      return;
    }

    let cancelled = false;

    fetchStopTimetable(stopId, dataDir)
      .then((timetable) => {
        if (cancelled) return;

        const resolved: Route[] = [];
        for (const routeId of Object.keys(timetable)) {
          const route = routesById.get(routeId);
          if (route) resolved.push(route);
        }

        // Sort numerically by shortName (same order as spider graph badges)
        resolved.sort((a, b) => {
          const na = parseInt(a.shortName, 10);
          const nb = parseInt(b.shortName, 10);
          if (!isNaN(na) && !isNaN(nb)) return na - nb;
          return a.shortName.localeCompare(b.shortName);
        });

        setRoutes(resolved);
        setResolvedKey(key);
      })
      .catch(() => {
        if (!cancelled) {
          setRoutes([]);
          setResolvedKey(key);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [key, stopId, routesById, dataDir]);

  return { loading, routes };
}
