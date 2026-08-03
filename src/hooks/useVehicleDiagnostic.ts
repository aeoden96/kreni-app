/**
 * Diagnostic hook for debugging a single vehicle / trip.
 *
 * Collects everything the app knows about one trip in a single place:
 *  - the raw GTFS-RT vehicle position (including app-derived fields such as
 *    dead-reckoning and the stationary anchor)
 *  - the raw GTFS-RT trip update with all stop-time updates
 *  - the static trip (headsign, direction, service, shape) and its ordered
 *    stop list from the route timetable
 *  - the merged schedule + realtime view per stop, and where the vehicle
 *    currently is along that list
 *  - service alerts affecting the trip's route
 *
 * The returned `VehicleDiagnostic` is intentionally a plain, fully
 * JSON-serialisable structure (no Maps, no `Stop` object references) so the
 * debug panel can hand it straight to `JSON.stringify` for copy/paste.
 *
 * Only mounted while the debug panel is open, so no production overhead.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import type { Route, RouteTimetable, Stop, Trip } from '../utils/gtfs';
import type {
  ParsedServiceAlert,
  ParsedTripUpdate,
  ParsedVehiclePosition,
} from '../utils/realtime';

import { useRealtimeStore } from '../stores/realtimeStore';
import { haversineMeters } from '../utils/format';
import { fetchRouteTimetable, fetchRouteTrips, minutesToTime } from '../utils/gtfs';
import { getRouteVehicleStopPreview } from '../utils/vehicles';
import { useStaticTripResolver } from './useStaticTripResolver';

export interface VehicleDiagnostic {
  /** Service alerts whose `routeIds` contain this trip's route */
  alerts: ParsedServiceAlert[];
  /** POSIX ms at which this snapshot was derived */
  capturedAt: string;
  progress: VehicleProgress;
  route: null | VehicleRouteInfo;
  /** Ordered stops of the trip, schedule merged with realtime */
  stops: VehicleTripStop[];
  /** Where `stops` came from — the static timetable, the feed, or nothing */
  stopsSource: 'none' | 'timetable' | 'tripUpdate';
  trip: null | Trip;
  tripId: string;
  tripUpdate: null | ParsedTripUpdate;
  vehiclePos: null | ParsedVehiclePosition;
}

export interface VehicleProgress {
  /**
   * Index into `stops` the vehicle is considered to be at / heading to, using
   * the same GPS-first resolution as the route panel. -1 when unknown.
   */
  currentIndex: number;
  /** `current_stop_id` as reported by the feed */
  currentStopId: null | string;
  /** `current_stop_sequence` as reported by the feed */
  currentStopSequence: null | number;
  /** Straight-line distance vehicle → next stop, in metres */
  distanceToNextStopMeters: null | number;
  /** Age of the position timestamp, in seconds */
  gpsAgeSeconds: null | number;
  /** Index resolved purely from GPS projection onto the stop list; -1 if none */
  gpsIndex: number;
  nextStopId: null | string;
  nextStopName: null | string;
  /** How long the vehicle has reported roughly the same position, in seconds */
  stationarySeconds: null | number;
  /** Stops left after `currentIndex`, including it */
  stopsRemaining: null | number;
  /** `VehicleStopStatus` numeric value from the feed */
  stopStatus: null | number;
  /** Trip-level delay from the trip update, in seconds */
  tripDelaySeconds: null | number;
}

export interface VehicleTripStop {
  arrivalDelaySeconds: null | number;
  /** POSIX seconds from the trip update */
  arrivalTime: null | number;
  departureDelaySeconds: null | number;
  departureTime: null | number;
  /** Straight-line distance vehicle → this stop in metres; null without GPS */
  distanceMeters: null | number;
  index: number;
  lat: null | number;
  lon: null | number;
  /** True when the vehicle is estimated to have already passed this stop */
  passed: boolean;
  scheduledMinutes: null | number;
  /** `scheduledMinutes` rendered as HH:MM */
  scheduledTime: null | string;
  /** `ScheduleRelationship` numeric value from the trip update */
  scheduleRelationship: null | number;
  sequence: null | number;
  stopId: string;
  stopName: string;
}

interface VehicleDiagnosticResult {
  diagnostic: null | VehicleDiagnostic;
  error: Error | null;
  loading: boolean;
}

interface VehicleRouteInfo {
  id: string;
  longName: string;
  shortName: string;
  type: number;
}

