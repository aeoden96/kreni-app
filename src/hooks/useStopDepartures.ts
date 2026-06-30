/**
 * Unified stop departure board.
 *
 * Merges the two previously separate projections of the same data:
 *   - the static timetable ("what should come", from stop_timetables/{stopId}.json)
 *   - live GPS vehicles ("what is actually approaching", from realtimeStore.vehiclePositions)
 *
 * Both sources are keyed by `tripId`, so a scheduled departure and its live vehicle are
 * the *same row* — we never show them as two competing lists. Each row carries a
 * `confidence` tier ('live' when a GPS position exists, 'scheduled' otherwise) plus the
 * GPS facts (distance, stops away, passed-stop) when available.
 *
 * Data quality: a trip is included when it belongs to today's active service *or* when it
 * currently has a live GPS position — i.e. we trust realtime over the static calendar.
 * This re-links the "live vehicle with no timetable entry" orphans that arise from
 * service-day prefix mismatches or stale static stop-times for badly delayed trips.
 *
 * No new backend endpoint is needed — all data exists in existing indexes + realtime store.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import type { Route, RouteStopsData, Stop, StopTimetable } from '../utils/gtfs';

import { useRealtimeStore } from '../stores/realtimeStore';
import { fetchRouteStops, fetchStopTimetable } from '../utils/gtfs';
import { computeVehicleStopProgress } from '../utils/vehicles';
import { useInitialData } from './useInitialData';

export interface StopDeparture {
  /** Adjusted clock time (minutes from midnight): scheduledMinutes + delaySeconds/60 */
  adjustedMinutes: number;
  /** 'live' = has a GPS position; 'scheduled' = timetable only (may still carry a delay) */
  confidence: 'live' | 'scheduled';
  /** Realtime delay in seconds at this stop; null = no realtime data */
  delaySeconds: null | number;
  /** Straight-line distance vehicle → stop in metres; null = no GPS */
  distanceMeters: null | number;
  /** GPS-derived ETA in seconds (distance / speed); null = no GPS or already passed */
  etaFromGpsSeconds: null | number;
  /** Fused best estimate of seconds until arrival (smooth, used for ordering + countdown) */
  etaSeconds: number;
  /** True when a GPS position is matched to this trip */
  hasGps: boolean;
  lat: null | number;
  lon: null | number;
  /** True when the vehicle has already passed this stop but is still nearby */
  passedStop: boolean;
  /** Whether realtime delay was matched at stop level, trip level, or not at all */
  realtimeSource: 'stop' | 'trip' | null;
  routeId: string;
  routeLongName: string;
  routeShortName: string;
  routeType: number; // 0 = Tram, 3 = Bus
  /** Scheduled minutes from midnight */
  scheduledMinutes: number;
  /** Integer stops remaining before this stop; null = GPS not available */
  stopsAway: null | number;
  /** Trip terminus for this direction (last stop name), shown instead of route long name */
  tripDestinationName: string;
  tripId: string;
  /** Vehicle ID from GTFS-RT; null when no live position */
  vehicleId: null | string;
}

/** Allow trips that arrived up to this many seconds ago (grace window for scheduled rows) */
const ARRIVED_GRACE_SECONDS = 30;
/** When a GPS trip's scheduled ETA is past the lookahead window, still show it if this close */
const GPS_OUTSIDE_SCHEDULE_WINDOW_MAX_M = 15_000;
/** Keep GPS-tracked vehicles visible until they are this many metres past the stop */
const PASSED_STOP_DISTANCE_METERS = 400;

