/**
 * Vehicle position utilities.
 *
 * Realtime GPS positions (from the GTFS-RT proxy worker) are the primary source.
 * The schedule-based interpolation functions below are kept commented out for
 * future reference or fallback purposes.
 */

import type { ActiveTrip, Route } from './gtfs';
import type { ParsedVehiclePosition, ParsedTripUpdate } from './realtime';

export interface VehiclePosition {
  tripId: string;
  lat: number;
  lon: number;
  headsign: string;
  direction: number;
  progress: number; // 0-1 fractional progress along route (0 when realtime)
  // ── Realtime fields (present when isRealtime === true) ──
  isRealtime: boolean;
  vehicleId?: string;
  bearing?: number; // degrees 0-360
  speed?: number;   // m/s
  delay?: number;   // seconds (negative = early)
  timestamp?: number; // POSIX timestamp of the GPS fix
}

export interface AllVehiclePosition extends VehiclePosition {
  routeId: string;
  routeShortName: string;
  routeType: number; // 0 = Tram, 3 = Bus
}

/**
 * Interpolate position along a shape polyline based on progress (0-1)
 */
export function interpolatePosition(
  shape: [number, number][],
  progress: number
): [number, number] {
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
    const segmentLength = Math.sqrt(
      Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2)
    );
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
      
      return [
        lat1 + (lat2 - lat1) * segmentProgress,
        lon1 + (lon2 - lon1) * segmentProgress
      ];
    }
    
    accumulatedDistance = segmentEnd;
  }
  
  // Should not reach here, but return last point as fallback
  return shape[shape.length - 1];
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
 * Map ParsedVehiclePosition entries (from the GTFS-RT proxy) to
 * VehiclePosition objects for the single-route view.
 *
 * @param positions - Map of tripId → ParsedVehiclePosition from the realtime store
 * @param tripUpdates - Map of tripId → ParsedTripUpdate for delay data
 * @param routeTrips - Active trips for the selected route (used for headsign/direction lookup)
 */
export function mapRealtimeToVehiclePositions(
  positions: Map<string, ParsedVehiclePosition>,
  tripUpdates: Map<string, ParsedTripUpdate>,
  routeTrips: ActiveTrip[]
): VehiclePosition[] {
  const tripMeta = new Map(routeTrips.map((t) => [t.id, t]));
  const result: VehiclePosition[] = [];

  for (const [tripId, pos] of positions) {
    const meta = tripMeta.get(tripId);
    if (!meta) continue; // not on this route

    const update = tripUpdates.get(tripId);

    result.push({
      tripId,
      lat: pos.latitude,
      lon: pos.longitude,
      headsign: meta.headsign,
      direction: meta.direction,
      progress: 0, // GPS-based; shape progress not computed
      isRealtime: true,
      vehicleId: pos.vehicleId,
      bearing: pos.bearing,
      speed: pos.speed,
      delay: update?.delay,
      timestamp: pos.timestamp,
    });
  }

  return result;
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
      tripId,
      lat: pos.latitude,
      lon: pos.longitude,
      headsign: route.longName || route.shortName,
      direction: 0, // direction not available from realtime feed alone
      progress: 0,
      isRealtime: true,
      vehicleId: pos.vehicleId,
      bearing: pos.bearing,
      speed: pos.speed,
      delay: update?.delay,
      timestamp: pos.timestamp,
      routeId: pos.routeId,
      routeShortName: route.shortName,
      routeType: route.type,
    });
  }

  return result;
}

// ============================================================
// Nearest-stop progress computation (for metro diagram display)
// ============================================================

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
    const distSq =
      (vehicleLat - projLat) ** 2 + (vehicleLon - projLon) ** 2;

    if (distSq < bestScore) {
      bestScore = distSq;
      bestIndex = i + t;
    }
  }

  return bestIndex;
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
