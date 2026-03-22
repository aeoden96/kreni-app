/**
 * Hook to find all vehicles approaching a given stop within the next 30 minutes.
 *
 * Data flow:
 *   stop_timetables/{stopId}.json  → tripId → { scheduledTime, sequence }
 *   route_stops/{routeId}.json     → orderedStops[direction] → stop order for stops-away calc
 *   realtimeStore.vehiclePositions → GPS position per tripId
 *   realtimeStore.tripUpdates      → delay per tripId / stop
 *
 * No new backend endpoint is needed — all data exists in existing indexes + realtime store.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import type { Stop, Route, StopTimetable, RouteStopsData } from '../utils/gtfs';
import { fetchStopTimetable, fetchRouteStops } from '../utils/gtfs';
import { useRealtimeStore } from '../stores/realtimeStore';
import { computeVehicleStopProgress } from '../utils/vehicles';

export interface ApproachingVehicle {
  /** GTFS tripId (`0_20_601_6_10001` style) */
  tripId: string;
  /** Vehicle ID from GTFS-RT; null when no live position */
  vehicleId: string | null;
  routeId: string;
  routeShortName: string;
  routeType: number; // 0 = Tram, 3 = Bus
  routeLongName: string;
  /** Trip terminus for this direction (last stop name), for display instead of route long name */
  tripDestinationName: string;
  /** Scheduled arrival time at this stop (minutes from midnight) */
  etaMinutes: number;
  /** Realtime delay in seconds at this stop; null = schedule only */
  delaySeconds: number | null;
  /** Seconds until arrival: positive = future, negative = just arrived */
  arrivingInSeconds: number;
  /** Integer stops remaining before this stop; null = GPS not available */
  stopsAway: number | null;
  /** Approximate straight-line distance from vehicle to stop in metres; null = no GPS */
  distanceMeters: number | null;
  /** 'realtime' = has GPS position, 'scheduled' = timetable only */
  confidence: 'realtime' | 'scheduled';
  lat: number | null;
  lon: number | null;
  /** True when vehicle has already passed this stop but is within ~200m */
  passedStop: boolean;
  /** GPS-derived ETA in seconds: distance / speed (fallback: distance / 5 m/s); null = no GPS */
  etaFromGpsSeconds: number | null;
}

/** Show all trips arriving within this many minutes */
const LOOKAHEAD_MINUTES = 30;
/** Allow trips that arrived up to this many seconds ago (grace window for scheduled) */
const ARRIVED_GRACE_SECONDS = 30;
/** Keep GPS-tracked vehicles visible until they are this many metres past the stop */
const PASSED_STOP_DISTANCE_METERS = 400;

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

