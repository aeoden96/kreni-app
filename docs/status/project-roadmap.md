---
tags: [area/status, type/reference]
status: roadmap
updated: 2026-07-04
---

# Project roadmap — everything open, in one place

A single landing spot for open items scattered across the vault. Prefer editing the source note (linked below) over this file — this note's Dataview query surfaces them automatically; the hand-written list underneath is a fallback for readers without the Dataview plugin.

```dataview
TABLE tags, updated
FROM "docs"
WHERE status = "roadmap"
SORT updated DESC
```

## Known open items (manual mirror)

- **Train mode** — multi-leg journey routing, live train locations, tapped-train sync, train identity/search grouping. Full list: [[train-mode-roadmap]].
- **Stop departures** — Phase-2 UX idea to replace "N stajališta" text with progress pips. See [[stop-departures]]'s known-limitations callout.
- **Platform strategy sequencing** — native geolocation/push, then `npx cap add ios`; MapLibre GL JS migration when marker count janks; RN only if the product becomes notification/widget-centric. See [[0001-mobile-platform-strategy]]'s sequencing section.
- **Android native powercharge** — tiered native-capability roadmap (haptics/shortcuts/share → push/local/geofenced alerts → widgets/MapLibre/code-splitting). Full list: [[android-native-roadmap]].
- **Infra scaling & monetization** — measured free-tier headroom (~6× current peak, ~8× after the 7→10 s poll), the $5-Standard-tier trigger, why _not_ to consolidate onto the nn-rag Hetzner box, the 100k/day dark-out DoS gap, and a no-infra paid Android tier. Full assessment: [[infra-scaling-and-monetization]].
- **CI/CD hardening** — signed-AAB release + Play publish, SHA-pinned actions, E2E-in-CI, coverage/bundle-size budgets. Shipped so far: Android build job, CodeQL, secretlint, least-priv perms, gradle Dependabot. Full list: [[ci-hardening-roadmap]].
- **Android App Links** — `public/.well-known/assetlinks.json` and the App-Links intent-filter are now scaffolded; still need the real `app.kreni` Play App Signing SHA-256 fingerprint (placeholder in the file). See [[android-native-roadmap]], [[0001-mobile-platform-strategy]].
- **`global-announcement.yml` CLI inconsistency** — "set" uses legacy `wrangler@3` CLI, "clear" uses `wrangler-action@v4`. Worth normalizing. See [[scheduled-jobs]].
- **Proxy Worker has no enforced rate limiting** — `RATE_LIMITER` binding is scaffolded but commented out and never called; the proxy is publicly reachable with no rate limit and (if `API_KEY` is unset, which appears to be the current production state) no auth either. See [[gtfs-proxy-worker]].
- **Proxy Worker's stale in-code comment** — claims service-alerts data is "at most ~35 minutes" stale (implying a 30-min GH Action cadence), but kreni-app's actual cadence is 4 hours. Worth fixing the comment in that repo. See [[gtfs-proxy-worker]].
- **Duplicate water-fountains data** — kreni-app bundles a static `javni_zdenci.json` copy while the proxy Worker already serves a live, R2-cached equivalent (`?endpoint=javni-zdenci`) it doesn't use. Not urgent, but worth deciding whether to consolidate. See [[city-services]], [[gtfs-proxy-worker]].

> [!note] Keeping this current
> When you resolve one of these, update the source note's frontmatter (`status: current` instead of `status: roadmap`) rather than editing this file directly — the Dataview query above will drop it automatically.
