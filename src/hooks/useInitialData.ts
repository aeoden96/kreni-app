/**
 * Hook for fetching and caching initial GTFS data
 */

import { useEffect, useMemo, useState } from 'react';

import type { InitialData, Stop } from '../utils/gtfs';

import { checkCacheVersion } from '../stores/dataCache';
import { fetchInitialData } from '../utils/gtfs';

interface UseInitialDataOptions {
  /** Data directory to load from (default: 'data'). Use 'data-train' for train mode. */
  dataDir?: string;
}

export function useInitialData(options: UseInitialDataOptions = {}) {
  const { dataDir = 'data' } = options;
  const [data, setData] = useState<InitialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    // Check cache version for this specific manifest, then fetch data
    checkCacheVersion(`${dataDir}/manifest.json`)
      .then(() => fetchInitialData(dataDir))
      .then((initialData) => {
        if (mounted) {
          setData(initialData);
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
  }, [dataDir]);

  // Create lookup maps
  const stopsById = useMemo(() => {
    if (!data) return new Map<string, Stop>();
    return new Map(data.stops.map((stop) => [stop.id, stop]));
  }, [data]);

  const routesById = useMemo(() => {
    if (!data) return new Map();
    return new Map(data.routes.map((route) => [route.id, route]));
  }, [data]);

  return {
    calendar: data?.calendar || {},
    error,
    feedEndDate: data?.feedEndDate,
    feedStartDate: data?.feedStartDate,
    feedVersion: data?.feedVersion,
    loading,
    routes: data?.routes || [],
    routesById,
    stops: data?.stops || [],
    stopsById,
  };
}
