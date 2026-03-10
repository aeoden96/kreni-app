/**
 * Hook that batch-fetches routes for a list of sibling platform stops,
 * and detects which of those stops are terminus (odredišna) platforms.
 *
 * For each stop ID, fetches the stop timetable to obtain route IDs,
 * then resolves each to a Route via routesById. Returns:
 *   routeMap   — Map from stop ID → sorted Route[]
 *   terminusSet — Set of stop IDs where every route has that stop as its last stop
 */

import { useState, useEffect, useMemo } from 'react';
import type { Route } from '../utils/gtfs';
import { fetchStopTimetable, fetchRouteStops } from '../utils/gtfs';

function sortRoutes(routes: Route[]): Route[] {
  return routes.sort((a, b) => {
    const na = parseInt(a.shortName, 10);
    const nb = parseInt(b.shortName, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.shortName.localeCompare(b.shortName);
  });
}

export function useSiblingPlatformRoutes(
  stopIds: string[],
  routesById: Map<string, Route>,
): { routeMap: Map<string, Route[]>; terminusSet: Set<string> } {
  const [routeMap, setRouteMap] = useState<Map<string, Route[]>>(new Map());
  const [terminusSet, setTerminusSet] = useState<Set<string>>(new Set());

  // Stable key for the stopIds array to avoid unnecessary re-fetches
  const idsKey = useMemo(() => stopIds.slice().sort().join(','), [stopIds]);

  useEffect(() => {
    if (stopIds.length === 0) {
      setRouteMap(new Map());
      setTerminusSet(new Set());
      return;
    }

    let cancelled = false;

    Promise.all(
      stopIds.map(async (sid) => {
        try {
          const timetable = await fetchStopTimetable(sid);
          const routeIds = Object.keys(timetable);
          const resolved: Route[] = [];
          for (const routeId of routeIds) {
            const route = routesById.get(routeId);
            if (route) resolved.push(route);
          }

          // Detect terminus: fetch route topology and check if sid is last stop in every route
          const routeStopsResults = await Promise.all(
            routeIds.map(async (routeId) => {
              try { return await fetchRouteStops(routeId); } catch { return null; }
            }),
          );
          let routesInTopology = 0;
          let terminusRoutes = 0;
          for (const data of routeStopsResults) {
            if (!data?.orderedStops) continue;
            for (const stopList of Object.values(data.orderedStops)) {
              const idx = stopList.indexOf(sid);
              if (idx === -1) continue;
              routesInTopology++;
              if (idx === stopList.length - 1) terminusRoutes++;
              break; // one direction per route is enough
            }
          }
          const isTerminus = routesInTopology > 0 && terminusRoutes === routesInTopology;

          return { sid, routes: sortRoutes(resolved), isTerminus };
        } catch {
          return { sid, routes: [] as Route[], isTerminus: false };
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setRouteMap(new Map(results.map(r => [r.sid, r.routes])));
      setTerminusSet(new Set(results.filter(r => r.isTerminus).map(r => r.sid)));
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, routesById]);

  return { routeMap, terminusSet };
}