export function useStopDepartures(
  stopId: null | string,
  routesById: Map<string, Route>,
  stopsById: Map<string, Stop>,
  nowMs: number, // Date.now() — updated every second by caller for live countdown
  options: { dataDir?: string; lookaheadMinutes?: number } = {}
): {
  departures: StopDeparture[];
  error: Error | null;
  isAllTerminus: boolean;
  liveCount: number;
  loading: boolean;
} {
  const { dataDir = 'data', lookaheadMinutes = 60 } = options;
  const [stopTimetable, setStopTimetable] = useState<null | StopTimetable>(null);
  const [routeStopsCache, setRouteStopsCache] = useState<Map<string, RouteStopsData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const vehiclePositions = useRealtimeStore((s) => s.vehiclePositions);
  const tripUpdates = useRealtimeStore((s) => s.tripUpdates);
  const { calendar } = useInitialData({ dataDir });

  // Track the stopId for which data is currently being fetched (stale-check guard)
  const fetchingForStopId = useRef<null | string>(null);

  useEffect(() => {
    if (!stopId) {
      setStopTimetable(null);
      setRouteStopsCache(new Map());
      setError(null);
      return;
    }

    fetchingForStopId.current = stopId;
    setLoading(true);
    setError(null);

    fetchStopTimetable(stopId, dataDir)
      .then(async (timetable) => {
        // Bail out if the user already switched to a different stop
        if (fetchingForStopId.current !== stopId) return;
        setStopTimetable(timetable);

        // Fetch route_stops in parallel for all routes at this stop (~320 B each, cached)
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

        if (fetchingForStopId.current !== stopId) return;

        const map = new Map<string, RouteStopsData>();
        for (const entry of settled) {
          if (entry) map.set(entry[0], entry[1]);
        }
        setRouteStopsCache(map);
        setLoading(false);
      })
      .catch((err) => {
        if (fetchingForStopId.current !== stopId) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
  }, [stopId, dataDir]);

  const { departures, isAllTerminus } = useMemo<{
    departures: StopDeparture[];
    isAllTerminus: boolean;
  }>(() => {
    if (!stopId || !stopTimetable) return { departures: [], isAllTerminus: false };

    const nowSeconds = nowMs / 1000;
    const midnightSeconds = (() => {
      const d = new Date(nowMs);
      d.setHours(0, 0, 0, 0);
      return d.getTime() / 1000;
    })();
    const windowEnd = nowSeconds + lookaheadMinutes * 60;

    // Today's active service ID — used to filter scheduled-only rows to today's calendar slice.
    const todayStr = new Date(nowMs).toISOString().slice(0, 10).replace(/-/g, '');
    const activeServiceId = calendar[todayStr] ?? null;

    const targetStop = stopsById.get(stopId);

    const results: StopDeparture[] = [];
    let routesInTopology = 0;
    let terminusRoutes = 0;

    for (const [routeId, trips] of Object.entries(stopTimetable)) {
      const route = routesById.get(routeId);
      if (!route) continue;

      const routeStopsData = routeStopsCache.get(routeId);

      // Determine which direction's ordered stop list contains our stopId
      let directionKey: null | string = null;
      let targetStopIndex = -1;
      if (routeStopsData?.orderedStops) {
        for (const [dir, stopList] of Object.entries(routeStopsData.orderedStops)) {
          const idx = stopList.indexOf(stopId);
          if (idx !== -1) {
            directionKey = dir;
            targetStopIndex = idx;
            break;
          }
        }
      }

      if (targetStopIndex >= 0 && directionKey !== null) {
        routesInTopology++;
      }

      // Skip routes where this stop is the terminal (last) stop — those trips are
      // arriving/terminating here, not departing.
      const dirStopIds =
        directionKey !== null ? (routeStopsData?.orderedStops?.[directionKey] ?? []) : [];
      if (
        targetStopIndex >= 0 &&
        dirStopIds.length > 1 &&
        targetStopIndex === dirStopIds.length - 1
      ) {
        terminusRoutes++;
        continue;
      }

      const destLastStopId = dirStopIds.length > 0 ? dirStopIds[dirStopIds.length - 1] : null;
      const tripDestinationName =
        destLastStopId !== null
          ? (stopsById.get(destLastStopId)?.name ?? route.longName)
          : route.longName;

      for (const [tripId, { time: scheduledMinutes }] of Object.entries(trips)) {
        const vehiclePos = vehiclePositions.get(tripId);
        const hasGps = vehiclePos !== undefined;

        // Data quality: keep a scheduled-only row only when it belongs to today's service.
        // Live GPS rows are kept regardless — we trust realtime over the static calendar.
        if (!hasGps && activeServiceId && !tripId.startsWith(activeServiceId + '_')) continue;

        // Resolve delay: prefer stop-level match over trip-level
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

        // Scheduled (delay-adjusted) absolute arrival, in POSIX seconds
        const scheduledAbsoluteSeconds =
          midnightSeconds + scheduledMinutes * 60 + (delaySeconds ?? 0);
        const scheduleArrivingInSeconds = scheduledAbsoluteSeconds - nowSeconds;

        // GPS-derived stops away / passed-stop projection
        let stopsAway: null | number = null;
        let passedStop = false;
        if (vehiclePos && targetStopIndex >= 0 && dirStopIds.length > 1) {
          const stopCoords = dirStopIds
            .map((sid) => {
              const s = stopsById.get(sid);
              return s ? { lat: s.lat, lon: s.lon } : null;
            })
            .filter((s): s is { lat: number; lon: number } => s !== null);

          if (stopCoords.length > 1) {
            const vehicleProgress = computeVehicleStopProgress(
              vehiclePos.latitude,
              vehiclePos.longitude,
              stopCoords
            );
            const rawStopsAway = targetStopIndex - vehicleProgress;
            if (rawStopsAway < 0) {
              passedStop = true;
              stopsAway = 0;
            } else {
              stopsAway = Math.max(0, Math.ceil(rawStopsAway));
            }
          }
        }

        const distanceMeters =
          vehiclePos && targetStop
            ? Math.round(
                haversineMeters(
                  vehiclePos.latitude,
                  vehiclePos.longitude,
                  targetStop.lat,
                  targetStop.lon
                )
              )
            : null;

        // ── Filtering: merge the rules of both former hooks ──
        if (hasGps) {
          // GPS rows can exceed the scheduled window (static stop-time often lags real
          // position); keep them when still geographically near the stop.
          if (scheduledAbsoluteSeconds > windowEnd) {
            if (
              !targetStop ||
              !vehiclePos ||
              haversineMeters(
                vehiclePos.latitude,
                vehiclePos.longitude,
                targetStop.lat,
                targetStop.lon
              ) > GPS_OUTSIDE_SCHEDULE_WINDOW_MAX_M
            ) {
              continue;
            }
          }
          // Passed vehicles drop out once they are well past the stop.
          if (
            passedStop &&
            distanceMeters !== null &&
            distanceMeters > PASSED_STOP_DISTANCE_METERS
          ) {
            continue;
          }
        } else {
          // Scheduled-only: strict time window with a small past grace.
          if (scheduleArrivingInSeconds < -ARRIVED_GRACE_SECONDS) continue;
          if (scheduledAbsoluteSeconds > windowEnd) continue;
        }

        // GPS-derived ETA: distance / speed (fallback 5 m/s city transit estimate)
        let etaFromGpsSeconds: null | number = null;
        if (vehiclePos && distanceMeters !== null && !passedStop) {
          const speed = vehiclePos.speed ?? 5; // m/s
          etaFromGpsSeconds = Math.round(distanceMeters / Math.max(speed, 1));
        }

        // Fused ETA (smooth, comparable across rows):
        //   1. delay-adjusted schedule when a realtime delay exists (smoothest)
        //   2. else GPS distance ETA when approaching
        //   3. else raw schedule
        let etaSeconds: number;
        if (delaySeconds !== null) {
          etaSeconds = scheduleArrivingInSeconds;
        } else if (etaFromGpsSeconds !== null) {
          etaSeconds = etaFromGpsSeconds;
        } else {
          etaSeconds = scheduleArrivingInSeconds;
        }

        results.push({
          adjustedMinutes: scheduledMinutes + (delaySeconds ?? 0) / 60,
          confidence: hasGps ? 'live' : 'scheduled',
          delaySeconds,
          distanceMeters,
          etaFromGpsSeconds,
          etaSeconds,
          hasGps,
          lat: vehiclePos?.latitude ?? null,
          lon: vehiclePos?.longitude ?? null,
          passedStop,
          realtimeSource,
          routeId,
          routeLongName: route.longName,
          routeShortName: route.shortName,
          routeType: route.type,
          scheduledMinutes,
          stopsAway,
          tripDestinationName,
          tripId,
          vehicleId: vehiclePos?.vehicleId ?? null,
        });
      }
    }

    // Keep at most one "just passed" row (the closest by GPS distance) so a single missed
    // vehicle doesn't crowd the top of the board.
    const passed = results.filter((d) => d.passedStop);
    const upcoming = results.filter((d) => !d.passedStop);
    let keptPassed: StopDeparture[] = [];
    if (passed.length > 0) {
      keptPassed = [
        passed.reduce((a, b) => {
          const da = a.distanceMeters ?? Number.POSITIVE_INFINITY;
          const db = b.distanceMeters ?? Number.POSITIVE_INFINITY;
          if (da !== db) return da < db ? a : b;
          return a.etaSeconds > b.etaSeconds ? a : b;
        }),
      ];
    }

    // Order: just-passed first (informative "you just missed it"), then by fused ETA.
    upcoming.sort((a, b) => {
      if (a.etaSeconds !== b.etaSeconds) return a.etaSeconds - b.etaSeconds;
      // Tie-break: live before scheduled
      return (a.hasGps ? 0 : 1) - (b.hasGps ? 0 : 1);
    });

    const isAllTerminus = routesInTopology > 0 && terminusRoutes === routesInTopology;
    return { departures: [...keptPassed, ...upcoming], isAllTerminus };
  }, [
    stopId,
    stopTimetable,
    routeStopsCache,
    vehiclePositions,
    tripUpdates,
    nowMs,
    stopsById,
    routesById,
    calendar,
    lookaheadMinutes,
  ]);

  const liveCount = departures.filter((d) => d.hasGps && !d.passedStop).length;

  return {
    departures,
    error,
    isAllTerminus,
    liveCount,
    loading: loading || (!!stopId && !stopTimetable && !error),
  };
}

/** Approximate haversine distance in metres between two lat/lon points */
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
