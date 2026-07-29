import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'node:fs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import pkg from './package.json';

/**
 * Which GTFS datasets to proxy to production, decided per dataset.
 *
 * The processed output comes from a private pipeline and is not committed (see
 * README), so a fresh checkout has neither directory and both fall through to
 * production — the UI runs with live data out of the box. Once a dataset has
 * been built locally it is served from disk instead, so a local pipeline run is
 * actually visible on the map. The two are independent: having `public/data`
 * but no `public/data-train` serves local transit data and proxied train data.
 *
 * Set VITE_REMOTE_DATA=1 to force the proxy for both, e.g. to compare against
 * production without deleting a local build.
 */
const forceRemote = process.env.VITE_REMOTE_DATA === '1';

/**
 * Dev-only passthrough to the production realtime Worker.
 *
 * The Worker only allows `https://kreni.app` as a CORS origin, so a browser on
 * localhost cannot call it directly — the preflight is refused no matter what
 * key is sent. Vite proxies server-side, where CORS does not apply, so the page
 * sees a same-origin `/api/...` URL and the Worker sees a normal request.
 *
 * Enable by pointing the app at the proxy prefix instead of the Worker itself:
 *
 *     VITE_GTFS_PROXY_URL=/api
 *
 * Leave it pointed at `http://localhost:8787` when running the Worker locally —
 * that is same-origin enough for the browser and needs none of this.
 */
const REALTIME_PROXY_PREFIX = '/api';

const realtimeProxy = {
  [REALTIME_PROXY_PREFIX]: {
    changeOrigin: true,
    // Call sites build both `${base}?endpoint=…` and `${base}/?endpoint=…`, so
    // stripping the prefix can leave a path that does not start with a slash.
    rewrite: (path: string) => {
      const rest = path.slice(REALTIME_PROXY_PREFIX.length);
      return rest.startsWith('/') ? rest : `/${rest}`;
    },
    target: 'https://api.kreni.app',
  },
};

