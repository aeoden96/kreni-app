/**
 * Hook for fetching route-specific data (shapes, stops, active trips)
 */

import { useQuery } from '@tanstack/react-query';

import type { RouteActiveTripsData } from '../utils/gtfs';

import { queryKeys } from '../api/queryKeys';
import { fetchRouteActiveTrips, fetchRouteShapes, fetchRouteStops } from '../utils/gtfs';

interface RouteData {
  activeTripsData: null | RouteActiveTripsData;
  orderedStops: Record<string, string[]>;
  routeStops: string[];
  shapes: Record<string, [number, number][]>;
}

// Stable empty fallbacks: returning fresh `{}` / `[]` literals on every render
// (the common no-route-selected case) gives these a new identity each time,
// which defeats memoization/`React.memo` in every consumer (notably MapView).
const EMPTY_ORDERED_STOPS: Record<string, string[]> = {};
const EMPTY_ROUTE_STOPS: string[] = [];
const EMPTY_SHAPES: Record<string, [number, number][]> = {};

interface UseRouteDataOptions {
  /** Data directory to load from (default: 'data'). Use 'data-train' for train mode. */
  dataDir?: string;
}

export function useRouteData(routeId: null | string, options: UseRouteDataOptions = {}) {
  const { dataDir = 'data' } = options;

  const query = useQuery({
    enabled: !!routeId,
    queryFn: async () => {
      if (!routeId) return null;

      const [shapes, stopsData, activeTripsData] = await Promise.all([
        fetchRouteShapes(routeId, dataDir),
        fetchRouteStops(routeId, dataDir),
        fetchRouteActiveTrips(routeId, dataDir),
      ]);

      const canonicalShapes = stopsData.canonicalShapes;
      const filteredShapes =
        canonicalShapes && canonicalShapes.length > 0
          ? Object.fromEntries(
              Object.entries(shapes).filter(([shapeId]) => canonicalShapes.includes(shapeId))
            )
          : shapes;

      const routeData: RouteData = {
        activeTripsData,
        orderedStops: stopsData.orderedStops || {},
        routeStops: stopsData.stops,
        shapes: filteredShapes,
      };

      return routeData;
    },
    queryKey: queryKeys.routeData.detail(dataDir, routeId as string),
    staleTime: Infinity,
  });

  return {
    activeTripsData: query.data?.activeTripsData || null,
    error: query.error as Error | null,
    loading: query.isLoading && !!routeId,
    orderedStops: query.data?.orderedStops ?? EMPTY_ORDERED_STOPS,
    routeStops: query.data?.routeStops ?? EMPTY_ROUTE_STOPS,
    shapes: query.data?.shapes ?? EMPTY_SHAPES,
  };
}
