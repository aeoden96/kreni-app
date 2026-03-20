/**
 * Application configuration
 * Uses Vite environment variables (VITE_* prefix)
 */

/** Base URL of the GTFS Realtime proxy Cloudflare Worker */
export const GTFS_PROXY_URL =
  import.meta.env.VITE_GTFS_PROXY_URL || '';

/** Optional API key for the proxy worker */
export const GTFS_API_KEY: string | undefined =
  import.meta.env.VITE_GTFS_API_KEY;

/** How often to poll the realtime feed (ms). Keep in sync with worker CACHE_TTL_SECONDS. */
export const REALTIME_POLL_INTERVAL = 7_000;
