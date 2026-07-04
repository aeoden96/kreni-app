---
tags: [area/ux-ui, type/reference]
status: current
updated: 2026-07-04
---

# Navigation & modes

## The shared `GTFSMode` engine

Both ZET transit and HŽPP train views are rendered by the **same** page component (`GTFSMode`), parameterized by a single typed config object (`src/config/modes.ts`) rather than scattering `data`/`data-train` string checks across hooks and components:

```ts
export interface GTFSModeConfig {
  alwaysShowStops: boolean;
  dataDir: 'data' | 'data-train';
  hasRealtime: boolean;
  id: 'train' | 'transit';
  initialZoom?: number;
  loadingI18nKey: 'loadingTrain' | 'loadingTransit';
  minZoom?: number;
  onboardingVariant: 'train' | 'transit';
  stopZoom: number;
  timetableLookaheadMinutes: number;
}
```

| Field                       | `TRANSIT_MODE` (ZET)        | `TRAIN_MODE` (HŽPP)                                                 |
| --------------------------- | --------------------------- | ------------------------------------------------------------------- |
| `alwaysShowStops`           | `false`                     | `true` (sparse rail network needs stations visible at country zoom) |
| `dataDir`                   | `data`                      | `data-train`                                                        |
| `hasRealtime`               | `true`                      | `false` — see [[train-mode-roadmap]]                                |
| `stopZoom`                  | 17                          | 15                                                                  |
| `timetableLookaheadMinutes` | 60                          | 300                                                                 |
| `initialZoom` / `minZoom`   | (BaseMap defaults: 13 / 11) | 9 / 7                                                               |

Beyond ZET/train, the map also has **city / cycling / driving** modes with their own layer panels (`src/components/Map/layerPanels/`, `src/components/Map/modes/`) for the non-transit service layers — see [[city-services]] and [[map-and-navigation]].

## Spider menu navigation

The primary in-app navigation is the "spider" popup menu (`src/components/Navigation/`) — `SpiderMenu.tsx` expands into route search results (`SpiderRouteList.tsx`), quick actions (`SpiderActionRow.tsx`), and filters (`SpiderFilterBar.tsx`). This replaced the old map-tools FAB menu (removed in commit `05e79c8`, which also surfaced [[service-alerts]] directly rather than hiding it behind a menu tap).

See [[map-and-navigation]] for the full map-layer component inventory this navigation controls.
