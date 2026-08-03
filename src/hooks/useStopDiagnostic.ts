/**
 * Diagnostic hook for debugging stop → vehicle matching.
 *
 * Runs an *approximation* of the useStopDepartures matching logic but surfaces
 * ALL trips (not just the included ones) together with the reason each trip was
 * included or dropped. It intentionally does not replicate the newer refinements
 * (GPS-primary ETA fusion, passed-stop distance classification, passed-trip
 * memory) — it exists to inspect the raw inputs, not the fused output.
 *
 * The realtime join, however, must mirror production exactly. It previously used
 * a bare `vehiclePositions.get(tripId)`, which has scored zero since ZET's
 * realtime feed began running a service segment the static feed does not contain:
 * the panel reported `tripsWithGPS: 0` while the real board — which goes through
 * {@link matchRealtime} — was matching normally. A diagnostic that disagrees with
 * production is worse than no diagnostic, so the same exact-then-drift lookup and
 * the same active-service scoping are used here.
 *
 * Only active when sandboxVisible is true so no extra overhead is incurred
 * in production.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import type { Route, RouteStopsData, Stop, StopTimetable } from '../utils/gtfs';
import type { ParsedTripUpdate, ParsedVehiclePosition } from '../utils/realtime';

import { useRealtimeStore } from '../stores/realtimeStore';
import { fetchRouteStops, fetchStopTimetable } from '../utils/gtfs';
import { indexByTripKey, matchRealtime } from '../utils/tripIdMatch';
import { computeVehicleStopProgress } from '../utils/vehicles';
import { useInitialData } from './useInitialData';

// ── Mirror of the constants in useStopDepartures ───────────────────────────
const LOOKAHEAD_MINUTES = 30;
const ARRIVED_GRACE_SECONDS = 30;
const PASSED_STOP_DISTANCE_METERS = 400;

// Diagnostic window is wider: show everything within ±60 min so developers
// can see trips that ALMOST made it into the window.
const DIAG_PAST_SECONDS = 60 * 60;
const DIAG_FUTURE_SECONDS = 60 * 60;

export interface TripDiagnostic {
  /** Seconds until arrival: positive = future, negative = passed */
  arrivingInSeconds: number;
  /** Delay in seconds from trip update; null = no realtime data */
  delaySeconds: null | number;
  /** Direction key the stop was found in (e.g. "0" or "1"); null = not found */
  directionKey: null | string;
  /** Straight-line distance vehicle → stop in metres; null = no GPS */
  distanceMeters: null | number;
  /** ETA in POSIX seconds (scheduled + delay) */
  etaAbsoluteSeconds: number;

  filterReason: TripFilterReason;
  /** True if the realtime feed has a position for this trip */
  hasVehiclePosition: boolean;
  /**
   * Whether the trip belongs to today's calendar service (or yesterday's, for
   * after-midnight trips). Production requires this before allowing the drift
   * fallback, so a trip that is live but out of service explains a missing match.
   */
  inActiveService: boolean;
  included: boolean;
  /** How the realtime row was found — `drift` means the exact ID missed. */
  matchKind: 'drift' | 'exact' | 'none';
  passedStop: boolean;

  routeId: string;
  routeLongName: string;
  routeShortName: string;

  routeType: number;
  scheduledMinutes: number;
  /** Integer stops remaining; null = no GPS data */
  stopsAway: null | number;
  /** Stop index within orderedStops for that direction; -1 = not found */
  targetStopIndex: number;
  tripId: string;

  tripUpdate: null | ParsedTripUpdate;
  vehiclePos: null | ParsedVehiclePosition;
}

export type TripFilterReason =
  | 'beyond_diag_window' // outside the ±60-min diagnostic window (collapsed in UI)
  | 'ok' // passed all filters — would appear in approaching list
  | 'outside_window' // ETA is beyond LOOKAHEAD_MINUTES
  | 'passed_stop_too_far' // GPS shows vehicle has already passed stop and is > 400 m away
  | 'past_grace_window' // scheduled-only trip already departed (> ARRIVED_GRACE_SECONDS ago)
  | 'terminus'; // this stop is the last stop of the route direction (arriving, not departing)

interface StopDiagnosticResult {
  /** Today's calendar service, e.g. `0_4`. Null when the calendar has no entry. */
  activeServiceId: null | string;
  diagnostics: TripDiagnostic[];
  /** Trips matched only via the publication-stable key — the drift fallback. */
  driftHits: number;
  error: Error | null;
  /** Trips matched on the exact realtime trip ID. Zero while ZET's feeds disagree. */
  exactHits: number;
  /** Static publication the calendar came from, for spotting mixed-publication state. */
  feedVersion: string | undefined;
  loading: boolean;
  /** Yesterday's service — still owns after-midnight (≥ 24:00) trips. */
  previousServiceId: null | string;
  /** Derived summary stats */
  totalTrips: number;
  tripsIncluded: number;
  tripsWithGPS: number;
}

