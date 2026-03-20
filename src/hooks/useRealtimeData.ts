/**
 * Hook that starts polling the GTFS Realtime proxy worker and populates
 * the realtimeStore. Call this once near the top of the component tree.
 */

import { useEffect, useRef, useState } from 'react';
import { useRealtimeStore } from '../stores/realtimeStore';
import { REALTIME_POLL_INTERVAL } from '../config';

const CACHE_POST_EXPIRY_BUFFER_MS = 250;
const MIN_RETRY_DELAY_MS = 1000;
const ERROR_RETRY_DELAY_MS = 3000;
const RESUME_COALESCE_WINDOW_MS = 1200;

function getAdaptiveDelayMs(
  workerTimestamp: string | null,
  cacheAgeSeconds: number | null
): number {
  const now = Date.now();
  const fromTimestamp = workerTimestamp ? Date.parse(workerTimestamp) : Number.NaN;

  if (!Number.isNaN(fromTimestamp)) {
    const targetMs =
      fromTimestamp + REALTIME_POLL_INTERVAL + CACHE_POST_EXPIRY_BUFFER_MS;
    return Math.max(MIN_RETRY_DELAY_MS, targetMs - now);
  }

  if (cacheAgeSeconds != null && cacheAgeSeconds >= 0) {
    const remainingMs =
      REALTIME_POLL_INTERVAL - cacheAgeSeconds * 1000 + CACHE_POST_EXPIRY_BUFFER_MS;
    return Math.max(MIN_RETRY_DELAY_MS, remainingMs);
  }

  return REALTIME_POLL_INTERVAL;
}

export function useRealtimeData(enabled: boolean = true) {
  const { vehiclePositions, tripUpdates, stats, lastUpdate, loading, error } =
    useRealtimeStore();

  const [nextPollAtMs, setNextPollAtMs] = useState<number | null>(null);

  const timeoutRef = useRef<number | null>(null);
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
      const adaptiveDelayMs = getAdaptiveDelayMs(
        state.workerTimestamp,
        state.cacheAgeSeconds
      );
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
      if (event.persisted) requestResync();
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
    vehiclePositions,
    tripUpdates,
    stats,
    lastUpdate,
    loading,
    error,
    nextPollAtMs,
  };
}
