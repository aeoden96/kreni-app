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

/** `data-tally-src` URL for the full-screen iframe embed (transparent background). */
export function getTallyFeedbackEmbedSrc(formId: string): string {
  const params = new URLSearchParams();
  return `https://tally.so/r/${encodeURIComponent(formId)}?${params}`;
}

/** How often to poll the realtime feed (ms). Keep in sync with worker CACHE_TTL_SECONDS. */
export const REALTIME_POLL_INTERVAL = 7_000;
