---
tags: [area/ux-ui, type/reference]
status: current
updated: 2026-07-04
---

# Design system

## Styling — Tailwind CSS v4 + DaisyUI 5

Utility-first styling via Tailwind v4 (`@tailwindcss/vite` plugin, no separate PostCSS config needed at this version), themed with DaisyUI 5 component classes on top. See [[tech-stack]] for versions.

## Internationalization — i18next / react-i18next

Three locales in `src/i18n/locales/`: `hr.ts` (Croatian, primary/default), `en.ts`, `de.ts`. Setup entry point: `src/i18n/index.ts`. Language switching is exposed via `FlatLanguageFlags.tsx` in the navigation spider menu — see [[navigation-and-modes]].

Croatian is the natural default given the domain (ZET, HŽPP, Zagreb city services all speak Croatian natively) — note that [[service-alerts]]' AI-parsing pipeline also works in Croatian, and stop/station names throughout are preserved in their original Croatian form rather than translated.

## Analytics

Google Analytics (`gtag.js`) is the only client-side analytics: `src/utils/analytics.ts` defines `GA_MEASUREMENT_ID` and exposes `trackEvent`/`trackPageView` helpers (no-op if `window.gtag` is absent — safe in dev and in the Capacitor WebView without extra config). Used across page-view tracking, PWA install prompts, directions/search modal opens, and onboarding.

## Offline & PWA shell

`vite-plugin-pwa` (Workbox) precaches the app shell in production. Runtime caching: `StaleWhileRevalidate` for `/data/*.json` (7-day expiry, 500-entry cap — see [[gtfs-zet]]/[[gtfs-train]] for what's being cached), `CacheFirst` for OSM/CARTO/CyclOSM map tiles (30-day expiry, 2000-entry cap each).
