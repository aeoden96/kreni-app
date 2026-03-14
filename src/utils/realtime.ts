/**
 * GTFS Realtime types, parsing utilities, and fetch helpers.
 *
 * Types are copied from zet-live-cf-prody/src/types.ts (the Cloudflare Worker
 * proxy project) and adapted for client-side use.
 *
 * The worker at VITE_GTFS_PROXY_URL returns raw GTFS-RT protobuf binary.
 * We decode it here using the `gtfs-realtime-bindings` npm package.
 */

// gtfs-realtime-bindings is a CJS module that does `module.exports = $root`.
// In Vite's browser runtime, the entire root is exposed as the default export.
// We access transit_realtime via the namespace, falling back to .default for CJS interop.
import * as _GtfsRT from 'gtfs-realtime-bindings';
const GtfsRealtimeBindings: typeof _GtfsRT = ((_GtfsRT as any).default ?? _GtfsRT) as typeof _GtfsRT;
import { GTFS_PROXY_URL, GTFS_API_KEY } from '../config';

// ============================================
// Enums — `erasableSyntaxOnly` is enabled, so native TypeScript
// `enum` declarations are not allowed. Use const objects + type aliases.
// ============================================

export const VehicleStopStatus = {
  INCOMING_AT: 0,
  STOPPED_AT: 1,
  IN_TRANSIT_TO: 2,
} as const;
export type VehicleStopStatus = (typeof VehicleStopStatus)[keyof typeof VehicleStopStatus];

export const ScheduleRelationship = {
  SCHEDULED: 0,
  SKIPPED: 1,
  NO_DATA: 2,
} as const;
export type ScheduleRelationship = (typeof ScheduleRelationship)[keyof typeof ScheduleRelationship];

export const CongestionLevel = {
  UNKNOWN_CONGESTION_LEVEL: 0,
  RUNNING_SMOOTHLY: 1,
  STOP_AND_GO: 2,
  CONGESTION: 3,
  SEVERE_CONGESTION: 4,
} as const;
export type CongestionLevel = (typeof CongestionLevel)[keyof typeof CongestionLevel];

export const OccupancyStatus = {
  EMPTY: 0,
  MANY_SEATS_AVAILABLE: 1,
  FEW_SEATS_AVAILABLE: 2,
  STANDING_ROOM_ONLY: 3,
  CRUSHED_STANDING_ROOM_ONLY: 4,
  FULL: 5,
  NOT_ACCEPTING_PASSENGERS: 6,
} as const;
export type OccupancyStatus = (typeof OccupancyStatus)[keyof typeof OccupancyStatus];

// ============================================
// Parsed types (from worker types.ts)
// ============================================

export interface ParsedVehiclePosition {
  vehicleId: string;
  tripId: string;
  routeId: string;
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number; // m/s
  timestamp: number; // POSIX timestamp
  currentStopId?: string;
  currentStopSequence?: number; // stop_sequence of the current/next stop from GTFS-RT
  status?: VehicleStopStatus;
  congestionLevel?: CongestionLevel;
  occupancyStatus?: OccupancyStatus;
}

export interface ParsedTripUpdate {
  tripId: string;
  routeId: string;
  vehicleId?: string;
  stopTimeUpdates: ParsedStopTimeUpdate[];
  timestamp?: number;
  delay?: number; // seconds
}

export interface ParsedStopTimeUpdate {
  stopId: string;
  stopSequence?: number;
  arrivalDelay?: number; // seconds
  departureDelay?: number; // seconds
  arrivalTime?: number; // POSIX timestamp
  departureTime?: number; // POSIX timestamp
  scheduleRelationship?: ScheduleRelationship;
}

export interface FeedStatistics {
  totalEntities: number;
  vehiclePositions: number;
  tripUpdates: number;
  serviceAlerts: number;
  lastUpdate?: Date;
}

