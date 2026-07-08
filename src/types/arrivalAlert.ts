/**
 * A single active "get off here" arrival alert. The user starts one from the
 * stop view; a foreground-service GPS watch fires a heads-up notification once
 * their own position comes within `radiusMeters` of the stop, then auto-stops.
 * Only one is active at a time (like turn-by-turn navigation). Persisted so the
 * watch can be re-attached after a WebView teardown/relaunch.
 */
export interface ArrivalAlert {
  /** Destination stop latitude (WGS-84). */
  lat: number;
  /** Destination stop longitude (WGS-84). */
  lon: number;
  /** Trigger distance to the stop, in metres. */
  radiusMeters: number;
  /** When the alert was started (ms since epoch). */
  startedAt: number;
  /** Destination stop id. */
  stopId: string;
  /** Cached stop name for the notification/banner (avoids a data fetch). */
  stopName: string;
}
