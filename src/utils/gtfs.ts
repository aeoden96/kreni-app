/**
 * Utility functions for working with processed GTFS data
 */

import { GTFS_DATA_ORIGIN } from '../config';
import { cachedFetch, dataFetch } from '../stores/dataCache';

const BASE_URL = import.meta.env.BASE_URL;

// Types
export interface Stop {
  /** Compass bearing in degrees (0=N, 90=E) of the direction of travel leaving this platform */
  bearing?: number;
  code: string;
  id: string;
  lat: number;
  locationType: number;
  lon: number;
  name: string;
  parentStation: null | string;
  /** 0 = tram-only, 3 = bus-only, 2 = mixed tram+bus; undefined = parent station / unknown */
  routeType?: number;
  /**
   * End of the line: every route direction reaching this platform terminates on
   * it. Rendered as a ring rather than a directional pin — any bearing such a
   * stop has points at the depot or turnaround loop past it, not at anywhere a
   * passenger can ride to.
   */
  terminus?: boolean;
}

/**
 * Fetch one processed-GTFS file, memoised in IndexedDB.
 *
 * On native {@link GTFS_DATA_ORIGIN} points at the deployed web origin, so new
 * timetables reach installed apps without a Play release; the copy bundled in
 * the APK is the fallback when that request fails, which is what keeps the app
 * usable offline and on first run.
 *
 * The cache key is the *relative* path on purpose. Keying on the resolved URL
 * would give the remote and bundled copies separate entries, doubling the cache
 * and re-downloading everything the first time a device falls back.
 *
 * @param onMissing produces a value for a 404 instead of throwing — some
 *   datasets legitimately omit files (HZPP ships no shapes.txt).
 */
