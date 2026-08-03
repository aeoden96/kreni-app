/**
 * Vehicle position utilities.
 *
 * Realtime GPS positions (from the GTFS-RT proxy worker) are the primary source.
 * The schedule-based interpolation functions below are kept commented out for
 * future reference or fallback purposes.
 */

import type { ActiveTrip, Route, RouteTimetable, Stop } from './gtfs';
import type { StaticTripResolver } from './staticTripResolver';

import { type ParsedTripUpdate, type ParsedVehiclePosition, VehicleStopStatus } from './realtime';

export interface AllVehiclePosition extends VehiclePosition {
  routeId: string;
  routeShortName: string;
  routeType: number; // 0 = Tram, 3 = Bus
}

export interface VehiclePosition {
  bearing?: number; // degrees 0-360
  delay?: number; // seconds (negative = early)
  direction: number;
  headsign: string;
  // ── Realtime fields (present when isRealtime === true) ──
  isRealtime: boolean;
  lat: number;
  lon: number;
  progress: number; // 0-1 fractional progress along route (0 when realtime)
  speed?: number; // m/s
  timestamp?: number; // POSIX timestamp of the GPS fix
  tripId: string;
  vehicleId?: string;
}

/** Maps to `t('routeBar.<kind>')` in the UI. */
type RouteVehicleStopLabelKind = 'arrivingAt' | 'atStop' | 'nextStop';

interface RouteVehicleStopPreview {
  currentStop: null | Stop;
  currentStopId: string | undefined;
  derivedNextStop: null | Stop;
  derivedNextStopId: null | string;
  /** Fractional index along `orderedStopIdsForSort` (for ordering vehicles on a direction). */
  directionSortProgress: number;
  gpsNextStop: null | Stop;
  gpsPrimaryIdx: number;
  labelKind: null | RouteVehicleStopLabelKind;
  /** Resolved index for timetable primary row + upcoming stops; -1 if unknown. */
  primaryIdx: number;
  stopDetail: null | string;
  stopStatus: ParsedVehiclePosition['status'];
  tripStops: [string, number, number][] | null;
}

/**
 * Given a vehicle's GPS position and an ordered array of stops (for a single
 * direction), returns a fractional index representing where along the stop
 * sequence the vehicle is.
 *
 * e.g. 2.4 means ~40% of the way between stop index 2 and stop index 3.
 *
 * Uses simple Euclidean distance in lat/lon space (sufficient for city scale).
 */
