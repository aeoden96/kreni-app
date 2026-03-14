/**
 * Hook that resolves the Route objects serving a given stop.
 *
 * Fetches the stop timetable to obtain route IDs, then resolves each
 * to a Route via routesById. Routes are sorted numerically by shortName
 * to match the order shown in the spider-graph overlays.
 */

import { useState, useEffect } from 'react';
import type { Route } from '../utils/gtfs';
import { fetchStopTimetable } from '../utils/gtfs';

export function useStopRoutes(
  stopId: string | null,
  routesById: Map<string, Route>,
  options: { dataDir?: string } = {}
): { routes: Route[]; loading: boolean } {
  const { dataDir = 'data' } = options;
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stopId) {
      setRoutes([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

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
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setRoutes([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [stopId, routesById, dataDir]);

  return { routes, loading };
}
