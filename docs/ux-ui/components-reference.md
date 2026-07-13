---
tags: [area/ux-ui, type/reference]
status: current
updated: 2026-07-04
---

# Components reference

A pointer map to the key UI components, not a full catalog — use Storybook (`yarn storybook`, `:6006`) for the visual/interactive reference, and [[components-reference]]'s linked feature docs for behavior specs.

## Stop view

- `StopModal.tsx` (full-screen) and `StopInfoBar.tsx` (compact bar) — both consume the single `useStopDepartures.ts` hook (unified in commit `c80d9b0`, replacing the older split `ApproachingVehicleCard`/`TimetableDepartureCard`/`StopTabSelector` components).
- `DepartureCard.tsx` — the presentation layer for a single departure row. Full behavior spec: [[stop-departures]].

## Map layer components

See [[map-and-navigation]] for the full `src/components/Map/` inventory (markers, clustering, spiderfier, route shapes, layer panels).

## Navigation

See [[navigation-and-modes]] for the spider menu component tree.

## Service alerts

`src/components/common/ServiceAlerts.tsx` — badge + full-screen panel, styled per GTFS-RT `Alert.Effect`. See [[service-alerts]] for both alert pipelines it can display.

## Storybook coverage

Component stories live both in `src/stories/` and colocated next to their components (e.g. `OffScreenStopIndicator.stories.tsx`, `BadgeWithPanel.stories.tsx`). Every story is also run as a Vitest test via `@storybook/addon-vitest` — see [[testing]].
