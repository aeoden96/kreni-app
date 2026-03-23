/**
 * Hook to produce a chronological departure board for a stop from static timetable data,
 * enriched with realtime delays where available.
 *
 * Uses stop_timetables/{stopId}.json (already cached via cachedFetch / dataCache).
 * Returns departures for the next 60 minutes sorted by adjusted arrival time.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import type { Route, RouteStopsData, Stop, StopTimetable } from '../utils/gtfs';

import { useRealtimeStore } from '../stores/realtimeStore';
import { fetchRouteStops, fetchStopTimetable } from '../utils/gtfs';
import { useInitialData } from './useInitialData';

export interface TimetableDeparture {
  /** Adjusted arrival time in minutes from midnight (scheduledMinutes + delaySeconds/60) */
  adjustedMinutes: number;
  /** Realtime delay in seconds; null = no realtime data */
  delaySeconds: null | number;
  /** Minutes until adjusted arrival from now; negative = already departed */
  minutesUntil: number;
  /** Whether realtime data was matched at stop level (true) or trip level (false) */
  realtimeSource: 'stop' | 'trip' | null;
  routeId: string;
  routeLongName: string;
  routeShortName: string;
  routeType: number; // 0 = Tram, 3 = Bus
  /** Scheduled minutes from midnight */
  scheduledMinutes: number;
  /** Last stop on this direction (same idea as trip headsign), for display */
  tripDestinationName: string;
  tripId: string;
}

/** Grace period: show departures that left up to this many seconds ago */
const PAST_GRACE_SECONDS = 30;

export function useTimetableDepartures(
  stopId: null | string,
  routesById: Map<string, Route>,
  stopsById: Map<string, Stop>,
  nowMs: number,
  options: { dataDir?: string; lookaheadMinutes?: number } = {}
): { departures: TimetableDeparture[]; error: Error | null; loading: boolean } {
  const { dataDir = 'data', lookaheadMinutes = 60 } = options;
  const [stopTimetable, setStopTimetable] = useState<null | StopTimetable>(null);
  const [routeStopsCache, setRouteStopsCache] = useState<Map<string, RouteStopsData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const tripUpdates = useRealtimeStore((s) => s.tripUpdates);
  const { calendar } = useInitialData({ dataDir });
  const fetchingForRef = useRef<null | string>(null);

  useEffect(() => {
    if (!stopId) {
      setStopTimetable(null);
      setRouteStopsCache(new Map());
      setError(null);
      return;
    }
    fetchingForRef.current = stopId;
    setLoading(true);
    setError(null);

    fetchStopTimetable(stopId, dataDir)
      .then(async (timetable) => {
        if (fetchingForRef.current !== stopId) return;
        setStopTimetable(timetable);

        // Fetch route_stops for all routes at this stop to enable terminus detection
        const routeIds = Object.keys(timetable);
        const settled = await Promise.all(
          routeIds.map(async (routeId) => {
            try {
              const data = await fetchRouteStops(routeId, dataDir);
              return [routeId, data] as const;
            } catch {
              return null;
            }
          })
        );

        if (fetchingForRef.current !== stopId) return;

        const rsMap = new Map<string, RouteStopsData>();
        for (const entry of settled) {
          if (entry) rsMap.set(entry[0], entry[1]);
        }
        setRouteStopsCache(rsMap);
        setLoading(false);
      })
      .catch((err) => {
        if (fetchingForRef.current !== stopId) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
  }, [stopId, dataDir]);

  const departures = useMemo<TimetableDeparture[]>(() => {
    if (!stopId || !stopTimetable) return [];

    const nowSeconds = nowMs / 1000;
    const midnightMs = (() => {
      const d = new Date(nowMs);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })();
    const midnightSeconds = midnightMs / 1000;

    // Determine today's active service ID to filter out trips from other calendar days
    const todayStr = new Date(nowMs).toISOString().slice(0, 10).replace(/-/g, '');
    const activeServiceId = calendar[todayStr] ?? null;

    const windowEndSeconds = nowSeconds + lookaheadMinutes * 60;

    const results: TimetableDeparture[] = [];

    for (const [routeId, trips] of Object.entries(stopTimetable)) {
      const route = routesById.get(routeId);
      if (!route) continue;

      // Skip routes where this stop is the terminal (last) stop — terminating trips
      // are arrivals, not departures. Passengers waiting to board should use the
      // paired departing platform.
      const routeStopsData = routeStopsCache.get(routeId);
      let isTerminus = false;
      if (routeStopsData?.orderedStops) {
        for (const [, stopList] of Object.entries(routeStopsData.orderedStops)) {
          const idx = stopList.indexOf(stopId);
          if (idx !== -1) {
            isTerminus = stopList.length > 1 && idx === stopList.length - 1;
            break;
          }
        }
      }
      if (isTerminus) continue;

      let directionStopList: null | string[] = null;
      if (routeStopsData?.orderedStops) {
        for (const stopList of Object.values(routeStopsData.orderedStops)) {
          if (stopList.indexOf(stopId) !== -1) {
            directionStopList = stopList;
            break;
          }
        }
      }
      const lastStopForDirection =
        directionStopList && directionStopList.length > 0
          ? directionStopList[directionStopList.length - 1]
          : null;
      const tripDestinationName =
        lastStopForDirection !== null
          ? (stopsById.get(lastStopForDirection)?.name ?? route.longName)
          : route.longName;

      for (const [tripId, { time: scheduledMinutes }] of Object.entries(trips)) {
        // Skip trips that don't belong to today's service
        if (activeServiceId && !tripId.startsWith(activeServiceId + '_')) continue;
        // Resolve realtime delay for this specific trip
        let delaySeconds: null | number = null;
        let realtimeSource: 'stop' | 'trip' | null = null;

        const tripUpdate = tripUpdates.get(tripId);
        if (tripUpdate) {
          const stu = tripUpdate.stopTimeUpdates.find((s) => s.stopId === stopId);
          if (stu) {
            const d = stu.departureDelay ?? stu.arrivalDelay;
            if (d !== undefined) {
              delaySeconds = d;
              realtimeSource = 'stop';
            }
          }
          if (delaySeconds === null && tripUpdate.delay !== undefined) {
            delaySeconds = tripUpdate.delay;
            realtimeSource = 'trip';
          }
        }

        const adjustedMinutes = scheduledMinutes + (delaySeconds ?? 0) / 60;
        const adjustedAbsoluteSeconds = midnightSeconds + adjustedMinutes * 60;

        if (adjustedAbsoluteSeconds < nowSeconds - PAST_GRACE_SECONDS) continue;
        if (adjustedAbsoluteSeconds > windowEndSeconds) continue;

        const minutesUntil = Math.round((adjustedAbsoluteSeconds - nowSeconds) / 60);

        results.push({
          adjustedMinutes,
          delaySeconds,
          minutesUntil,
          realtimeSource,
          routeId,
          routeLongName: route.longName,
          routeShortName: route.shortName,
          routeType: route.type,
          scheduledMinutes,
          tripDestinationName,
          tripId,
        });
      }
    }

    // Sort chronologically by adjusted time
    results.sort((a, b) => a.adjustedMinutes - b.adjustedMinutes);

    return results;
  }, [
    stopId,
    stopTimetable,
    routeStopsCache,
    tripUpdates,
    nowMs,
    routesById,
    stopsById,
    calendar,
    lookaheadMinutes,
  ]);

  return { departures, error, loading: loading || (!!stopId && !stopTimetable && !error) };
}