export interface ParsedServiceAlert {
  id: string;
  /** Affected route IDs */
  routeIds: string[];
  /** Affected stop IDs */
  stopIds: string[];
  /** Short header text (Croatian preferred) */
  header: string;
  /** Long description text (Croatian preferred) */
  description: string;
  /** Alert cause (e.g. 'CONSTRUCTION', 'STRIKE') */
  cause: string;
  /** Alert effect (e.g. 'DETOUR', 'NO_SERVICE') */
  effect: string;
  /** POSIX start timestamp in seconds, or null */
  activeSince: number | null;
  /** POSIX end timestamp in seconds, or null */
  activeUntil: number | null;
  /** Optional URL to the original source (RSS alerts only) */
  url?: string;
}

// ============================================
// Feed fetch helpers
// ============================================

type GtfsRealtimeFeed = InstanceType<typeof GtfsRealtimeBindings.transit_realtime.FeedMessage>;

/**
 * Fetch and protobuf-decode a GTFS-RT feed from the proxy worker.
 *
 * @param endpoint - Which feed to request
 * @returns Decoded protobuf FeedMessage and metadata
 * @throws Error when the proxy URL is not configured or the request fails
 */
export async function fetchRealtimeFeed(
  endpoint: 'vehicle-positions' | 'trip-updates'
): Promise<{
  feed: GtfsRealtimeFeed;
  metadata: {
    workerTimestamp: string | null;
    cacheStatus: string | null;
  };
}> {
  if (!GTFS_PROXY_URL) {
    throw new Error(
      'GTFS proxy URL is not configured. Set VITE_GTFS_PROXY_URL in your .env file.'
    );
  }

  const url = `${GTFS_PROXY_URL}/?endpoint=${endpoint}`;
  const headers: Record<string, string> = {};
  if (GTFS_API_KEY) {
    headers['X-API-Key'] = GTFS_API_KEY;
  }

  const fetchStart = Date.now();
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `GTFS proxy request failed: ${response.status} ${response.statusText}`
    );
  }

  const fetchEnd = Date.now();
  const workerTimestamp = response.headers.get('X-Timestamp');
  const cacheStatus = response.headers.get('X-Cache-Status');
  const fetchTimeMs = fetchEnd - fetchStart;
  const httpStatus = response.status;

  const buffer = await response.arrayBuffer();
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
    new Uint8Array(buffer)
  );

  return {
    feed,
    metadata: {
      workerTimestamp,
      cacheStatus,
      fetchTimeMs,
      httpStatus,
    } as unknown as { workerTimestamp: string | null; cacheStatus: string | null; fetchTimeMs: number; httpStatus: number },
  };
}

// ============================================
// Parsing utilities (adapted from worker parser.ts)
// ============================================

type FeedEntity = any;

/**
 * Parse vehicle positions from a decoded GTFS-RT feed.
 */
export function parseVehiclePositions(feed: GtfsRealtimeFeed): ParsedVehiclePosition[] {
  return feed.entity
    .filter((entity: FeedEntity) => entity.vehicle?.position)
    .map((entity: FeedEntity) => {
      const vehicle = entity.vehicle;
      return {
        vehicleId: vehicle.vehicle?.id || entity.id,
        tripId: vehicle.trip?.tripId || '',
        routeId: vehicle.trip?.routeId || '',
        latitude: vehicle.position.latitude,
        longitude: vehicle.position.longitude,
        // Feed bearing is often 0 even when the vehicle is moving — ignore it
        bearing: undefined,
        // Feed speed is always 0 on this provider — treat as missing
        speed: (vehicle.position?.speed > 0) ? vehicle.position.speed : undefined,
        timestamp: Number(vehicle.timestamp) || Math.floor(Date.now() / 1000),
        currentStopId: vehicle.stopId,
        currentStopSequence: vehicle.currentStopSequence != null ? Number(vehicle.currentStopSequence) : undefined,
        status: vehicle.currentStatus,
        congestionLevel: vehicle.congestionLevel,
        occupancyStatus: vehicle.occupancyStatus,
      } satisfies ParsedVehiclePosition;
    });
}

