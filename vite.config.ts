import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import pkg from './package.json';

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
        background_color: '#ffffff',
        description: 'Pratite tramvaje, autobuse i vlakove ZET-a uživo na karti Zagreba.',
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
      registerType: 'prompt',
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
          // Runtime caching for map tiles (OSM HOT + CartoCDN)
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
        ],
      },
    }),
  ],
});
