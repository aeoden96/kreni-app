import { useEffect, useMemo, useState } from 'react';
import type { Route, RouteParentStopsIndex } from '../utils/gtfs';
import { fetchRouteParentStops } from '../utils/gtfs';

export interface DirectionResult {
  route: Route;
  directionKey: string;
  directionFilter: 'A' | 'B';
  fromIndex: number;
  toIndex: number;
  stopsBetween: number;
}

export function useDirections(
  fromParentId: string | null,
  toParentId: string | null,
  routesById: Map<string, Route>,
  options: { dataDir?: string } = {},
): { results: DirectionResult[]; loading: boolean } {
  const { dataDir = 'data' } = options;
  const [index, setIndex] = useState<RouteParentStopsIndex | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchRouteParentStops(dataDir)
      .then((data) => {
        if (cancelled) return;
        setIndex(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIndex(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dataDir]);

  const results = useMemo<DirectionResult[]>(() => {
    if (!index || !fromParentId || !toParentId || fromParentId === toParentId) return [];

    const items: DirectionResult[] = [];
    for (const [routeId, directions] of Object.entries(index)) {
      const route = routesById.get(routeId);
      if (!route) continue;

      const sortedDirections = Object.entries(directions).sort((a, b) => Number(a[0]) - Number(b[0]));
      for (const [directionKey, parentStops] of sortedDirections) {
        const fromIndex = parentStops.indexOf(fromParentId);
        const toIndex = parentStops.indexOf(toParentId);
        if (fromIndex === -1 || toIndex === -1 || toIndex <= fromIndex) continue;

        const directionIndex = sortedDirections.findIndex(([key]) => key === directionKey);
        items.push({
          route,
          directionKey,
          directionFilter: directionIndex <= 0 ? 'A' : 'B',
          fromIndex,
          toIndex,
          stopsBetween: toIndex - fromIndex - 1,
        });
      }
    }

    return items.sort((a, b) => {
      const typeRank = (routeType: number) => {
        if (routeType === 0) return 0; // tram
        if (routeType === 3) return 1; // bus
        if (routeType === 2) return 2; // rail
        return 3;
      };
      const typeDiff = typeRank(a.route.type) - typeRank(b.route.type);
      if (typeDiff !== 0) return typeDiff;

      if (a.stopsBetween !== b.stopsBetween) return a.stopsBetween - b.stopsBetween;

      const na = Number(a.route.shortName);
      const nb = Number(b.route.shortName);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.route.shortName.localeCompare(b.route.shortName);
    });
  }, [fromParentId, index, routesById, toParentId]);

  return { results, loading };
}
