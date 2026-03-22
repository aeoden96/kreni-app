/**
 * Diagnostic hook for debugging stop → vehicle matching.
 *
 * Runs the same matching logic as useApproachingVehicles but surfaces
 * ALL trips (not just the included ones) together with the exact reason
 * each trip was included or dropped.
 *
 * Only active when sandboxVisible is true so no extra overhead is incurred
 * in production.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import type { Stop, Route, StopTimetable, RouteStopsData } from '../utils/gtfs';
import { fetchStopTimetable, fetchRouteStops } from '../utils/gtfs';
import { useRealtimeStore } from '../stores/realtimeStore';
import { computeVehicleStopProgress } from '../utils/vehicles';
import type { ParsedVehiclePosition, ParsedTripUpdate } from '../utils/realtime';

// ── Mirror of the constants in useApproachingVehicles ──────────────────────
const LOOKAHEAD_MINUTES = 30;
const ARRIVED_GRACE_SECONDS = 30;
const PASSED_STOP_DISTANCE_METERS = 400;

// Diagnostic window is wider: show everything within ±60 min so developers
// can see trips that ALMOST made it into the window.
const DIAG_PAST_SECONDS = 60 * 60;
const DIAG_FUTURE_SECONDS = 60 * 60;

export type TripFilterReason =
  | 'ok'                   // passed all filters — would appear in approaching list
  | 'terminus'             // this stop is the last stop of the route direction (arriving, not departing)
  | 'outside_window'       // ETA is beyond LOOKAHEAD_MINUTES
  | 'past_grace_window'    // scheduled-only trip already departed (> ARRIVED_GRACE_SECONDS ago)
  | 'passed_stop_too_far'  // GPS shows vehicle has already passed stop and is > 400 m away
  | 'beyond_diag_window';  // outside the ±60-min diagnostic window (collapsed in UI)

export interface TripDiagnostic {
  tripId: string;
  routeId: string;
  routeShortName: string;
  routeLongName: string;
  routeType: number;

  scheduledMinutes: number;
  /** Delay in seconds from trip update; null = no realtime data */
  delaySeconds: number | null;
  /** ETA in POSIX seconds (scheduled + delay) */
  etaAbsoluteSeconds: number;
  /** Seconds until arrival: positive = future, negative = passed */
  arrivingInSeconds: number;

  /** True if the realtime feed has a position for this trip */
  hasVehiclePosition: boolean;
  vehiclePos: ParsedVehiclePosition | null;
  tripUpdate: ParsedTripUpdate | null;

  /** Straight-line distance vehicle → stop in metres; null = no GPS */
  distanceMeters: number | null;
  /** Integer stops remaining; null = no GPS data */
  stopsAway: number | null;
  passedStop: boolean;
  /** Direction key the stop was found in (e.g. "0" or "1"); null = not found */
  directionKey: string | null;
  /** Stop index within orderedStops for that direction; -1 = not found */
  targetStopIndex: number;

  filterReason: TripFilterReason;
  included: boolean;
}

interface StopDiagnosticResult {
  diagnostics: TripDiagnostic[];
  loading: boolean;
  error: Error | null;
  /** Derived summary stats */
  totalTrips: number;
  tripsWithGPS: number;
  tripsIncluded: number;
}

/** Haversine distance (metres) — mirrors useApproachingVehicles */
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