const dataProxy = Object.fromEntries(
  ['data', 'data-train']
    .filter(
      (dataset) =>
        forceRemote || !existsSync(new URL(`./public/${dataset}/manifest.json`, import.meta.url))
    )
    .map((dataset) => [
      `/${dataset}`,
      {
        changeOrigin: true,
        headers: { 'X-App-Request': '1' },
        target: 'https://kreni.app',
      },
    ])
);

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      devOptions: {
        enabled: true,
        type: 'module',
      },
      includeAssets: ['favicon.svg', 'favicon.png', 'pwa-192x192.png'],
      manifest: {
        background_color: '#102a44',
        description:
          'Zet uzivo na karti Zagreba — tramvaji, autobusi i vlakovi ZET-a uživo; parking, bicikli i ostale gradske usluge na jednoj karti.',
        display: 'standalone',
        icons: [
          {
            purpose: 'any',
            sizes: '192x192',
            src: 'pwa-192x192.png',
            type: 'image/png',
          },
          {
            purpose: 'any',
            sizes: '512x512',
            src: 'pwa-512x512.png',
            type: 'image/png',
          },
          {
            purpose: 'maskable',
            sizes: '512x512',
            src: 'pwa-512x512-maskable.png',
            type: 'image/png',
          },
        ],
        lang: 'hr',
        name: 'Kreni — Zagreb javni prijevoz',
        scope: '/',
        screenshots: [
          {
            form_factor: 'wide',
            label: 'Kreni desktop view with map and route list',
            sizes: '1280x720',
            src: 'screenshot-wide.png',
            type: 'image/png',
          },
          {
            form_factor: 'narrow',
            label: 'Kreni mobile view',
            sizes: '750x1334',
            src: 'screenshot-mobile.png',
            type: 'image/png',
          },
        ],
        short_name: 'Kreni',
        start_url: '/',
        theme_color: '#1e3a5f',
      },
      registerType: 'autoUpdate',
      workbox: {
        globIgnores: ['**/node_modules/**', '**/dev-dist/**'],

        // The app shell is deliberately NOT precached, and navigations are not
        // served by the worker.
        //
        // Precaching it made the site unloadable in Brave: after any deploy the
        // worker reinstalls and repopulates its precache, and from then on every
        // normal refresh failed on `/assets/index-*.css` with a CORS error while
        // a hard reload — which bypasses the worker — was fine. Unregistering
        // fixed it; the reinstall on the next load broke it again. Ruled out at
        // the edge: Cloudflare never blocked or challenged those requests (all
        // managed challenges in a 12h window were PHP scanner noise), no Worker
        // routes, no header transforms, and the origin returns 200 text/css with
        // `access-control-allow-origin: *`. Chrome is unaffected by the same
        // build and the same server.
        //
        // Vite marks its tags `crossorigin`, so the shell is fetched in CORS
        // mode, and `<script type="module">` is CORS mode regardless of the
        // attribute — so this cannot be side-stepped by dropping it. Rather than
        // keep guessing at why Brave's cached copy fails that check, take the
        // worker out of the path: the shell is served straight from Cloudflare,
        // already `immutable` and hash-named.
        //
        // An empty manifest also purges what earlier builds precached, so
        // clients stuck on a bad entry recover on their own.
        //
        // Runtime caching below is unaffected, so the worker still has a fetch
        // handler and the app stays installable.
        globPatterns: [],
        navigateFallback: null,

        // Runtime caching for GTFS data JSON files.
        //
        // Routes are matched in registration order, so the manifest rule must
        // stay ahead of the general one.
        runtimeCaching: [
          {
            // `manifest.json` drives cache invalidation (`checkCacheVersion`),
            // so it must never be answered from cache while the network is up.
            // It used to fall under the StaleWhileRevalidate rule below, which
            // meant a data republication was detected only on the *next* load:
            // the app compared a stale manifest against itself, concluded
            // nothing had changed, and skipped clearing both IndexedDB and the
            // `gtfs-data` cache. NetworkFirst (not NetworkOnly) so a cold start
            // offline still boots.
            handler: 'NetworkFirst',
            options: {
              cacheableResponse: {
                statuses: [0, 200],
              },
              cacheName: 'gtfs-manifest',
              networkTimeoutSeconds: 10,
            },
            urlPattern: /\/data\/manifest\.json$/,
          },
          {
            // NetworkFirst, not StaleWhileRevalidate: ZET renumbers the service
            // segment of every trip ID on each publication, so serving one file
            // from an older publication alongside a newer one is not "slightly
            // stale", it is incoherent. `initial.json` is refetched on every
            // start while a stop timetable is only refetched when that stop is
            // opened, so SWR reliably produced exactly that mix — today's
            // calendar (`0_4`) against yesterday's trip IDs (`0_21_…`), which
            // match nothing and empty the departure board.
            //
            // The IndexedDB layer in stores/dataCache absorbs repeat reads, so
            // this costs a round trip only on a cold read, and falls back to
            // cache when offline.
            handler: 'NetworkFirst',
            options: {
              cacheableResponse: {
                statuses: [0, 200],
              },
              cacheName: 'gtfs-data',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                // Every file here is also held, parsed, by stores/dataCache, so
                // this cache exists for the offline cold start rather than for
                // hit rate — 500 entries was buying a second copy of up to
                // ~100 MB for that. The route timetables are the big ones
                // (~293 KB each); 150 still covers a normal day's browsing.
                maxEntries: 150,
              },
              networkTimeoutSeconds: 10,
            },
            urlPattern: /\/data\/.*\.json$/,
          },
          // Runtime caching for map tiles (OSM HOT + CartoCDN + CyclOSM)
          // CacheFirst: serve from cache immediately, only fetch if not cached yet.
          // This is OSM-policy-compliant passive caching (no pre-fetching).
          //
          // 600 entries each, down from 2000: at ~25-40 KB a tile that was a
          // 150-250 MB ceiling across the three providers, for tiles nobody
          // revisits — only one provider is active at a time, and it is chosen
          // by theme and the `detailedMap` setting. 600 still holds Zagreb at
          // several zoom levels, which is what panning around actually reuses.
          {
            handler: 'CacheFirst',
            options: {
              // 200 only. A `0` here would re-admit opaque responses, which
              // is the whole bug: they are padded to ~7 MB each in quota
              // accounting regardless of the ~32 KB they actually weigh.
              cacheableResponse: {
                statuses: [200],
              },
              // `-v2` because `caches.match()` keys on URL, not request mode:
              // an opaque entry left by an older build would otherwise be
              // handed to a CORS-mode <img>, which refuses it and leaves a
              // blank tile. `retireOldCaches` deletes the `-v1` names outright.
              cacheName: 'map-tiles-osm-v2',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                maxEntries: 600,
              },
            },
            urlPattern: /^https:\/\/(\w+\.)?tile\.openstreetmap\.fr\/hot\/.*/,
          },
          {
            handler: 'CacheFirst',
            options: {
              // 200 only. A `0` here would re-admit opaque responses, which
              // is the whole bug: they are padded to ~7 MB each in quota
              // accounting regardless of the ~32 KB they actually weigh.
              cacheableResponse: {
                statuses: [200],
              },
              // `-v2` because `caches.match()` keys on URL, not request mode:
              // an opaque entry left by an older build would otherwise be
              // handed to a CORS-mode <img>, which refuses it and leaves a
              // blank tile. `retireOldCaches` deletes the `-v1` names outright.
              cacheName: 'map-tiles-carto-v2',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                maxEntries: 600,
              },
            },
            urlPattern: /^https:\/\/(\w+\.)?basemaps\.cartocdn\.com\/.*/,
          },
          {
            handler: 'CacheFirst',
            options: {
              // 200 only. A `0` here would re-admit opaque responses, which
              // is the whole bug: they are padded to ~7 MB each in quota
              // accounting regardless of the ~32 KB they actually weigh.
              cacheableResponse: {
                statuses: [200],
              },
              // `-v2` because `caches.match()` keys on URL, not request mode:
              // an opaque entry left by an older build would otherwise be
              // handed to a CORS-mode <img>, which refuses it and leaves a
              // blank tile. `retireOldCaches` deletes the `-v1` names outright.
              cacheName: 'map-tiles-cyclosm-v2',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                maxEntries: 600,
              },
            },
            urlPattern: /^https:\/\/(\w+\.)?tile-cyclosm\.openstreetmap\.fr\/.*/,
          },
        ],
      },
    }),
  ],
  // Datasets without a local build are proxied to production, with the header
  // the app normally sends — see `dataProxy` above. `/api` reaches the realtime
  // Worker past its CORS allowlist — see `realtimeProxy`. Both dev-only;
  // `vite build` output is unaffected.
  server: {
    proxy: { ...dataProxy, ...realtimeProxy },
  },
});