export function computeVehicleStopProgress(
  vehicleLat: number,
  vehicleLon: number,
  stops: Array<{ lat: number; lon: number }>
): number {
  if (stops.length === 0) return 0;
  if (stops.length === 1) return 0;

  let bestScore = Infinity;
  let bestIndex = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const { lat: lat1, lon: lon1 } = stops[i];
    const { lat: lat2, lon: lon2 } = stops[i + 1];

    // Project vehicle onto the segment (i → i+1)
    const dx = lat2 - lat1;
    const dy = lon2 - lon1;
    const lenSq = dx * dx + dy * dy;

    let t = 0;
    if (lenSq > 0) {
      t = ((vehicleLat - lat1) * dx + (vehicleLon - lon1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }

    const projLat = lat1 + t * dx;
    const projLon = lon1 + t * dy;
    const distSq = (vehicleLat - projLat) ** 2 + (vehicleLon - projLon) ** 2;

    if (distSq < bestScore) {
      bestScore = distSq;
      bestIndex = i + t;
    }
  }

  return bestIndex;
}

/**
 * GPS-first next-stop resolution for a single trip (same rules as the route panel).
 * Optionally computes `directionSortProgress` when `orderedStopIdsForSort` is provided.
 */
export function getRouteVehicleStopPreview(args: {
  orderedStopIdsForSort?: string[];
  /** Realtime → static trip ID resolution for `routeTimetable`. Omitted means exact-only. */
  resolver?: null | StaticTripResolver;
  routeTimetable?: null | RouteTimetable;
  stopsById: Map<string, Stop>;
  tripId: string;
  tripUpdate?: null | ParsedTripUpdate;
  vehicleLat: number;
  vehicleLon: number;
  vehiclePos?: null | ParsedVehiclePosition;
}): RouteVehicleStopPreview {
  const {
    orderedStopIdsForSort,
    resolver,
    routeTimetable,
    stopsById,
    tripId,
    tripUpdate,
    vehicleLat,
    vehicleLon,
    vehiclePos,
  } = args;

  // `routeTimetable` is keyed by *static* trip IDs while `tripId` comes from the
  // realtime feed, so this needs the same drift resolution as route membership —
  // otherwise the focused vehicle's itinerary is permanently empty and every
  // GPS-derived next stop falls back to the trip-update path alone.
  const staticTripId = resolver ? resolver.resolve(tripId) : tripId;
  const tripStops = (staticTripId === undefined ? null : routeTimetable?.[staticTripId]) ?? null;

  const currentStopId = vehiclePos?.currentStopId;
  const stopStatus = vehiclePos?.status;
  const currentStop =
    currentStopId !== undefined && currentStopId !== ''
      ? (stopsById.get(currentStopId) ?? null)
      : null;

  const stopUpdates = tripUpdate?.stopTimeUpdates ?? [];
  const derivedNextStopId = !currentStop && stopUpdates.length > 0 ? stopUpdates[0].stopId : null;
  const derivedNextStop =
    derivedNextStopId !== null ? (stopsById.get(derivedNextStopId) ?? null) : null;

  let gpsPrimaryIdx = -1;
  if (vehiclePos && tripStops) {
    const coords: Array<{ lat: number; lon: number }> = [];
    for (const [stopId] of tripStops) {
      const s = stopsById.get(stopId);
      if (!s) {
        coords.length = 0;
        break;
      }
      coords.push({ lat: s.lat, lon: s.lon });
    }
    if (coords.length >= 2) {
      const progress = computeVehicleStopProgress(
        vehiclePos.latitude,
        vehiclePos.longitude,
        coords
      );
      gpsPrimaryIdx = Math.min(Math.ceil(progress), tripStops.length - 1);
    }
  }

  // GPS projection can misidentify the vehicle's position on looping routes where the
  // same geographic location appears at multiple points in the trip (e.g. routes that
  // start and end at the same terminal). The nearest-segment algorithm picks the wrong
  // segment when an early stop is geometrically closer to a late segment than to its own.
  // When GPS and the GTFS-RT currentStopId disagree by more than 3 stops, trust the
  // GTFS-RT value — it is the authoritative ground truth from the vehicle's transponder.
  if (gpsPrimaryIdx !== -1 && currentStopId && tripStops) {
    const currentIdx = tripStops.findIndex(([id]) => id === currentStopId);
    if (currentIdx !== -1 && Math.abs(gpsPrimaryIdx - currentIdx) > 3) {
      gpsPrimaryIdx =
        stopStatus === VehicleStopStatus.STOPPED_AT
          ? Math.min(currentIdx + 1, tripStops.length - 1)
          : currentIdx;
    }
  }

  const gpsNextStop =
    gpsPrimaryIdx !== -1 && tripStops ? (stopsById.get(tripStops[gpsPrimaryIdx][0]) ?? null) : null;

  let primaryIdx = gpsPrimaryIdx;
  if (primaryIdx === -1 && tripStops) {
    const primaryId = currentStopId || derivedNextStopId;
    primaryIdx = primaryId ? tripStops.findIndex(([id]) => id === primaryId) : -1;
  }

  let labelKind: null | RouteVehicleStopLabelKind = null;
  let stopDetail: null | string = null;
  if (gpsNextStop) {
    labelKind = 'nextStop';
    stopDetail = gpsNextStop.name;
  } else if (currentStop) {
    if (stopStatus === VehicleStopStatus.STOPPED_AT) {
      labelKind = 'atStop';
      stopDetail = currentStop.name;
    } else if (stopStatus === VehicleStopStatus.INCOMING_AT) {
      labelKind = 'arrivingAt';
      stopDetail = currentStop.name;
    } else {
      labelKind = 'nextStop';
      stopDetail = currentStop.name;
    }
  } else if (derivedNextStop) {
    labelKind = 'nextStop';
    stopDetail = derivedNextStop.name;
  }

  let directionSortProgress = 0;
  if (orderedStopIdsForSort?.length) {
    const coords: Array<{ lat: number; lon: number }> = [];
    for (const id of orderedStopIdsForSort) {
      const s = stopsById.get(id);
      if (!s) {
        coords.length = 0;
        break;
      }
      coords.push({ lat: s.lat, lon: s.lon });
    }
    if (coords.length >= 2) {
      directionSortProgress = computeVehicleStopProgress(vehicleLat, vehicleLon, coords);
    }
  }

  return {
    currentStop,
    currentStopId,
    derivedNextStop,
    derivedNextStopId,
    directionSortProgress,
    gpsNextStop,
    gpsPrimaryIdx,
    labelKind,
    primaryIdx,
    stopDetail,
    stopStatus,
    tripStops,
  };
}

/**
 * Calculate stop-aware progress based on scheduled stop times.
 * Interpolates between stops using their time and shape progress.
 *
 * @param stopTimes Array of [time_minutes, shape_progress] tuples
 * @param currentMinutes Current time in minutes from midnight
 * @returns Progress fraction (0-1) based on stop timing
 */
export function getStopAwareProgress(
  stopTimes: [number, number][],
  currentMinutes: number
): number {
  if (stopTimes.length === 0) {
    return 0;
  }

  // Before first stop
  if (currentMinutes <= stopTimes[0][0]) {
    return stopTimes[0][1];
  }

  // After last stop
  if (currentMinutes >= stopTimes[stopTimes.length - 1][0]) {
    return stopTimes[stopTimes.length - 1][1];
  }

  // Find bracketing stops
  for (let i = 0; i < stopTimes.length - 1; i++) {
    const [time1, progress1] = stopTimes[i];
    const [time2, progress2] = stopTimes[i + 1];

    if (currentMinutes >= time1 && currentMinutes <= time2) {
      // Linear interpolation between stops
      const timeDiff = time2 - time1;
      if (timeDiff <= 0) {
        return progress1;
      }

      const timeProgress = (currentMinutes - time1) / timeDiff;
      return progress1 + (progress2 - progress1) * timeProgress;
    }
  }

  // Fallback (should not reach here)
  return stopTimes[stopTimes.length - 1][1];
}

// ============================================================
// Schedule-based interpolation — replaced by realtime GPS.
// Kept for reference / potential fallback use.
// ============================================================

/*
export function getActiveVehicles(
  trips: ActiveTrip[],
  shapes: Record<string, [number, number][]>,
  currentMinutes: number,
  serviceId: string
): VehiclePosition[] {
  const vehicles: VehiclePosition[] = [];

  for (const trip of trips) {
    if (!trip.id.startsWith(serviceId)) continue;
    if (currentMinutes < trip.start || currentMinutes > trip.end) continue;

    const shape = shapes[trip.shapeId];
    if (!shape || shape.length === 0) continue;

    let progress: number;
    if (trip.stopTimes && trip.stopTimes.length > 0) {
      progress = getStopAwareProgress(trip.stopTimes, currentMinutes);
    } else {
      const tripDuration = trip.end - trip.start;
      const elapsed = currentMinutes - trip.start;
      progress = tripDuration > 0 ? elapsed / tripDuration : 0;
    }

    const [lat, lon] = interpolatePosition(shape, progress);
    vehicles.push({ tripId: trip.id, lat, lon, headsign: trip.headsign, direction: trip.direction, progress, isRealtime: false });
  }

  return vehicles;
}
*/

// ============================================================
// Realtime GPS mapping functions
// ============================================================

/**
 * Interpolate position along a shape polyline based on progress (0-1)
 */
export function interpolatePosition(shape: [number, number][], progress: number): [number, number] {
  if (shape.length === 0) {
    return [0, 0];
  }

  if (shape.length === 1 || progress <= 0) {
    return shape[0];
  }

  if (progress >= 1) {
    return shape[shape.length - 1];
  }

  // Calculate total path length
  let totalLength = 0;
  const segmentLengths: number[] = [];

  for (let i = 1; i < shape.length; i++) {
    const [lat1, lon1] = shape[i - 1];
    const [lat2, lon2] = shape[i];
    const segmentLength = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
    segmentLengths.push(segmentLength);
    totalLength += segmentLength;
  }

  // Find target distance along path
  const targetDistance = progress * totalLength;

  // Find which segment contains the target point
  let accumulatedDistance = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    const segmentEnd = accumulatedDistance + segmentLengths[i];

    if (targetDistance <= segmentEnd) {
      // Interpolate within this segment
      const segmentProgress = (targetDistance - accumulatedDistance) / segmentLengths[i];
      const [lat1, lon1] = shape[i];
      const [lat2, lon2] = shape[i + 1];

      return [lat1 + (lat2 - lat1) * segmentProgress, lon1 + (lon2 - lon1) * segmentProgress];
    }

    accumulatedDistance = segmentEnd;
  }

  // Should not reach here, but return last point as fallback
  return shape[shape.length - 1];
}

