/**
 * Hook for fetching and caching initial GTFS data
 */

import { useEffect, useMemo, useState } from 'react';

import type { InitialData, Route, Stop } from '../utils/gtfs';

import { checkCacheVersion } from '../stores/dataCache';
import { fetchInitialData } from '../utils/gtfs';

/**
 * Stable identities for the pre-load window. Returning `{}` / `[]` inline handed
 * every render a fresh object, so consumers keying effects on them re-ran on
 * every render — `useCurrentService` then called setState from each commit and
 * React aborted the tree with "Maximum update depth exceeded", blanking the
 * transit page whenever it remounted (e.g. Back out of Settings).
 */
const EMPTY_CALENDAR: Record<string, string> = {};
const EMPTY_ROUTES: Route[] = [];
const EMPTY_STOPS: Stop[] = [];

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
    calendar: data?.calendar ?? EMPTY_CALENDAR,
    error,
    feedEndDate: data?.feedEndDate,
    feedStartDate: data?.feedStartDate,
    feedVersion: data?.feedVersion,
    loading,
    routes: data?.routes ?? EMPTY_ROUTES,
    routesById,
    stops: data?.stops ?? EMPTY_STOPS,
    stopsById,
  };
}
