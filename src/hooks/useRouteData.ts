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
    orderedStops: query.data?.orderedStops || {},
    routeStops: query.data?.routeStops || [],
    shapes: query.data?.shapes || {},
  };
}
