/**
 * Service-worker update checks.
 *
 * `registerType: 'autoUpdate'` decides what happens *once a new service worker
 * is found* — it does not make the app go looking for one. vite-plugin-pwa
 * registers once and then only reacts to the browser's own discovery, which
 * happens on a navigation within scope or on its ~24h timer. A tab left open
 * therefore never updates, and an installed PWA is *resumed* rather than
 * navigated, so it can sit on a stale build for a day.
 *
 * Two triggers close that gap: an interval for a long-lived tab, and the
 * foreground transition, which is the resume path a home-screen PWA actually
 * takes. Finding an update is all that's needed — the SW calls `skipWaiting()`
 * and vite-plugin-pwa reloads the page from its own `activated` listener.
 */

/** How often an open tab re-checks. Deploys are infrequent; this is not a poll loop. */
export const SW_UPDATE_INTERVAL_MS = 60 * 60 * 1000;

/** The slice of ServiceWorkerRegistration we use, so tests need no DOM stub. */
export interface UpdatableRegistration {
  installing: null | ServiceWorker;
  update: () => Promise<unknown>;
}

interface StartOptions {
  intervalMs?: number;
}

/**
 * Begin checking for a new service worker. Returns a teardown function.
 *
 * @param swUrl - URL of the service worker script, as handed to `onRegisteredSW`.
 * @param registration - The active registration.
 */
export function startSwUpdateChecks(
  swUrl: string,
  registration: UpdatableRegistration,
  { intervalMs = SW_UPDATE_INTERVAL_MS }: StartOptions = {}
): () => void {
  let inFlight = false;

  const check = async (): Promise<void> => {
    // Overlapping checks would only duplicate work: `installing` means the
    // browser is already acting on an update it found.
    if (inFlight || registration.installing) return;
    // `onLine === false` is a definite "no network"; anything else is worth trying,
    // since a true reading says nothing about reachability.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    inFlight = true;
    try {
      // `no-store` so this probe is never itself answered from a stale cache —
      // it is the one request that must reflect the server.
      const response = await fetch(swUrl, { cache: 'no-store' });
      // Anything but 200 means a deploy is mid-flight or the script moved;
      // calling update() on that would register a worker we can't serve.
      if (response.status === 200) await registration.update();
    } catch {
      // Offline, or a transient failure. The next trigger retries; a failed
      // update check is never worth surfacing to the user.
    } finally {
      inFlight = false;
    }
  };

  const onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') void check();
  };

  const timer = setInterval(() => void check(), intervalMs);
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
