/**
 * Hook that starts polling the GTFS Realtime proxy worker and populates
 * the realtimeStore. Call this once near the top of the component tree.
 */

import { useEffect, useRef, useState } from 'react';

import { REALTIME_POLL_INTERVAL } from '../config';
import { useRealtimeStore } from '../stores/realtimeStore';

// Extra time to wait after the cache TTL before polling again.
// Must be large enough to absorb: cache.put write latency on the worker side
// (~100-500 ms) plus any client/server clock skew (~0-1000 ms).
// Using server-relative Age avoids the skew problem for the main branch, but
// a generous buffer prevents a HIT on the very next request in edge cases.
const CACHE_POST_EXPIRY_BUFFER_MS = 1500;
const MIN_RETRY_DELAY_MS = 1000;
const ERROR_RETRY_DELAY_MS = 3000;
const RESUME_COALESCE_WINDOW_MS = 1200;

export function useRealtimeData(enabled: boolean = true) {
  const { error, lastUpdate, loading, stats, tripUpdates, vehiclePositions } = useRealtimeStore();

  const [nextPollAtMs, setNextPollAtMs] = useState<null | number>(null);

  const timeoutRef = useRef<null | number>(null);
  const inFlightRef = useRef(false);
  const pendingResyncRef = useRef(false);
  const didErrorRetryRef = useRef(false);
  const lastResumeTriggerRef = useRef(0);

  useEffect(() => {
    const clearTimer = () => {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const scheduleNext = (delayMs: number, runRound: () => Promise<void>) => {
      clearTimer();
      const effectiveMs = Math.max(MIN_RETRY_DELAY_MS, delayMs);
      setNextPollAtMs(Date.now() + effectiveMs);
      timeoutRef.current = window.setTimeout(() => {
        void runRound();
      }, effectiveMs);
    };

    if (!enabled) {
      clearTimer();
      setNextPollAtMs(null);
      return;
    }

    let active = true;

    const runRound = async () => {
      if (!active || inFlightRef.current) return;

      inFlightRef.current = true;
      clearTimer();
      setNextPollAtMs(null);
      await useRealtimeStore.getState().fetchAll();
      inFlightRef.current = false;

      if (!active) return;

      if (pendingResyncRef.current) {
        pendingResyncRef.current = false;
        scheduleNext(MIN_RETRY_DELAY_MS, runRound);
        return;
      }

      const state = useRealtimeStore.getState();
      if (state.error && !didErrorRetryRef.current) {
        didErrorRetryRef.current = true;
        scheduleNext(ERROR_RETRY_DELAY_MS, runRound);
        return;
      }

      didErrorRetryRef.current = false;
      const adaptiveDelayMs = getAdaptiveDelayMs(state.cacheAgeSeconds);
      scheduleNext(adaptiveDelayMs, runRound);
    };

    const requestResync = () => {
      if (!active) return;

      const now = Date.now();
      if (now - lastResumeTriggerRef.current < RESUME_COALESCE_WINDOW_MS) return;
      lastResumeTriggerRef.current = now;

      if (inFlightRef.current) {
        pendingResyncRef.current = true;
        return;
      }

      void runRound();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestResync();
      }
    };

    const onOnline = () => requestResync();
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // bfcache restore: all React state and refs are frozen from before the
        // kill. Reloading is the only reliable way to get a clean slate.
        window.location.reload();
      }
    };

    void runRound();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      active = false;
      inFlightRef.current = false; // release guard so remount/re-enable starts cleanly
      clearTimer();
      setNextPollAtMs(null);
      pendingResyncRef.current = false;
      didErrorRetryRef.current = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [enabled]);

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
