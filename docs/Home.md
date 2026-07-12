---
tags: [area/home, type/moc]
status: current
updated: 2026-07-04
---

# Kreni — Docs Vault

> [!note] What this is
> This vault is the source of truth for how **Kreni** (Zagreb's all-in-one mobility & city service map) actually works today. It is generated from the codebase, not the other way around — when code and docs disagree, the code wins and this vault should be corrected.
>
> Root-level `README.md`, `CHANGELOG.md`, and `AGENTS.md` still live at the repo root and are the GitHub-facing / process docs. Everything about architecture, features, infra, deployment, and local workflow now lives here.

## Map of content

### [[overview|Architecture]]

- [[overview]] — system shape: static SPA, zero-database, CF Pages + external Worker
- [[tech-stack]] — the stack and why each piece was chosen
- [[data-flow]] — build-time GTFS slicing → static JSON → client fusion → KV alerts
- [[realtime-polling-timing]] — a single live-feed poll's full delay budget + sequence diagrams (current vs proposed)

### Features

- [[stop-departures]] — the unified departure board (timetable + GPS fusion)
- [[gps-realtime-trust-model]] — what the GTFS-RT feed can and can't be trusted for
- [[train-mode]] — HŽPP train mode, current state
- [[service-alerts]] — "prometne obavijesti" (traffic notices), both the live and the AI-parsed paths
- [[city-services]] — parking, Nextbike, cycling, water fountains, EV charging, student cafeterias
- [[map-and-navigation]] — map layers, clustering, spider menu

### Data pipeline

- [[gtfs-zet]] — ZET GTFS → JSON pipeline
- [[gtfs-train]] — HŽPP GTFS → JSON pipeline
- [[static-city-datasets]] — the non-GTFS open-data layers

### Infra

- [[cloudflare-topology]] — Pages, KV, and the external `kreni-app-worker`
- [[gtfs-proxy-worker]] — the external proxy Worker itself: endpoints, auth, caching, its own cron
- [[ci-cd-pipelines]] — CI, deploy, and release-please workflows
- [[scheduled-jobs]] — the three cron-driven GitHub Actions (plus the Worker's separate cron)
- [[ollama-integration]] — where and why an LLM is in the pipeline
- [[environment-variables]] — every env var and who consumes it

### Deployment

- [[release-process]] — conventional commits → release-please → CHANGELOG
- [[cloudflare-pages-deploy]] — the `deploy.yml` walkthrough

### Decisions

- [[0001-mobile-platform-strategy]] — why Capacitor, not React Native or a TWA
- [[0002-realtime-proxy-cost-and-cadence]] — what the live feed costs, ZET's measured 10 s cadence, and the Android-direct data path

### Local development

- [[getting-started]] — clone to running dev server
- [[testing]] — Vitest, Playwright, and the Python data-pipeline tests
- [[tooling-and-hooks]] — husky, lint-staged, commitlint, knip, secretlint

### UX / UI

- [[design-system]] — Tailwind v4 + DaisyUI 5, i18n
- [[navigation-and-modes]] — GTFSMode engine, mode switching, spider menu
- [[components-reference]] — key component map + Storybook

### Status

- [[train-mode-roadmap]] — what's left to build for train mode
- [[infra-scaling-and-monetization]] — free-tier headroom (measured), the $5-tier trigger, one-box-for-everything, WAF posture, and a paid Android tier
- [[project-roadmap]] — every open item across the vault, in one place

## Open items across the vault

```dataview
TABLE status, updated
FROM #area/status OR "docs"
WHERE status = "roadmap"
SORT updated DESC
```

## All notes by area

```dataview
TABLE tags, status, updated
FROM "docs"
WHERE file.name != "Home"
SORT file.folder ASC
```