/**
 * Parse trip updates from a decoded GTFS-RT feed.
 */
export function parseTripUpdates(feed: GtfsRealtimeFeed): ParsedTripUpdate[] {
  return feed.entity
    .filter((entity: FeedEntity) => entity.tripUpdate)
    .map((entity: FeedEntity) => {
      const tripUpdate = entity.tripUpdate;
      return {
        tripId: tripUpdate.trip.tripId || '',
        routeId: tripUpdate.trip.routeId || '',
        vehicleId: tripUpdate.vehicle?.id,
        stopTimeUpdates: (tripUpdate.stopTimeUpdate || []).map(
          (stu: any): ParsedStopTimeUpdate => ({
            stopId: stu.stopId || '',
            stopSequence: stu.stopSequence,
            arrivalDelay: stu.arrival?.delay !== undefined ? Number(stu.arrival.delay) : undefined,
            departureDelay: stu.departure?.delay !== undefined ? Number(stu.departure.delay) : undefined,
            arrivalTime: stu.arrival?.time !== undefined ? Number(stu.arrival.time) : undefined,
            departureTime: stu.departure?.time !== undefined ? Number(stu.departure.time) : undefined,
            scheduleRelationship: stu.scheduleRelationship,
          })
        ),
        timestamp: tripUpdate.timestamp !== undefined ? Number(tripUpdate.timestamp) : undefined,
        delay: tripUpdate.delay !== undefined ? Number(tripUpdate.delay) : undefined,
      } satisfies ParsedTripUpdate;
    });
}

/**
 * Get aggregate statistics from a decoded GTFS-RT feed.
 */
export function getFeedStatistics(feed: GtfsRealtimeFeed): FeedStatistics {
  const vehiclePositions = feed.entity.filter((e: FeedEntity) => e.vehicle).length;
  const tripUpdates = feed.entity.filter((e: FeedEntity) => e.tripUpdate).length;
  const serviceAlerts = feed.entity.filter((e: FeedEntity) => e.alert).length;

  return {
    totalEntities: feed.entity.length,
    vehiclePositions,
    tripUpdates,
    serviceAlerts,
    lastUpdate: feed.header.timestamp
      ? new Date(Number(feed.header.timestamp) * 1000)
      : undefined,
  };
}

/**
 * Extract text from a GTFS-RT TranslatedString.
 * Prefers Croatian ('hr'), falls back to first translation.
 */
function getTranslatedText(ts: any): string {
  if (!ts?.translation?.length) return '';
  const hr = ts.translation.find((t: { language?: string; text?: string }) => t.language === 'hr');
  return (hr ?? ts.translation[0])?.text ?? '';
}

const CAUSE_LABELS: Record<number, string> = {
  1: 'UNKNOWN_CAUSE',
  2: 'OTHER_CAUSE',
  3: 'TECHNICAL_PROBLEM',
  4: 'STRIKE',
  5: 'DEMONSTRATION',
  6: 'ACCIDENT',
  7: 'HOLIDAY',
  8: 'WEATHER',
  9: 'MAINTENANCE',
  10: 'CONSTRUCTION',
  11: 'POLICE_ACTIVITY',
  12: 'MEDICAL_EMERGENCY',
};

const EFFECT_LABELS: Record<number, string> = {
  1: 'NO_SERVICE',
  2: 'REDUCED_SERVICE',
  3: 'SIGNIFICANT_DELAYS',
  4: 'DETOUR',
  5: 'ADDITIONAL_SERVICE',
  6: 'MODIFIED_SERVICE',
  7: 'OTHER_EFFECT',
  8: 'UNKNOWN_EFFECT',
  9: 'STOP_MOVED',
};