export function useApproachingVehicles(
  stopId: string | null,
  stopsById: Map<string, Stop>,
  routesById: Map<string, Route>,
  nowMs: number,   // Date.now() — updated every second by caller for live countdown
  options: { dataDir?: string } = {}
): { vehicles: ApproachingVehicle[]; loading: boolean; error: Error | null; isAllTerminus: boolean } {
  const { dataDir = 'data' } = options;
  const [stopTimetable, setStopTimetable] = useState<StopTimetable | null>(null);
  const [routeStopsCache, setRouteStopsCache] = useState<Map<string, RouteStopsData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const vehiclePositions = useRealtimeStore((s) => s.vehiclePositions);
  const tripUpdates = useRealtimeStore((s) => s.tripUpdates);

  // Track the stopId for which data is currently being fetched (stale-check guard)
  const fetchingForStopId = useRef<string | null>(null);

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

  const { vehicles, isAllTerminus } = useMemo<{ vehicles: ApproachingVehicle[]; isAllTerminus: boolean }>(() => {
    if (!stopId || !stopTimetable) return { vehicles: [], isAllTerminus: false };

    // Convert wall-clock ms to seconds and compute local midnight offset
    const nowSeconds = nowMs / 1000;
    const midnightMs = (() => {
      const d = new Date(nowMs);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })();
    const midnightSeconds = midnightMs / 1000;

    const windowEnd = nowSeconds + LOOKAHEAD_MINUTES * 60;

    // Coords of the target stop for distance calculation
    const targetStop = stopsById.get(stopId);

    const results: ApproachingVehicle[] = [];
    let routesInTopology = 0;
    let terminusRoutes = 0;

    for (const [routeId, trips] of Object.entries(stopTimetable)) {
      const route = routesById.get(routeId);
      if (!route) continue;

      const routeStopsData = routeStopsCache.get(routeId);

      // Determine which direction's ordered stop list contains our stopId
      let directionKey: string | null = null;
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

      // Track how many routes have valid topology data (for isAllTerminus detection)
      if (targetStopIndex >= 0 && directionKey !== null) {
        routesInTopology++;
      }

      // Skip routes where this stop is the terminal (last) stop — those trips are
      // arriving/terminating here, not departing. Passengers waiting to depart
      // should use the paired departing platform instead.
      const routeStopCount =
        directionKey !== null ? (routeStopsData?.orderedStops?.[directionKey]?.length ?? 0) : 0;
      if (targetStopIndex >= 0 && routeStopCount > 1 && targetStopIndex === routeStopCount - 1) {
        terminusRoutes++;
        continue;
      }

      for (const [tripId, { time: scheduledMinutes }] of Object.entries(trips)) {
        const vehiclePos = vehiclePositions.get(tripId);
        const tripUpdate = tripUpdates.get(tripId);

        // Resolve delay: prefer stop-level match over trip-level
        let delaySeconds: number | null = null;
        if (tripUpdate) {
          const stu = tripUpdate.stopTimeUpdates.find((s) => s.stopId === stopId);
          if (stu) {
            delaySeconds = stu.departureDelay ?? stu.arrivalDelay ?? null;
          }
          if (delaySeconds === null && tripUpdate.delay !== undefined) {
            delaySeconds = tripUpdate.delay;
          }
        }

        // Absolute ETA in POSIX seconds (scheduled minutes from midnight + delay)
        const etaAbsoluteSeconds = midnightSeconds + scheduledMinutes * 60 + (delaySeconds ?? 0);
        const arrivingInSeconds = etaAbsoluteSeconds - nowSeconds;

        // Skip trips outside the time window.
        // For GPS-tracked vehicles, we allow negative arrivingInSeconds (already passed by schedule)
        // because we'll use distance-based filtering below. For scheduled-only, apply strict grace.
        if (!vehiclePositions.has(tripId) && arrivingInSeconds < -ARRIVED_GRACE_SECONDS) continue;
        if (etaAbsoluteSeconds > windowEnd) continue;

        // Compute stops away via GPS → fractional stop-index projection
        let stopsAway: number | null = null;
        let passedStop = false;
        if (vehiclePos && targetStopIndex >= 0 && directionKey !== null) {
          const orderedStopIds = routeStopsData?.orderedStops?.[directionKey] ?? [];
          const stopCoords = orderedStopIds
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
              // Vehicle has passed the stop according to GPS projection
              passedStop = true;
              stopsAway = 0;
            } else {
              // Round up so "0.1 stops away" shows as 1 (not yet arrived)
              stopsAway = Math.max(0, Math.ceil(rawStopsAway));
            }
          }
        }

        // Straight-line distance vehicle → stop
        const distanceMeters =
          vehiclePos && targetStop
            ? Math.round(haversineMeters(vehiclePos.latitude, vehiclePos.longitude, targetStop.lat, targetStop.lon))
            : null;

        // For GPS-tracked vehicles that have passed: only keep visible within 200m
        if (vehiclePos && passedStop && distanceMeters !== null && distanceMeters > PASSED_STOP_DISTANCE_METERS) {
          continue;
        }
        // For scheduled-only (no GPS), use the grace window to drop old entries
        if (!vehiclePos && arrivingInSeconds < -ARRIVED_GRACE_SECONDS) {
          continue;
        }

        // GPS-derived ETA in seconds: distance / speed (fallback to 5 m/s city transit estimate)
        let etaFromGpsSeconds: number | null = null;
        if (vehiclePos && distanceMeters !== null && !passedStop) {
          const speed = vehiclePos.speed ?? 5; // m/s
          etaFromGpsSeconds = Math.round(distanceMeters / Math.max(speed, 1));
        }

        const dirStopIds =
          directionKey !== null ? (routeStopsData?.orderedStops?.[directionKey] ?? []) : [];
        const destLastStopId =
          dirStopIds.length > 0 ? dirStopIds[dirStopIds.length - 1] : null;
        const tripDestinationName =
          destLastStopId !== null
            ? (stopsById.get(destLastStopId)?.name ?? route.longName)
            : route.longName;

        results.push({
          tripId,
          vehicleId: vehiclePos?.vehicleId ?? null,
          routeId,
          routeShortName: route.shortName,
          routeType: route.type,
          routeLongName: route.longName,
          tripDestinationName,
          etaMinutes: scheduledMinutes,
          delaySeconds,
          arrivingInSeconds,
          stopsAway,
          distanceMeters,
          confidence: vehiclePos ? 'realtime' : 'scheduled',
          lat: vehiclePos?.latitude ?? null,
          lon: vehiclePos?.longitude ?? null,
          passedStop,
          etaFromGpsSeconds,
        });
      }
    }

    // Sort: passed-stop vehicles come first (descending by distance — furthest shown first),
    // then approaching vehicles sorted by arrivingInSeconds ascending (closest ETA first),
    // then realtime before scheduled at the same ETA.
    const sorted = results.sort((a, b) => {
      if (a.passedStop !== b.passedStop) return a.passedStop ? -1 : 1;
      if (a.passedStop && b.passedStop) {
        // Both passed: furthest away first (descending)
        return (b.distanceMeters ?? 0) - (a.distanceMeters ?? 0);
      }
      if (a.arrivingInSeconds !== b.arrivingInSeconds) return a.arrivingInSeconds - b.arrivingInSeconds;
      const aRT = a.confidence === 'realtime' ? 0 : 1;
      const bRT = b.confidence === 'realtime' ? 0 : 1;
      return aRT - bRT;
    });

    // Deduplicate:
    // 1. Drop scheduled entries when a realtime entry for the same route has a close ETA (≤3 min)
    // 2. Drop duplicate scheduled entries for the same route+direction arriving within ~1 min
    const deduped: ApproachingVehicle[] = [];
    for (const v of sorted) {
      if (v.confidence === 'scheduled') {
        const hasRealtimeNearby = deduped.some(
          (u) =>
            u.confidence === 'realtime' &&
            u.routeId === v.routeId &&
            Math.abs(u.arrivingInSeconds - v.arrivingInSeconds) <= 3 * 60
        );
        if (hasRealtimeNearby) continue;

        const hasDuplicateScheduled = deduped.some(
          (u) =>
            u.routeId === v.routeId &&
            u.routeLongName === v.routeLongName &&
            Math.abs(u.arrivingInSeconds - v.arrivingInSeconds) < 60
        );
        if (hasDuplicateScheduled) continue;
      }
      deduped.push(v);
    }

    // At most one "passed this stop" realtime row: keep the closest by GPS distance
    const realtimePassed = deduped.filter((v) => v.passedStop);
    const withoutPassed = deduped.filter((v) => !v.passedStop);
    let singlePassed: ApproachingVehicle[] = [];
    if (realtimePassed.length > 1) {
      const keeper = realtimePassed.reduce((a, b) => {
        const da = a.distanceMeters ?? Number.POSITIVE_INFINITY;
        const db = b.distanceMeters ?? Number.POSITIVE_INFINITY;
        if (da !== db) return da < db ? a : b;
        return a.arrivingInSeconds > b.arrivingInSeconds ? a : b;
      });
      singlePassed = [keeper];
    } else {
      singlePassed = realtimePassed;
    }
    const merged = [...singlePassed, ...withoutPassed];
    const resorted = merged.sort((a, b) => {
      if (a.passedStop !== b.passedStop) return a.passedStop ? -1 : 1;
      if (a.passedStop && b.passedStop) {
        return (b.distanceMeters ?? 0) - (a.distanceMeters ?? 0);
      }
      if (a.arrivingInSeconds !== b.arrivingInSeconds) return a.arrivingInSeconds - b.arrivingInSeconds;
      const aRT = a.confidence === 'realtime' ? 0 : 1;
      const bRT = b.confidence === 'realtime' ? 0 : 1;
      return aRT - bRT;
    });

    const isAllTerminus = routesInTopology > 0 && terminusRoutes === routesInTopology;
    return { vehicles: resorted, isAllTerminus };
  }, [
    stopId,
    stopTimetable,
    routeStopsCache,
    vehiclePositions,
    tripUpdates,
    nowMs,
    stopsById,
    routesById,
  ]);

  return { vehicles, loading: loading || (!!stopId && !stopTimetable && !error), error, isAllTerminus };
}