export function useStopDiagnostic(
  stopId: string | null,
  stopsById: Map<string, Stop>,
  routesById: Map<string, Route>,
  nowMs: number,
  options: { dataDir?: string } = {}
): StopDiagnosticResult {
  const { dataDir = 'data' } = options;
  const [stopTimetable, setStopTimetable] = useState<StopTimetable | null>(null);
  const [routeStopsCache, setRouteStopsCache] = useState<Map<string, RouteStopsData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const vehiclePositions = useRealtimeStore((s) => s.vehiclePositions);
  const tripUpdates = useRealtimeStore((s) => s.tripUpdates);

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
        if (fetchingForStopId.current !== stopId) return;
        setStopTimetable(timetable);

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

  const diagnostics = useMemo<TripDiagnostic[]>(() => {
    if (!stopId || !stopTimetable) return [];

    const nowSeconds = nowMs / 1000;
    const midnightMs = (() => {
      const d = new Date(nowMs);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })();
    const midnightSeconds = midnightMs / 1000;

    const productionWindowEnd = nowSeconds + LOOKAHEAD_MINUTES * 60;
    const diagPast = nowSeconds - DIAG_PAST_SECONDS;
    const diagFuture = nowSeconds + DIAG_FUTURE_SECONDS;

    const targetStop = stopsById.get(stopId);
    const results: TripDiagnostic[] = [];

    for (const [routeId, trips] of Object.entries(stopTimetable)) {
      const route = routesById.get(routeId);
      if (!route) continue;

      const routeStopsData = routeStopsCache.get(routeId);

      // Find direction containing this stop
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

      // Pre-compute whether this stop is the terminal for this route direction
      const routeStopCount =
        directionKey !== null ? (routeStopsData?.orderedStops?.[directionKey]?.length ?? 0) : 0;
      const isTerminusRoute =
        targetStopIndex >= 0 && routeStopCount > 1 && targetStopIndex === routeStopCount - 1;

      for (const [tripId, { time: scheduledMinutes }] of Object.entries(trips)) {
        const vehiclePos = vehiclePositions.get(tripId) ?? null;
        const tripUpdate = tripUpdates.get(tripId) ?? null;

        // Resolve delay
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

        const etaAbsoluteSeconds = midnightSeconds + scheduledMinutes * 60 + (delaySeconds ?? 0);
        const arrivingInSeconds = etaAbsoluteSeconds - nowSeconds;

        // Skip trips completely outside the diagnostic window (too old / too future)
        if (etaAbsoluteSeconds < diagPast || etaAbsoluteSeconds > diagFuture) {
          // Still include a collapsed entry so the developer knows it existed
          results.push({
            tripId,
            routeId,
            routeShortName: route.shortName,
            routeLongName: route.longName,
            routeType: route.type,
            scheduledMinutes,
            delaySeconds,
            etaAbsoluteSeconds,
            arrivingInSeconds,
            hasVehiclePosition: vehiclePos !== null,
            vehiclePos,
            tripUpdate,
            distanceMeters: null,
            stopsAway: null,
            passedStop: false,
            directionKey,
            targetStopIndex,
            filterReason: 'beyond_diag_window',
            included: false,
          });
          continue;
        }

        // ── Replicate production filter logic exactly ──────────────────────

        // Compute stops-away and passedStop via GPS projection
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
              passedStop = true;
              stopsAway = 0;
            } else {
              stopsAway = Math.max(0, Math.ceil(rawStopsAway));
            }
          }
        }

        const distanceMeters =
          vehiclePos && targetStop
            ? Math.round(haversineMeters(vehiclePos.latitude, vehiclePos.longitude, targetStop.lat, targetStop.lon))
            : null;

        // Determine filter reason
        let filterReason: TripFilterReason = 'ok';
        let included = true;

        // 0. Terminus — this stop is the last stop of the route direction
        if (isTerminusRoute) {
          filterReason = 'terminus';
          included = false;
        }

        // 1. Outside lookahead window
        if (included && etaAbsoluteSeconds > productionWindowEnd) {
          filterReason = 'outside_window';
          included = false;
        }

        // 2. GPS vehicle already passed and is too far away
        if (
          included &&
          vehiclePos &&
          passedStop &&
          distanceMeters !== null &&
          distanceMeters > PASSED_STOP_DISTANCE_METERS
        ) {
          filterReason = 'passed_stop_too_far';
          included = false;
        }

        // 3. Scheduled-only trip past grace window
        if (included && !vehiclePos && arrivingInSeconds < -ARRIVED_GRACE_SECONDS) {
          filterReason = 'past_grace_window';
          included = false;
        }

        // 4. GPS vehicle: no position but arrivingInSeconds < -ARRIVED_GRACE_SECONDS
        if (included && !vehiclePos && arrivingInSeconds < -ARRIVED_GRACE_SECONDS) {
          filterReason = 'past_grace_window';
          included = false;
        }

        results.push({
          tripId,
          routeId,
          routeShortName: route.shortName,
          routeLongName: route.longName,
          routeType: route.type,
          scheduledMinutes,
          delaySeconds,
          etaAbsoluteSeconds,
          arrivingInSeconds,
          hasVehiclePosition: vehiclePos !== null,
          vehiclePos,
          tripUpdate,
          distanceMeters,
          stopsAway,
          passedStop,
          directionKey,
          targetStopIndex,
          filterReason,
          included,
        });
      }
    }

    // Sort by ETA
    return results.sort((a, b) => a.arrivingInSeconds - b.arrivingInSeconds);
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

  const totalTrips = diagnostics.filter((d) => d.filterReason !== 'beyond_diag_window').length;
  const tripsWithGPS = diagnostics.filter((d) => d.hasVehiclePosition).length;
  const tripsIncluded = diagnostics.filter((d) => d.included).length;

  return {
    diagnostics,
    loading: loading || (!!stopId && !stopTimetable && !error),
    error,
    totalTrips,
    tripsWithGPS,
    tripsIncluded,
  };
}
