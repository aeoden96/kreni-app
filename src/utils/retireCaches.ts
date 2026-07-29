/**
 * One-time deletion of Cache Storage caches that an older build filled and no
 * current build writes to.
 *
 * Workbox does not do this for us: `cleanupOutdatedCaches` only covers the
 * precache, so retiring a *runtime* cache name means deleting it by hand.
 *
 * The names below held map tiles fetched in no-cors mode, which the browser
 * stores as opaque responses. Chromium pads opaque entries in quota accounting
 * — it cannot let a page infer cross-origin response sizes — and the padding
 * has nothing to do with the tile: measured on a real device, 1922 tiles of
 * ~32 KB each were accounted at 13.44 GB, roughly 7 MB apiece, against a 2 GB
 * quota. Tiles are now requested with CORS (see `BaseMap`) into `-v2` caches,
 * which leaves these behind holding all of that phantom weight.
 *
 * Without this they would linger indefinitely: nothing writes to them, so
 * workbox's expiration never runs against them and never trims them.
 */
const RETIRED_CACHES = ['map-tiles-osm', 'map-tiles-carto', 'map-tiles-cyclosm'];

/**
 * Fire-and-forget; failures are ignored on purpose. This reclaims space, so a
 * private-mode restriction or a browser without Cache Storage is a no-op rather
 * than something worth surfacing.
 */
export function retireOldCaches(): void {
  if (typeof caches === 'undefined') return;

  void (async () => {
    try {
      // Only touch names that are actually present, so the common case (already
      // reclaimed) costs one `keys()` call and no deletes.
      const present = new Set(await caches.keys());
      await Promise.all(
        RETIRED_CACHES.filter((name) => present.has(name)).map((name) => caches.delete(name))
      );
    } catch {
      // Nothing to do — the space simply stays claimed until the next load.
    }
  })();
}
