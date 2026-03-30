/**
 * Hook that starts polling the GTFS Realtime proxy worker and populates
 * the realtimeStore. Call this once near the top of the component tree.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { queryKeys } from '../api/queryKeys';
import { REALTIME_POLL_INTERVAL } from '../config';
import { useRealtimeStore } from '../stores/realtimeStore';

// Extra time to wait after the cache TTL before polling again.
// Must be large enough to absorb: cache.put write latency on the worker side
// (~100-500 ms) plus any client/server clock skew (~0-1000 ms).
// Using server-relative Age avoids the skew problem for the main branch, but
// a generous buffer prevents a HIT on the very next request in edge cases.
const CACHE_POST_EXPIRY_BUFFER_MS = 1500;
const MIN_RETRY_DELAY_MS = 1000;

export function useRealtimeData(enabled: boolean = true) {
  // Sync downstream data from the Zustand cache (where fetchAll populates)
  const {
    error: storeError,
    lastUpdate,
    stats,
    tripUpdates,
    vehiclePositions,
  } = useRealtimeStore();

  // Let React Query handle the resilient background scheduling and focus deduction
  const {
    data: cacheAgeSeconds,
    error: queryError,
    isFetching,
  } = useQuery({
    enabled,
    queryFn: async () => {
      // We still use Zustand's engine to perform the heavy lifting and parse payloads
      await useRealtimeStore.getState().fetchAll();
      return useRealtimeStore.getState().cacheAgeSeconds;
    },
    queryKey: queryKeys.realtime.all,
    // Dynamically adjust polling delay based on the server's cache age
    refetchInterval: (query) => getAdaptiveDelayMs(query.state.data ?? null),
    // Standard polling best-practices for battery/data saving:
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: true,
  });

  const error = queryError ?? storeError;
  const loading = isFetching;

  // Derive the next poll time based on React Query's delay formula
  const nextPollAtMs = useMemo(() => {
    if (!enabled || isFetching || !lastUpdate) return null;
    return lastUpdate + getAdaptiveDelayMs(cacheAgeSeconds ?? null);
  }, [enabled, isFetching, lastUpdate, cacheAgeSeconds]);

  return {
    error,
    lastUpdate,
    loading,
    nextPollAtMs,
    stats,
    tripUpdates,
    vehiclePositions,
  };
}

// Uses the Age header (server-derived, clock-skew-safe) to estimate how much
// of the cache TTL has already elapsed, then waits for the remainder plus a
// buffer. X-Timestamp is intentionally NOT used here: comparing a server
// timestamp against Date.now() is sensitive to client/server clock skew and
// consistently causes the poll to arrive before the cache has expired.
function getAdaptiveDelayMs(cacheAgeSeconds: null | number): number {
  if (cacheAgeSeconds != null && cacheAgeSeconds >= 0) {
    const remainingMs =
      REALTIME_POLL_INTERVAL - cacheAgeSeconds * 1000 + CACHE_POST_EXPIRY_BUFFER_MS;
    return Math.max(MIN_RETRY_DELAY_MS, remainingMs);
  }

  return REALTIME_POLL_INTERVAL;
}
