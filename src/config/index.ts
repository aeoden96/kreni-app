/**
 * Application configuration
 * Uses Vite environment variables (VITE_* prefix)
 */

/** Base URL of the GTFS Realtime proxy Cloudflare Worker */
export const GTFS_PROXY_URL = import.meta.env.VITE_GTFS_PROXY_URL || '';

/** Base URL for the static datasets stored in the R2 Bucket */
export const STATIC_DATA_URL = import.meta.env.VITE_STATIC_DATA_URL || 'https://data.kreni.app';

/** Optional API key for the proxy worker */
export const GTFS_API_KEY: string | undefined = import.meta.env.VITE_GTFS_API_KEY;

/** Tally form ID for the feedback popup (Publish → Share in Tally) */
export const TALLY_FEEDBACK_FORM_ID: string = import.meta.env.VITE_TALLY_FEEDBACK_FORM_ID || '';

/**
 * Dev-only preview toggle: inject fake ZET service alerts so the Disruptions
 * chip/modal can be reviewed without live alerts. Enable with
 * `VITE_MOCK_ALERTS=true` in .env.local. Forced off in production builds.
 */
export const MOCK_SERVICE_ALERTS: boolean =
  import.meta.env.DEV && import.meta.env.VITE_MOCK_ALERTS === 'true';

/** `data-tally-src` URL for the full-screen iframe embed (transparent background). */
export function getTallyFeedbackEmbedSrc(formId: string): string {
  const params = new URLSearchParams();
  return `https://tally.so/r/${encodeURIComponent(formId)}?${params}`;
}

/**
 * How often to poll the realtime feed (ms). ZET regenerates every ~10 s, so 10 s
 * matches the source with no freshness loss (7 s over-polled ~30%).
 * INVARIANT: the Worker's CACHE_TTL_SECONDS must stay <= this value. If the worker
 * TTL ever exceeds the poll interval, the client polls while the edge cache is still
 * valid, gets stale HITs, and the adaptive scheduler (useRealtimeData.ts:getAdaptiveDelayMs)
 * degrades into 1 s rapid re-polls with paused vehicle motion. Keep TTL <= interval.
 */
export const REALTIME_POLL_INTERVAL = 10_000;
