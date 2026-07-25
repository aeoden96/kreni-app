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
        // Precache app shell (HTML, JS, CSS, static assets)
        globPatterns:
          process.env.NODE_ENV === 'production' ? ['**/*.{js,css,html,ico,png,svg,woff2}'] : [],

        // Runtime caching for GTFS data JSON files
        runtimeCaching: [
          {
            handler: 'StaleWhileRevalidate',
            options: {
              cacheableResponse: {
                statuses: [0, 200],
              },
              cacheName: 'gtfs-data',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                maxEntries: 500,
              },
            },
            urlPattern: /\/data\/.*\.json$/,
          },
          // Runtime caching for map tiles (OSM HOT + CartoCDN + CyclOSM)
          // CacheFirst: serve from cache immediately, only fetch if not cached yet.
          // This is OSM-policy-compliant passive caching (no pre-fetching).
          {
            handler: 'CacheFirst',
            options: {
              cacheableResponse: {
                statuses: [0, 200],
              },
              cacheName: 'map-tiles-osm',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                maxEntries: 2000,
              },
            },
            urlPattern: /^https:\/\/(\w+\.)?tile\.openstreetmap\.fr\/hot\/.*/,
          },
          {
            handler: 'CacheFirst',
            options: {
              cacheableResponse: {
                statuses: [0, 200],
              },
              cacheName: 'map-tiles-carto',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                maxEntries: 2000,
              },
            },
            urlPattern: /^https:\/\/(\w+\.)?basemaps\.cartocdn\.com\/.*/,
          },
          {
            handler: 'CacheFirst',
            options: {
              cacheableResponse: {
                statuses: [0, 200],
              },
              cacheName: 'map-tiles-cyclosm',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                maxEntries: 2000,
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
