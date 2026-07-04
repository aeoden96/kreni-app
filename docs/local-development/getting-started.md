---
tags: [area/local-dev, type/guide]
status: current
updated: 2026-07-04
---

# Getting started

## Prerequisites

- **Node.js** 20+ (CI itself runs Node 22 — see [[ci-cd-pipelines]])
- **Python** 3.12+
- **Yarn** 1.22 (classic) — pinned via `packageManager` in `package.json`

## Install & run

```bash
git clone https://github.com/aeoden96/kreni-app.git
cd kreni-app

# 1. Install dependencies
yarn install

# 2. Process city & transit data — required before first run,
#    since public/data* are git-ignored generated artifacts
bash scripts/run.sh         # ZET metadata — see [[gtfs-zet]]
bash scripts/run_train.sh   # HŽPP metadata — see [[gtfs-train]]

# 3. Start development server
yarn dev            # or: yarn dev:host  (LAN access)
```

`.env` is not required for basic map browsing, but realtime features (vehicle positions, alerts, Nextbike, road closures) need `VITE_GTFS_PROXY_URL` pointed at a running `kreni-app-worker` instance — copy `.env.example` to `.env` and fill it in. See [[environment-variables]] and [[cloudflare-topology]].

## Everyday scripts

| Command                      | Purpose                                         |
| ---------------------------- | ----------------------------------------------- |
| `yarn dev` / `yarn dev:host` | Vite dev server                                 |
| `yarn build`                 | `tsc -b && vite build`                          |
| `yarn tsc`                   | Type-check only (`tsc -b --noEmit`)             |
| `yarn lint`                  | ESLint                                          |
| `yarn test`                  | Vitest unit project                             |
| `yarn test:e2e`              | Playwright, via Docker                          |
| `yarn storybook`             | Component workshop at `:6006`                   |
| `yarn cap:sync`              | Build + sync into the Capacitor Android project |

Full breakdown of test tooling: [[testing]]. Full breakdown of lint/hook tooling: [[tooling-and-hooks]].

> [!note] AGENTS.md protocol
> Any AI coding agent working in this repo must run `yarn tsc` and `yarn lint` after every change and fix all errors before continuing (per root `AGENTS.md`). This is a hard rule, not a suggestion — see [[tooling-and-hooks]].
