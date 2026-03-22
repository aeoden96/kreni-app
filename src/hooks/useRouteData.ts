/**
 * Hook for fetching route-specific data (shapes, stops, active trips)
 */

import { useState, useEffect, useRef } from 'react';
import type { RouteActiveTripsData } from '../utils/gtfs';
import { 
  fetchRouteShapes, 
  fetchRouteStops, 
  fetchRouteActiveTrips
} from '../utils/gtfs';

interface RouteData {
  shapes: Record<string, [number, number][]>;
  routeStops: string[];
  orderedStops: Record<string, string[]>;
  activeTripsData: RouteActiveTripsData | null;
}

interface UseRouteDataOptions {
  /** Data directory to load from (default: 'data'). Use 'data-train' for train mode. */
  dataDir?: string;
}

export function useRouteData(routeId: string | null, options: UseRouteDataOptions = {}) {
  const { dataDir = 'data' } = options;
  const [data, setData] = useState<RouteData | null>(null);
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
      fetchRouteActiveTrips(routeId, dataDir)
    ])
      .then(([shapes, stopsData, activeTripsData]) => {
        if (mounted) {
          // Filter shapes to only canonical ones (excludes deadhead/storage routes)
          const canonicalShapes = stopsData.canonicalShapes;
          const filteredShapes = canonicalShapes && canonicalShapes.length > 0
            ? Object.fromEntries(
                Object.entries(shapes).filter(([shapeId]) => canonicalShapes.includes(shapeId))
              )
            : shapes;
          
          const routeData: RouteData = {
            shapes: filteredShapes,
            routeStops: stopsData.stops,
            orderedStops: stopsData.orderedStops || {},
            activeTripsData
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
    shapes: data?.shapes || {},
    routeStops: data?.routeStops || [],
    orderedStops: data?.orderedStops || {},
    activeTripsData: data?.activeTripsData || null,
    loading,
    error
  };
}