/**
 * Map ParsedVehiclePosition entries to AllVehiclePosition objects
 * for the all-routes overview.
 *
 * @param positions - Map of tripId → ParsedVehiclePosition from the realtime store
 * @param tripUpdates - Map of tripId → ParsedTripUpdate for delay data
 * @param routesById - Map of routeId → Route for route metadata
 */
export function mapRealtimeToAllVehiclePositions(
  positions: Map<string, ParsedVehiclePosition>,
  tripUpdates: Map<string, ParsedTripUpdate>,
  routesById: Map<string, Route>
): AllVehiclePosition[] {
  const result: AllVehiclePosition[] = [];

  for (const [tripId, pos] of positions) {
    if (!pos.routeId) continue;

    const route = routesById.get(pos.routeId);
    // Skip vehicles whose route isn't in our static data
    if (!route) continue;

    const update = tripUpdates.get(tripId);

    result.push({
      bearing: pos.bearing,
      delay: update?.delay,
      direction: 0, // direction not available from realtime feed alone
      headsign: route.longName || route.shortName,
      isRealtime: true,
      lat: pos.latitude,
      lon: pos.longitude,
      progress: 0,
      routeId: pos.routeId,
      routeShortName: route.shortName,
      routeType: route.type,
      speed: pos.speed,
      timestamp: pos.timestamp,
      tripId,
      vehicleId: pos.vehicleId,
    });
  }

  return result;
}