export function useStopDiagnostic(
  stopId: null | string,
  stopsById: Map<string, Stop>,
  routesById: Map<string, Route>,
  nowMs: number,
  options: { dataDir?: string } = {}
): StopDiagnosticResult {
  const { dataDir = 'data' } = options;
  const [stopTimetable, setStopTimetable] = useState<null | StopTimetable>(null);
  const [routeStopsCache, setRouteStopsCache] = useState<Map<string, RouteStopsData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const vehiclePositions = useRealtimeStore((s) => s.vehiclePositions);
  const tripUpdates = useRealtimeStore((s) => s.tripUpdates);
  const { calendar, feedVersion } = useInitialData({ dataDir });

  // Same secondary indexes production builds, for the same reason: re-deriving
  // them inside the per-trip loop would be quadratic over a stop's whole timetable.
  const vehiclePositionsByKey = useMemo(() => indexByTripKey(vehiclePositions), [vehiclePositions]);
  const tripUpdatesByKey = useMemo(() => indexByTripKey(tripUpdates), [tripUpdates]);

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

  // Hoisted out of the diagnostics memo so the panel can report them even when
  // the stop has no trips to show — a null activeServiceId is itself the finding.
  const { activeServiceId, previousServiceId } = useMemo(() => {
    // Local date, not toISOString(): at UTC+1/+2 the UTC date would keep serving
    // yesterday's calendar entry until 01:00/02:00 local. Mirrors useStopDepartures.
    const localDateStr = (ms: number) => {
      const d = new Date(ms);
      return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
        d.getDate()
      ).padStart(2, '0')}`;
    };
    return {
      activeServiceId: calendar[localDateStr(nowMs)] ?? null,
      previousServiceId: calendar[localDateStr(nowMs - 86_400_000)] ?? null,
    };
  }, [calendar, nowMs]);

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

      // Pre-compute whether this stop is the terminal for this route direction
      const routeStopCount =
        directionKey !== null ? (routeStopsData?.orderedStops?.[directionKey]?.length ?? 0) : 0;
      const isTerminusRoute =
        targetStopIndex >= 0 && routeStopCount > 1 && targetStopIndex === routeStopCount - 1;

      for (const [tripId, { time: scheduledMinutes }] of Object.entries(trips)) {
        // Mirrors useStopDepartures: service membership gates the drift fallback,
        // so it has to be decided before the lookup rather than after it.
        const inTodayService = activeServiceId !== null && tripId.startsWith(activeServiceId + '_');
        const inOvernightService =
          scheduledMinutes >= 1440 &&
          previousServiceId !== null &&
          tripId.startsWith(previousServiceId + '_');
        const inActiveService = inTodayService || inOvernightService;

        const exactVehiclePos = vehiclePositions.get(tripId);
        const vehiclePos =
          matchRealtime(vehiclePositions, vehiclePositionsByKey, tripId, inActiveService) ?? null;
        const tripUpdate =
          matchRealtime(tripUpdates, tripUpdatesByKey, tripId, inActiveService) ?? null;

        const matchKind: TripDiagnostic['matchKind'] =
          exactVehiclePos !== undefined ? 'exact' : vehiclePos !== null ? 'drift' : 'none';

        // Resolve delay
        let delaySeconds: null | number = null;
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
            arrivingInSeconds,
            delaySeconds,
            directionKey,
            distanceMeters: null,
            etaAbsoluteSeconds,
            filterReason: 'beyond_diag_window',
            hasVehiclePosition: vehiclePos !== null,
            inActiveService,
            included: false,
            matchKind,
            passedStop: false,
            routeId,
            routeLongName: route.longName,
            routeShortName: route.shortName,
            routeType: route.type,
            scheduledMinutes,
            stopsAway: null,
            targetStopIndex,
            tripId,
            tripUpdate,
            vehiclePos,
          });
          continue;
        }

        // ── Replicate production filter logic exactly ──────────────────────

        // Compute stops-away and passedStop via GPS projection
        let stopsAway: null | number = null;
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
            ? Math.round(
                haversineMeters(
                  vehiclePos.latitude,
                  vehiclePos.longitude,
                  targetStop.lat,
                  targetStop.lon
                )
              )
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
          arrivingInSeconds,
          delaySeconds,
          directionKey,
          distanceMeters,
          etaAbsoluteSeconds,
          filterReason,
          hasVehiclePosition: vehiclePos !== null,
          inActiveService,
          included,
          matchKind,
          passedStop,
          routeId,
          routeLongName: route.longName,
          routeShortName: route.shortName,
          routeType: route.type,
          scheduledMinutes,
          stopsAway,
          targetStopIndex,
          tripId,
          tripUpdate,
          vehiclePos,
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
    vehiclePositionsByKey,
    tripUpdatesByKey,
    activeServiceId,
    previousServiceId,
    nowMs,
    stopsById,
    routesById,
  ]);

  const totalTrips = diagnostics.filter((d) => d.filterReason !== 'beyond_diag_window').length;
  const tripsWithGPS = diagnostics.filter((d) => d.hasVehiclePosition).length;
  const tripsIncluded = diagnostics.filter((d) => d.included).length;
  const exactHits = diagnostics.filter((d) => d.matchKind === 'exact').length;
  const driftHits = diagnostics.filter((d) => d.matchKind === 'drift').length;

  return {
    activeServiceId,
    diagnostics,
    driftHits,
    error,
    exactHits,
    feedVersion,
    loading: loading || (!!stopId && !stopTimetable && !error),
    previousServiceId,
    totalTrips,
    tripsIncluded,
    tripsWithGPS,
  };
}

/** Haversine distance (metres) — mirrors useStopDepartures */
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