export function useVehicleDiagnostic(
  tripId: null | string,
  stopsById: Map<string, Stop>,
  routesById: Map<string, Route>,
  nowMs: number,
  options: { dataDir?: string } = {}
): VehicleDiagnosticResult {
  const { dataDir = 'data' } = options;

  const vehiclePositions = useRealtimeStore((s) => s.vehiclePositions);
  const tripUpdates = useRealtimeStore((s) => s.tripUpdates);
  const serviceAlerts = useRealtimeStore((s) => s.serviceAlerts);

  // `tripId` here is the realtime ID of a vehicle the user focused, so these two
  // are realtime-keyed lookups with a realtime key — exact is correct.
  const vehiclePos = tripId ? (vehiclePositions.get(tripId) ?? null) : null;
  const tripUpdate = tripId ? (tripUpdates.get(tripId) ?? null) : null;
  const routeId = vehiclePos?.routeId ?? tripUpdate?.routeId ?? null;

  const [routeTimetable, setRouteTimetable] = useState<null | RouteTimetable>(null);
  const [routeTrips, setRouteTrips] = useState<null | Trip[]>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchingForRouteId = useRef<null | string>(null);

  useEffect(() => {
    if (!routeId) {
      fetchingForRouteId.current = null;
      setRouteTimetable(null);
      setRouteTrips(null);
      setError(null);
      setLoading(false);
      return;
    }

    fetchingForRouteId.current = routeId;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchRouteTimetable(routeId, dataDir),
      // Trip metadata is a nice-to-have — a missing routes/{id}.json must not
      // hide the realtime context, which is the point of this panel.
      fetchRouteTrips(routeId, dataDir).catch(() => null),
    ])
      .then(([timetable, trips]) => {
        if (fetchingForRouteId.current !== routeId) return;
        setRouteTimetable(timetable);
        setRouteTrips(trips?.trips ?? null);
        setLoading(false);
      })
      .catch((err) => {
        if (fetchingForRouteId.current !== routeId) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
  }, [routeId, dataDir]);

  const timetableTripIds = useMemo(() => Object.keys(routeTimetable ?? {}), [routeTimetable]);
  const resolver = useStaticTripResolver(timetableTripIds, { dataDir });

  const diagnostic = useMemo<null | VehicleDiagnostic>(() => {
    if (!tripId) return null;

    const route = routeId ? routesById.get(routeId) : undefined;
    // Both static collections are keyed by static trip IDs while `tripId` comes
    // from the realtime feed. Resolving once and reusing the result keeps the
    // timetable and the trip record agreeing on which trip this vehicle is.
    const staticTripId = resolver.resolve(tripId);
    const trip = routeTrips?.find((t) => t.id === staticTripId) ?? null;

    const stopTimeUpdateByStopId = new Map(
      (tripUpdate?.stopTimeUpdates ?? []).map((stu) => [stu.stopId, stu])
    );

    const preview = getRouteVehicleStopPreview({
      resolver,
      routeTimetable,
      stopsById,
      tripId,
      tripUpdate,
      vehicleLat: vehiclePos?.latitude ?? 0,
      vehicleLon: vehiclePos?.longitude ?? 0,
      vehiclePos,
    });

    // Prefer the static timetable — it is the full trip. Fall back to the feed's
    // stop-time updates for trips the static data does not know (e.g. ADDED).
    const timetableStops = preview.tripStops;
    const stopsSource: VehicleDiagnostic['stopsSource'] = timetableStops
      ? 'timetable'
      : tripUpdate?.stopTimeUpdates.length
        ? 'tripUpdate'
        : 'none';

    const rawStops: { scheduledMinutes: null | number; sequence: null | number; stopId: string }[] =
      timetableStops
        ? timetableStops.map(([stopId, sequence, timeMinutes]) => ({
            scheduledMinutes: timeMinutes,
            sequence,
            stopId,
          }))
        : (tripUpdate?.stopTimeUpdates ?? []).map((stu) => ({
            scheduledMinutes: null,
            sequence: stu.stopSequence ?? null,
            stopId: stu.stopId,
          }));

    const currentIndex = preview.primaryIdx;

    const stops: VehicleTripStop[] = rawStops.map((raw, index) => {
      const stop = stopsById.get(raw.stopId);
      const stu = stopTimeUpdateByStopId.get(raw.stopId);

      return {
        arrivalDelaySeconds: stu?.arrivalDelay ?? null,
        arrivalTime: stu?.arrivalTime ?? null,
        departureDelaySeconds: stu?.departureDelay ?? null,
        departureTime: stu?.departureTime ?? null,
        distanceMeters:
          vehiclePos && stop
            ? Math.round(
                haversineMeters(vehiclePos.latitude, vehiclePos.longitude, stop.lat, stop.lon)
              )
            : null,
        index,
        lat: stop?.lat ?? null,
        lon: stop?.lon ?? null,
        passed: currentIndex !== -1 && index < currentIndex,
        scheduledMinutes: raw.scheduledMinutes,
        scheduledTime: raw.scheduledMinutes !== null ? minutesToTime(raw.scheduledMinutes) : null,
        scheduleRelationship: stu?.scheduleRelationship ?? null,
        sequence: raw.sequence,
        stopId: raw.stopId,
        stopName: stop?.name ?? raw.stopId,
      };
    });

    const nextStop = currentIndex !== -1 ? (stops[currentIndex] ?? null) : null;

    const progress: VehicleProgress = {
      currentIndex,
      currentStopId: vehiclePos?.currentStopId ?? null,
      currentStopSequence: vehiclePos?.currentStopSequence ?? null,
      distanceToNextStopMeters: nextStop?.distanceMeters ?? null,
      gpsAgeSeconds: vehiclePos ? Math.round(nowMs / 1000 - vehiclePos.timestamp) : null,
      gpsIndex: preview.gpsPrimaryIdx,
      nextStopId: nextStop?.stopId ?? null,
      nextStopName: nextStop?.stopName ?? null,
      stationarySeconds: vehiclePos?.stationarySeconds ?? null,
      stopsRemaining: currentIndex !== -1 ? stops.length - currentIndex : null,
      stopStatus: vehiclePos?.status ?? null,
      tripDelaySeconds: tripUpdate?.delay ?? null,
    };

    return {
      alerts: routeId ? serviceAlerts.filter((a) => a.routeIds.includes(routeId)) : [],
      capturedAt: new Date(nowMs).toISOString(),
      progress,
      route: route
        ? { id: route.id, longName: route.longName, shortName: route.shortName, type: route.type }
        : null,
      stops,
      stopsSource,
      trip,
      tripId,
      tripUpdate,
      vehiclePos,
    };
  }, [
    tripId,
    routeId,
    routesById,
    resolver,
    routeTimetable,
    routeTrips,
    serviceAlerts,
    stopsById,
    tripUpdate,
    vehiclePos,
    nowMs,
  ]);

  return {
    diagnostic,
    error,
    loading: loading || (!!routeId && !routeTimetable && !error),
  };
}