// ============================================================
// Nearest-stop progress computation (for metro diagram display)
// ============================================================

/**
 * Map ParsedVehiclePosition entries (from the GTFS-RT proxy) to
 * VehiclePosition objects for the single-route view.
 *
 * Trip membership normally comes from `routeTrips`, which also supplies the
 * headsign and direction. That index arrives over the network, so until it does
 * we fall back to the feed's own `routeId` — otherwise selecting a route would
 * leave the map with no vehicles at all until the fetch lands, and a vehicle the
 * user just clicked would blink out. Headsign and direction fill in once the
 * index is here; the fallback stops applying the moment it is.
 *
 * `routeTrips` is static data and the feed's trip IDs are not, so membership goes
 * through `resolver` rather than a bare `tripMeta.get(tripId)`. Without it, an
 * exact join scores zero whenever ZET's two feeds disagree on the service segment
 * and *every* vehicle is dropped the instant the index finishes loading — the
 * route panel showed "no vehicles on this line" while the map, which never joins
 * on trip ID, displayed them. See {@link createStaticTripResolver}.
 *
 * @param positions - Map of tripId → ParsedVehiclePosition from the realtime store
 * @param tripUpdates - Map of tripId → ParsedTripUpdate for delay data
 * @param routeTrips - Active trips for the selected route (used for headsign/direction lookup)
 * @param routeId - Selected route; used only for the pre-index fallback above
 * @param resolver - Realtime → static trip ID resolution. Omitted means exact-only.
 */
export function mapRealtimeToVehiclePositions(
  positions: Map<string, ParsedVehiclePosition>,
  tripUpdates: Map<string, ParsedTripUpdate>,
  routeTrips: ActiveTrip[],
  routeId?: null | string,
  resolver?: null | StaticTripResolver
): VehiclePosition[] {
  const tripMeta = new Map(routeTrips.map((t) => [t.id, t]));
  const indexLoaded = routeTrips.length > 0;
  const result: VehiclePosition[] = [];

  for (const [tripId, pos] of positions) {
    const staticTripId = resolver ? resolver.resolve(tripId) : tripId;
    const meta = staticTripId === undefined ? undefined : tripMeta.get(staticTripId);
    if (!meta && (indexLoaded || !routeId || pos.routeId !== routeId)) continue; // not on this route

    const update = tripUpdates.get(tripId);

    result.push({
      bearing: pos.bearing,
      delay: update?.delay,
      direction: meta?.direction ?? 0,
      headsign: meta?.headsign ?? '',
      isRealtime: true,
      lat: pos.latitude,
      lon: pos.longitude,
      progress: 0, // GPS-based; shape progress not computed
      speed: pos.speed,
      timestamp: pos.timestamp,
      tripId,
      vehicleId: pos.vehicleId,
    });
  }

  return result;
}

/*
export function getAllActiveVehicles(
  data: AllActiveTripsData,
  currentMinutes: number,
  serviceId: string
): AllVehiclePosition[] {
  const allVehicles: AllVehiclePosition[] = [];

  for (const [routeId, routeData] of Object.entries(data.routes)) {
    const { trips, type, shortName } = routeData;

    for (const trip of trips) {
      if (!trip.id.startsWith(serviceId)) continue;
      if (currentMinutes < trip.start || currentMinutes > trip.end) continue;

      const shape = data.shapes[trip.shapeId];
      if (!shape || shape.length === 0) continue;

      const tripDuration = trip.end - trip.start;
      const elapsed = currentMinutes - trip.start;
      const progress = tripDuration > 0 ? elapsed / tripDuration : 0;

      const [lat, lon] = interpolatePosition(shape, progress);

      allVehicles.push({
        tripId: trip.id, lat, lon, headsign: trip.headsign,
        direction: trip.direction, progress, isRealtime: false,
        routeId, routeShortName: shortName, routeType: type
      });
    }
  }

  return allVehicles;
}
*/
