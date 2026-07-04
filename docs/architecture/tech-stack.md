---
tags: [area/architecture, type/reference]
status: current
updated: 2026-07-04
---

# Tech stack

From `package.json` (`kreni-app`, v3.4.0). See [[overview]] for how these fit together.

| Layer               | Choice                                                | Notes                                                                                                              |
| ------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Framework           | React 19.2 + React Router 7                           | Client-side `BrowserRouter`, 7 route pages                                                                         |
| Build               | Vite 7                                                | `tsc -b && vite build`                                                                                             |
| Language            | TypeScript 5.9                                        | `tsc -b --noEmit` is the standalone typecheck script                                                               |
| Styling             | Tailwind CSS v4 + DaisyUI 5                           | see [[design-system]]                                                                                              |
| Maps                | Leaflet 1.9 / react-leaflet 5 + supercluster          | kept over MapLibre GL JS until marker count forces a migration — see [[0001-mobile-platform-strategy]]             |
| State               | Zustand 5                                             | `realtimeStore`, `dataCache`, `navigationStore`, `settingsStore`                                                   |
| Data fetching       | @tanstack/react-query 5                               | orchestrates realtime polling with adaptive delay based on the proxy Worker's `Age` header                         |
| GTFS-RT parsing     | gtfs-realtime-bindings                                | protobuf decoding of the combined vehicle-positions/alerts feed                                                    |
| CSV parsing         | papaparse                                             | used client-side for CSV-shaped static data                                                                        |
| i18n                | i18next / react-i18next                               | hr/en/de, see [[design-system]]                                                                                    |
| Persistence         | idb-keyval                                            | IndexedDB backing for zustand `settingsStore`/`navigationStore`                                                    |
| Offline             | vite-plugin-pwa (Workbox)                             | `StaleWhileRevalidate` for `/data/*.json` (7-day expiry), `CacheFirst` for OSM/Carto/CyclOSM tiles (30-day expiry) |
| Native wrapper      | Capacitor 8                                           | Android project in `android/`, app id `app.kreni` — see [[0001-mobile-platform-strategy]]                          |
| Unit tests          | Vitest 4                                              | two projects: `unit` (jsdom) and `storybook` (browser-mode Chromium) — see [[testing]]                             |
| E2E tests           | Playwright, via Docker                                | see [[testing]]                                                                                                    |
| Component workshop  | Storybook 10                                          | `.storybook/`, colocated `*.stories.tsx`                                                                           |
| Lint/format         | ESLint 10 (+ `eslint-plugin-perfectionist`), Prettier | see [[tooling-and-hooks]]                                                                                          |
| Dead-code detection | knip                                                  | run in CI and in the pre-push hook                                                                                 |
| Secret scanning     | secretlint + Gitleaks                                 | secretlint locally (pre-commit/pre-push), Gitleaks in CI                                                           |
| Hosting             | Cloudflare Pages                                      | project `zet-live`, deployed via `wrangler-action` — see [[cloudflare-pages-deploy]]                               |

> [!note] No wrangler config in this repo
> There is no `wrangler.toml`/`wrangler.jsonc` anywhere in the repo. Cloudflare Pages deployment is driven entirely from `deploy.yml` using `cloudflare/wrangler-action@v4`, and the GTFS-RT proxy Worker's own config lives in the separate `kreni-app-worker` project.
