/**
 * Hook for fetching route-specific data (shapes, stops, active trips)
 */

import { useEffect, useRef, useState } from 'react';

import type { RouteActiveTripsData } from '../utils/gtfs';

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
  const [data, setData] = useState<null | RouteData>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Cache loaded routes to avoid refetching; namespace by dataDir to prevent cross-dataset hits
  const cache = useRef<Map<string, RouteData>>(new Map());

  useEffect(() => {
    if (!routeId) {
      setData(null);
      setLoading(false);
      return;
    }

    // Cache key includes dataDir to avoid cross-dataset collisions
    const cacheKey = `${dataDir}:${routeId}`;
    const cached = cache.current.get(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    // Fetch all route data in parallel
    Promise.all([
      fetchRouteShapes(routeId, dataDir),
      fetchRouteStops(routeId, dataDir),
      fetchRouteActiveTrips(routeId, dataDir),
    ])
      .then(([shapes, stopsData, activeTripsData]) => {
        if (mounted) {
          // Filter shapes to only canonical ones (excludes deadhead/storage routes)
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

          cache.current.set(cacheKey, routeData);

          setData(routeData);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [routeId, dataDir]);

  return {
    activeTripsData: data?.activeTripsData || null,
    error,
    loading,
    orderedStops: data?.orderedStops || {},
    routeStops: data?.routeStops || [],
    shapes: data?.shapes || {},
  };
}
