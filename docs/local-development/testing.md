---
tags: [area/local-dev, type/reference]
status: current
updated: 2026-07-04
---

# Testing

> [!warning] `tests/README.md` is stale
> The near-code `tests/README.md` only documents the legacy Python functional-test script and never mentions Vitest or Playwright — which are the actual primary test frameworks in current use (confirmed by `package.json` scripts and Playwright artifacts under `test-results/`). This note (`testing.md`) is the current picture; treat `tests/README.md` as covering one narrow, older suite only.

## Unit tests — Vitest 4

Config: `vitest.config.ts`, two projects:

- **`unit`** — jsdom environment, `src/**/*.{test,spec}.{ts,tsx}`, setup `src/test/setup.ts`, uses `fake-indexeddb` for IndexedDB-backed store tests.
- **`storybook`** — browser-mode (headless Chromium via `@vitest/browser-playwright`), runs `@storybook/addon-vitest` against `.storybook/` — i.e. every Storybook story doubles as a test.

```bash
yarn test            # unit project only — this is what CI runs
yarn test:watch
yarn test:storybook
yarn test:coverage
yarn test:ui          # Vitest UI, unit project
```

Existing unit test files: `src/stores/realtimeStore.test.ts`, `src/utils/gtfs.test.ts`, `src/utils/realtime.test.ts`, `src/utils/offScreenIndicator.test.ts`, `src/utils/stopMarkersMath.test.ts`, `src/utils/vehicles.test.ts`.

## E2E tests — Playwright, via Docker

Config: `playwright.config.ts`. Runs entirely inside Docker (`docker-compose.playwright.yml`) so the Vite dev server and the browser share `localhost` with no host↔container networking:

```bash
yarn test:e2e             # docker compose run --rm playwright-runner
yarn test:e2e:headed      # playwright test --headed (host-side)
yarn test:e2e:report      # open the HTML report
yarn pw:server            # standalone browser server, for MCP / interactive debugging
```

- Specs in `tests-e2e/`: `map.spec.ts`, `navigation.spec.ts`, `realtime.spec.ts`, `search.spec.ts`, `smoke.spec.ts`, `stop-info.spec.ts`, plus a `mobile/` subfolder mirroring those with Pixel 5 emulation (`*.mobile.spec.ts` naming convention, run as a separate `mobile-chrome` project with `slowMo: 600` and a single worker for easy visual debugging).
- `VITE_E2E=true` exposes the Leaflet map instance on `window.__leafletMap` for test assertions.
- `VITE_GTFS_PROXY_URL` is pointed at `http://localhost:9999` (a mock) during E2E so `page.route()` can intercept realtime fetches — see `fixtures.ts`/`realtime-mock.ts`.
- **E2E is not run in CI** (`ci.yml`'s `test` job runs `yarn test`, the Vitest unit project, only).

## Python functional tests — data-pipeline regression checks

`tests/test_functional_requirements.py` validates the _output_ of the GTFS pipelines ([[gtfs-zet]]), not app behavior — it asserts on shard file sizes/schemas against known optimization targets (e.g. stop timetables ~100KB vs 570KB baseline, vehicle positions ~252KB vs 1.2MB baseline). Requires the GTFS scripts to have already been run:

```bash
python3 scripts/process_gtfs.py
python3 tests/test_functional_requirements.py
```

Useful as a regression check when touching `scripts/process_gtfs.py`, but it says nothing about whether the React app renders correctly — that's what Vitest/Playwright are for.

## Static analysis gates

`ci.yml` runs `typecheck-and-lint` (`tsc -b` + `eslint`) and `knip` (dead-code/deps) as separate parallel jobs — see [[ci-cd-pipelines]]. Locally these are also enforced via husky hooks — see [[tooling-and-hooks]].