/**
 * Parse service alerts from a decoded GTFS-RT feed.
 */
export function parseServiceAlerts(feed: GtfsRealtimeFeed): ParsedServiceAlert[] {
  return feed.entity
    .filter((entity: FeedEntity) => entity.alert)
    .map((entity: FeedEntity): ParsedServiceAlert => {
      const alert = entity.alert;
      const informed: any[] = alert.informedEntity || [];
      const routeIds = informed
        .map((e: { routeId?: string }) => e.routeId)
        .filter((id): id is string => !!id);
      const stopIds = informed
        .map((e: { stopId?: string }) => e.stopId)
        .filter((id): id is string => !!id);

      // Active period — take the first one if multiple
      const period: any = alert.activePeriod?.[0] ?? null;

      return {
        id: entity.id || String(Math.random()),
        routeIds,
        stopIds,
        header: getTranslatedText(alert.headerText),
        description: getTranslatedText(alert.descriptionText),
        cause: CAUSE_LABELS[Number(alert.cause)] ?? 'UNKNOWN_CAUSE',
        effect: EFFECT_LABELS[Number(alert.effect)] ?? 'UNKNOWN_EFFECT',
        activeSince: period?.start ? Number(period.start) : null,
        activeUntil: period?.end ? Number(period.end) : null,
      };
    });
}

// ============================================
// Display helpers (from worker parser.ts)
// ============================================

/**
 * Format delay in a human-readable way.
 *
 * @param delaySeconds - Delay in seconds (negative = early, positive = late)
 */
export function formatDelay(delaySeconds?: number): string {
  if (delaySeconds === undefined) return '';

  const absDelay = Math.abs(delaySeconds);

  if (absDelay < 60) {
    return 'On time';
  }

  const minutes = Math.round(absDelay / 60);
  const status = delaySeconds > 0 ? 'kasni' : 'prerano';

  return `${minutes} min ${status}`;
}

/**
 * Convert speed from m/s to km/h.
 */
export function speedToKmh(speedMs?: number): number | undefined {
  return speedMs !== undefined ? Math.round(speedMs * 3.6 * 10) / 10 : undefined;
}

// ============================================
// Dead-reckoning: derive bearing + speed from
// consecutive position snapshots.
// ============================================

/** Haversine distance in metres between two WGS-84 coordinates. */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Bearing in degrees (0 = North, clockwise) from point 1 → point 2.
 */
export function computeBearing(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export interface VehicleSnapshot {
  latitude: number;
  longitude: number;
  /** POSIX seconds */
  timestamp: number;
}

/**
 * Enrich a vehicle position with derived bearing and/or speed by comparing
 * it against a previous snapshot.
 *
 * Rules:
 * - Time delta must be 3 s – 300 s (avoid noise & stale data)
 * - Movement must be ≥ 5 m (below GPS noise threshold)
 * - Derived speed capped at 33 m/s (~120 km/h)
 * - Derived values only fill in missing fields from the feed
 */
export function enrichWithDeadReckoning(
  current: ParsedVehiclePosition,
  prev: VehicleSnapshot,
): ParsedVehiclePosition {
  const dt = current.timestamp - prev.timestamp; // seconds
  if (dt < 3 || dt > 300) return current;

  const dist = haversineDistance(
    prev.latitude, prev.longitude,
    current.latitude, current.longitude,
  );

  if (dist < 5) return current; // GPS noise — vehicle likely stationary

  const derivedBearing = computeBearing(
    prev.latitude, prev.longitude,
    current.latitude, current.longitude,
  );
  const derivedSpeed = Math.min(dist / dt, 33); // m/s, capped at ~120 km/h

  return {
    ...current,
    // Always prefer derived bearing — feed value is unreliable/zero
    bearing: derivedBearing,
    // Always prefer derived speed — feed speed is always 0 on this provider
    speed: derivedSpeed,
  };
}
