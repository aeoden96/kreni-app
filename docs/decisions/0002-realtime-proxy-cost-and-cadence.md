---
tags: [area/decisions, type/decision-record]
status: proposed
updated: 2026-07-04
---

# 0002 — Realtime Proxy: Cost, Cadence & Android Data Path

> **Analysis + proposed direction.** How the live-vehicle data path costs money, what ZET's real update cadence is (measured), and the levers to reduce cost — for the web app and specifically for the Capacitor Android build. Status: **proposed; nothing implemented yet.** Continues [[0001-mobile-platform-strategy]]; the Worker itself is documented in [[gtfs-proxy-worker]] and [[cloudflare-topology]].

## TL;DR

- **The only thing that costs money is the live-feed poll.** Everything else the Worker does (KV alerts, R2 datasets, road closures, nextbike) is low-frequency and effectively free. Cost ≈ `active_users × live_poll_rate`, because a Cloudflare Worker **cache HIT is still a billed invocation** — edge caching protects ZET's origin, not your bill.
- **ZET regenerates the feed every 10.0 s — measured, not assumed** (see [Measured cadence](#measured-cadence-the-key-finding)). The current **7 s** poll is _misaligned_: it fetches ~30% duplicate documents and buys **zero** extra freshness (you can't be fresher than a 10 s source).
- **Biggest free win:** poll **10 s**, not 7 s. Same freshness, ~30% fewer requests, no phase drift. This is "align to ZET" done with the correct number.
- **Biggest structural win (Android):** a Capacitor native build can call ZET **directly** via `CapacitorHttp` (native HTTP stack is not CORS-bound), removing the hottest endpoint from the Worker entirely → **$0 for every Android user's live polling**.
- **Switching CDN/platform does not help.** Real AWS CloudFront is _more_ expensive for this shape (request-heavy, 2 KB payload). The only lever that beats per-invocation billing is **free edge-cache hits**, achievable **on Cloudflare** (R2 + Durable Object writer) without changing vendor — and only worth it at tens-of-thousands of MAU.

## How the data path actually works

App (`VITE_GTFS_PROXY_URL` → `zet-gtfs-proxy.workers.dev`, see [[environment-variables]]) talks to a single external Worker that fans out to several upstreams. The live layer is efficient already:

- `src/stores/realtimeStore.ts` → `fetchAll()` pulls **one** combined GTFS-RT protobuf per poll (`?endpoint=vehicle-positions`) and decodes vehicles + trip-updates + alerts from that single ~2 KB response.
- `src/hooks/useRealtimeData.ts` schedules polling via React Query, using an **adaptive delay** derived from the Worker's `Age` header (clock-skew-safe) so the next poll lands just after the edge cache expires. Foreground only (`refetchIntervalInBackground: false`).
- `src/config/index.ts` → `REALTIME_POLL_INTERVAL = 7_000`; Worker `CACHE_TTL_SECONDS = 7`.

### Endpoints by real frequency (per active user)

| Endpoint                                   | Source                 | Cadence                                   | Cost weight |
| ------------------------------------------ | ---------------------- | ----------------------------------------- | ----------- |
| `vehicle-positions` (live feed)            | ZET protobuf           | **~7 s, foreground** (adaptive via `Age`) | **~99%**    |
| `nextbike`                                 | nextbike.net           | 15 s, cycling mode only                   | tiny        |
| `service-alerts`                           | CF KV                  | 5 min edge                                | negligible  |
| `congestion-history`                       | CF KV                  | 10 min                                    | negligible  |
| `road-closures`                            | Zagreb OD, transformed | 1 h                                       | negligible  |
| `announcement` / `javni-zdenci` / datasets | KV / R2                | 60 s edge / 1 week                        | negligible  |

## Where the money goes

Cloudflare Workers **Standard** (Paid): $5/mo base, **10 M requests included** then $0.30/M; **30 M CPU-ms included** then $0.02/M-ms. Crucially: **a cache HIT is a full billed invocation** — `caches.default.match()` runs _inside_ the Worker. So the 7 s edge cache bounds ZET **subrequests**, not Worker **invocations**. The bill is therefore:

```
invocations ≈ active_users × live_feed_poll_rate     (all else is rounding error)
CPU per request is trivial (cache lookup + passthrough, ~1–2 ms)
```

Illustrative headroom (20 min active use/user/day, foreground):

| Poll interval | req/user/day | Users before overage (10 M/mo) |
| ------------- | ------------ | ------------------------------ |
| 7 s           | ~171         | ~11 k MAU                      |
| 10 s          | ~120         | ~16 k MAU                      |
| 15 s          | ~80          | ~24 k MAU                      |

## Measured cadence — the key finding

Question that matters: **not** how often each vehicle's GPS pings (docs say ~10–20 s — see [[gps-realtime-trust-model]]), but **how often the ZET feed _document_ regenerates**, since that caps how fresh any poll can be.

**Method:** polled `https://www.zet.hr/gtfs-rt-protobuf` every 2 s for 3 min, decoding the GTFS-RT `header.timestamp` (ZET's server-side "generated at" clock) and hashing the body. Re-runnable: `node scripts/probe-zet-cadence.mjs` (env-tunable `SAMPLE_MS` / `DURATION_MS` / `ZET_URL`).

**Result — the feed regenerates every exactly 10.0 s:**

```
header.timestamp: 01:25:08 → 01:25:18 → 01:25:28 → 01:25:38 → 01:25:48 → …
```

- Header-timestamp gaps: **17/17 = exactly 10.0 s** (min 10, max 10, mean 10)
- Body-change gaps: mean **10.0 s** (lone 8 s/12 s readings are the 2 s sampler landing either side of the boundary)
- **18 distinct documents in 180 s** (a true 7 s cadence would yield ~25)
- Freshest per-vehicle ping inside each document also advances only once per 10 s cycle → **nothing newer than ~10 s old ever exists** to fetch.

> [!caution] Sampled off-peak
> Measured ~01:25 local, 7 active vehicles. The 10 s cadence is a property of ZET's feed-generation job, not vehicle count (count changes payload size, not the interval), so peak won't change the _interval_ — but a rush-hour re-run would make it airtight. **Open item.**

### Why 7 s is the wrong number

7 and 10 don't divide evenly, so client and server drift in and out of phase. Over each `LCM(7,10) = 70 s` window ZET emits **7** documents while the client polls **10** times → **~30% of polls return a byte-identical document already held.** No freshness gain, since the source is capped at 10 s. And the existing `Age`-based adaptive scheduler will happily **phase-lock** a 10 s poll to each new document, so 10 s is as fresh in practice as 7 s.

## Q1 — Improving cost for everyone

**Lever A (free, do this):** `REALTIME_POLL_INTERVAL` **7 → 10 s** and Worker `CACHE_TTL_SECONDS` **7 → 10**. Same freshness, ~30% fewer requests, no phase drift. Keeps the adaptive `Age` logic.

- _Optional enhancement:_ Worker sets cache TTL dynamically to `header.timestamp + 10 s`, so the edge expires exactly when ZET emits the next document — phase-locks the whole pipeline; every client poll returns a fresh doc with near-zero waste.

**The hard ceiling:** the tempting "cron → R2 → free CDN URL (no Worker invocation on HIT)" pattern **cannot** serve the live feed, because Cloudflare's **cron floor is 60 s** but the data must be ~10 s fresh. That pattern is correct for `service-alerts` / `congestion` / `road-closures` / datasets — which already use it. For the live feed, sub-minute freshness inherently means per-request compute _unless_ you use a **Durable Object alarm** as the writer (see Q3). No cheaper platform escapes `users × poll_rate` for an always-fresh proxy.

## Q2 — Improving cost just for the Android app

The Worker exists on the live path for **one reason: CORS.** ZET returns no `Access-Control-Allow-Origin` (verified), so a browser can't call it directly. **A Capacitor native app is not a browser on this axis:** the `@capacitor/http` plugin (`CapacitorHttp`) patches `fetch`/`XHR` to route through the native Android HTTP stack, which is **not CORS-enforced**. (Not installed yet — current deps are `@capacitor/core@8` + `android`, no http plugin.)

So Android can point the live feed **straight at ZET**, removing the dominant cost endpoint from the Worker → **$0 per Android user for live polling.** Worker cost then = web users' live feed + everyone's low-frequency KV/R2 endpoints.

**Must stay on the Worker even on Android** (no direct ZET origin): `service-alerts`, `congestion-history` (live in _our_ CF KV), `road-closures` (transformed), `nextbike` (different upstream, also CORS-blocked), datasets/`javni-zdenci` (R2). Only `vehicle-positions`/`trip-updates` have a direct upstream.

**Trade-offs:**

- **Loses the edge cache that shields ZET** — every device hits ZET's Apache origin directly every ~10 s. At scale that's real, uncoalesced load on a public-agency server; they could rate-limit/block by IP/UA. _This is the main risk — operational/ethical more than technical._
- Loses `X-Cache-Status`/`Age` adaptive polling (ZET sends `max-age=0`) → poll a fixed 10 s timer on native.
- Loses the Worker's resilience layer → ZET downtime hits users directly.

**Recommended shape (hybrid):** Android uses `CapacitorHttp` direct-to-ZET on a fixed 10 s timer **with automatic fallback to the Worker** on error/timeout; everything else stays on the Worker. A `Capacitor.isNativePlatform()` branch in `fetchRealtimeFeed` (`src/utils/realtime.ts`) selects the path; the rest of the app is unchanged.

## Q3 — Does another platform / CDN save money?

**Reframe first:** this workload is **request-bound, not bandwidth-bound.** The live payload is **2 KB**; every CDN's pitch (100 GB → 50 TB data transfer) solves a problem we don't have. What you buy on any platform is **request count**.

| Architecture                                                | Est. $/mo @ 50 k MAU, 10 s poll (~120 M req/mo) | Scales with                 |
| ----------------------------------------------------------- | ----------------------------------------------- | --------------------------- |
| **Current CF Worker** (per-invocation)                      | ~$41                                            | users                       |
| **CF R2 + Durable-Object writer** (free edge hits)          | ~$10                                            | ~flat                       |
| **DO WebSocket push** (one poller, fan-out)                 | ~$10–20                                         | connections/messages        |
| **Real AWS CloudFront** (per-req + DTO)                     | ~$120–150                                       | users, worse slope          |
| **Flat-rate CloudFront reseller** ("$15, 10 M, no overage") | $15, hard cap at 10 M then forced upgrade       | capped                      |
| **$5 VPS + Cloudflare free CDN in front**                   | ~$5                                             | ~flat (+ ops, DDoS surface) |

- **CloudFront is worse**, not better: request price ~$0.75–1.00/M (vs CF $0.30/M) **plus** data-transfer-out CF doesn't charge on Workers. The flat-rate reseller plan gives 10 M for $15 where CF gives 10 M for $5, and "no overage" = throttle/forced-upgrade.
- **The only lever that beats per-invocation billing is free edge-cache hits** (CloudFront's own "Example 2: requests to static assets are free"). On Cloudflare that's the **R2 + Durable-Object-alarm** model: a single DO polls ZET every ~10 s → writes the protobuf to R2 → served via an R2 custom domain behind the CDN cache. User polls become **free CDN hits**; cost drops to `O(POPs × time)` ≈ flat regardless of user count.
- **DO-alarm is the escape hatch** from the 60 s cron floor (alarms reschedule at ~10 s), which is what makes this viable for a sub-minute feed. Trade-off: cache-TTL vs write-interval alignment pushes worst-case staleness toward ~20–30 s (a mild UX regression vs today's ~10 s), plus added complexity.

**Break-even:** the Worker is ~$5 up to ~16 k MAU (at 10 s), ~$41 at 50 k, ~$80 at 100 k. The R2+DO re-arch saves ~$30/mo at 50 k and only becomes a _large_ win in the hundreds-of-thousands MAU range. **Below ~tens of thousands MAU it's premature.**

## Recommendation (prioritized)

1. **Poll 10 s, not 7 s** (`REALTIME_POLL_INTERVAL` + Worker `CACHE_TTL_SECONDS`). Free ~30% cut, correct alignment to ZET, helps web _and_ Android. Do this first regardless of anything else.
2. **Android-direct-to-ZET via `CapacitorHttp`, hybrid with Worker fallback.** Structurally removes the biggest cost as the Android base grows; bigger win than any vendor swap for the mobile slice.
3. **Do not migrate to CloudFront / another CDN** — strictly more expensive for tiny-payload/high-request-count.
4. **Keep the R2 + Durable-Object cache re-arch on the shelf** as the scale play (correct at tens-of-thousands+ MAU, stays on Cloudflare).

Net cheapest path: **poll less → take Android off the Worker → (only later) turn the live feed into a cached R2 asset**, all on the platform you already run.

## Open items

- [ ] Re-run the cadence probe at **rush hour** to confirm the 10 s step holds under load.
- [ ] Implement Lever A (7 → 10 s) — one-liner each in `src/config/index.ts` and the Worker's `CACHE_TTL_SECONDS`.
- [ ] Spec the Android hybrid path (`@capacitor/http`, `isNativePlatform()` branch in `src/utils/realtime.ts`, fallback + fixed-timer polling).
- [ ] If/when scale warrants: full design for the R2 + Durable-Object-writer model (write cadence, cache TTL/purge, staleness budget).
- [ ] Fix the stale `service-alerts` staleness comment in the Worker repo (unrelated, noted in [[gtfs-proxy-worker]]).

## Related

[[gtfs-proxy-worker]] · [[cloudflare-topology]] · [[gps-realtime-trust-model]] · [[0001-mobile-platform-strategy]] · [[data-flow]] · [[environment-variables]] · [[project-roadmap]]