async function fetchDataFile<T>(relPath: string, label: string, onMissing?: () => T): Promise<T> {
  const localUrl = `${BASE_URL}${relPath}`;
  return cachedFetch(localUrl, async () => {
    const candidates = GTFS_DATA_ORIGIN ? [`${GTFS_DATA_ORIGIN}${localUrl}`, localUrl] : [localUrl];
    let lastError: unknown;

    for (const url of candidates) {
      try {
        const response = await dataFetch(url);
        if (response.status === 404 && onMissing) return onMissing();
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return (await response.json()) as T;
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(`Failed to fetch ${label}: ${String(lastError)}`);
  });
}

/** Eight compass sectors — stable keys for grouping (locale-independent). */
export const COMPASS_KEY_ORDER = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
export interface ActiveTrip {
  direction: number;
  end: number; // minutes from midnight
  headsign: string;
  id: string;
  shapeId: string;
  start: number; // minutes from midnight
  /**
   * Legacy: [[time_minutes, shape_progress], ...] for the retired schedule
   * interpolation. No longer emitted by the pipeline — it was ~90% of the file.
   */
  stopTimes?: [number, number][];
}

export interface AllActiveTripsData {
  routes: Record<string, AllActiveTripsRoute>;
  shapes: Record<string, [number, number][]>;
}

export interface AllActiveTripsRoute {
  shortName: string;
  trips: ActiveTrip[];
  type: number; // 0 = Tram, 3 = Bus
}

export type CompassKey = (typeof COMPASS_KEY_ORDER)[number];

export interface InitialData {
  calendar: Record<string, string>; // date -> service_id
  feedEndDate: string;
  feedStartDate: string;
  feedVersion: string;
  routes: Route[];
  stops: Stop[];
}

export interface Route {
  id: string;
  longName: string;
  /**
   * Stretches of at least a week with no service, as `YYYYMMDD` half-open
   * ranges — the route is out from `from` up to but not including `until`.
   * Added by process_gtfs.py and absent on the ~150 routes that never stop.
   * Read it through `getRouteSuspension`, never directly.
   */
  serviceGaps?: { from: string; until: string }[];
  shortName: string;
  type: number; // 0 = Tram, 3 = Bus
}

export interface RouteActiveTripsData {
  /**
   * Legacy: the pipeline no longer emits this — route shapes are fetched from
   * `shapes/{routeId}.json`. Optional so cached copies of the old file still parse.
   */
  shapes?: Record<string, [number, number][]>;
  trips: ActiveTrip[];
}

/** routeId -> directionKey -> ordered parent station IDs */
export type RouteParentStopsIndex = Record<string, Record<string, string[]>>;

export interface RouteStopsData {
  canonicalShapes?: string[];
  orderedStops?: Record<string, string[]>;
  stops: string[];
}

/**
 * Per-route timetable — `public/data/timetables/{routeId}.json`.
 * Keyed: tripId → ordered list of [stopId, stop_sequence, timeMinutes] tuples.
 * Indexed in stop-traversal order; times are minutes from midnight.
 */
export type RouteTimetable = Record<string, [string, number, number][]>;

export interface StopDepartures {
  departures: Record<string, Record<string, number[]>>; // service_id -> route_id -> times[]
  routes: string[];
}

export interface StopTime {
  sequence: number;
  stopId: string;
  time: number; // minutes from midnight
}

/**
 * Per-stop timetable index — `public/data/stop_timetables/{stopId}.json`.
 * Keyed: routeId → tripId → { time (minutes from midnight), sequence (stop_sequence in trip) }
 */
export type StopTimetable = Record<string, Record<string, { sequence: number; time: number }>>;

export interface Trip {
  direction: number;
  headsign: string;
  id: string;
  serviceId: string;
  shapeId: null | string;
}

/**
 * Map bearing to a stable key (e.g. for deduplicating platforms). Use i18n
 * `search.compass.*` via `compassLabelForBearing` for display text.
 */
export function bearingToCompassKey(bearing: number): CompassKey {
  const idx = Math.round((((bearing % 360) + 360) % 360) / 45) % 8;
  return COMPASS_KEY_ORDER[idx];
}

// Distance calculation (Haversine formula)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function fetchInitialData(dataDir = 'data'): Promise<InitialData> {
  return fetchDataFile(`${dataDir}/initial.json`, 'initial data');
}

export async function fetchRouteActiveTrips(
  routeId: string,
  dataDir = 'data'
): Promise<RouteActiveTripsData> {
  return fetchDataFile(
    `${dataDir}/route_active_trips/${routeId}.json`,
    `active trips for route ${routeId}`
  );
}

export async function fetchRouteParentStops(dataDir = 'data'): Promise<RouteParentStopsIndex> {
  return fetchDataFile(`${dataDir}/route_parent_stops.json`, 'route parent stops index');
}

export async function fetchRouteShapes(
  routeId: string,
  dataDir = 'data'
): Promise<Record<string, [number, number][]>> {
  return fetchDataFile(
    `${dataDir}/shapes/${routeId}.json`,
    `shapes for route ${routeId}`,
    () => ({})
  );
}

export async function fetchRouteStops(routeId: string, dataDir = 'data'): Promise<RouteStopsData> {
  return fetchDataFile(
    `${dataDir}/route_stops/${routeId}.json`,
    `route stops for route ${routeId}`
  );
}

export async function fetchRouteTimetable(
  routeId: string,
  dataDir = 'data'
): Promise<Record<string, [string, number, number][]>> {
  return fetchDataFile(`${dataDir}/timetables/${routeId}.json`, `timetable for route ${routeId}`);
}

export async function fetchRouteTrips(
  routeId: string,
  dataDir = 'data'
): Promise<{ trips: Trip[] }> {
  return fetchDataFile(`${dataDir}/routes/${routeId}.json`, `route ${routeId}`);
}

export async function fetchStopDepartures(
  stopId: string,
  dataDir = 'data'
): Promise<StopDepartures> {
  return fetchDataFile(`${dataDir}/stops/${stopId}.json`, `departures for stop ${stopId}`);
}

export async function fetchStopTimetable(stopId: string, dataDir = 'data'): Promise<StopTimetable> {
  return fetchDataFile(`${dataDir}/stop_timetables/${stopId}.json`, `stop timetable for ${stopId}`);
}

export function findNearestStops(
  stops: Stop[],
  lat: number,
  lon: number,
  limit: number = 10
): Array<Stop & { distance: number }> {
  return stops
    .map((stop) => ({
      ...stop,
      distance: calculateDistance(lat, lon, stop.lat, stop.lon),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

// Data fetching helpers
// All functions accept an optional `dataDir` parameter (default: 'data') so the
// train view can point at a separate dataset ('data-train') without duplication.

export function formatTime24h(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = Math.floor(minutes % 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// Date utilities
export function getCurrentServiceId(calendar: Record<string, string>): null | string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const serviceId = calendar[today];

  // If service exists for today, return it
  if (serviceId) {
    return serviceId;
  }

  // Fallback for dates outside feed range: use day-of-week default
  // 0_20 = weekday, 0_21 = Saturday, 0_22 = Sunday
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0) {
    return '0_22'; // Sunday
  } else if (dayOfWeek === 6) {
    return '0_21'; // Saturday
  } else {
    return '0_20'; // Weekday (Mon-Fri)
  }
}

export function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// Departure time filtering
export function getNextDepartures(
  departures: number[],
  currentTimeMinutes: number,
  count: number = 5
): number[] {
  return departures.filter((time) => time >= currentTimeMinutes).slice(0, count);
}

export function getRouteTypeName(routeType: number): string {
  switch (routeType) {
    case 0:
      return 'Tram';
    case 2:
      return 'Train';
    case 3:
      return 'Bus';
    default:
      return 'Unknown';
  }
}

export function getServiceIdForDate(calendar: Record<string, string>, date: Date): null | string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  return calendar[dateStr] || null;
}

export function getTripStopTimes(
  timetable: Record<string, [string, number, number][]>,
  tripId: string
): StopTime[] {
  const entries = timetable[tripId] || [];
  return entries.map(parseTimetableEntry);
}

export function isChildPlatform(stop: Stop): boolean {
  return stop.locationType === 0 && stop.parentStation !== null;
}

// Stop utilities
export function isParentStation(stop: Stop): boolean {
  return stop.locationType === 1;
}

export function isRouteTypeBus(routeType: number): boolean {
  return routeType === 3;
}

export function isRouteTypeRail(routeType: number): boolean {
  return routeType === 2;
}

// Route utilities
export function isRouteTypeTram(routeType: number): boolean {
  return routeType === 0;
}

// Time utilities
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// Timetable parsing helpers
export function parseTimetableEntry(entry: [string, number, number]): StopTime {
  return {
    sequence: entry[1],
    stopId: entry[0],
    time: entry[2],
  };
}

export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}
