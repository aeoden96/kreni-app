---
tags: [area/status, type/reference]
status: roadmap
updated: 2026-07-12
---

# Infra scaling & monetization — features to think about

> **Forward-looking assessment, nothing implemented.** Four correlated questions about where kreni's infra goes as users grow and as the Android build ships: (1) free tier vs paid Worker vs Hetzner, (2) consolidating all projects onto one server, (3) the WAF-only security posture, (4) a paid Android tier. Grounded in **measured Worker traffic** (below). Continues [[0002-realtime-proxy-cost-and-cadence]] and [[0001-mobile-platform-strategy]]; the Worker itself is [[gtfs-proxy-worker]], its place in the topology [[cloudflare-topology]].

## Measured baseline (last 30 days, `zet-gtfs-proxy`)

Pulled from the Cloudflare GraphQL analytics API (the Workers Observability logs are **not** a reliable meter here — the Worker runs `invocation_logs = false` + 5% head sampling, so log-based counts read empty; use GraphQL `workersInvocationsAdaptive` or the dashboard Metrics tab instead).

| Metric                | Value                                                                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Avg requests/day      | **~4,000**                                                                                                                                                     |
| Peak day (2026-07-09) | **16,721**                                                                                                                                                     |
| Other peak days       | 12,824 · 12,741                                                                                                                                                |
| Typical day           | 1,000–4,000                                                                                                                                                    |
| 30-day total          | **~120,000**                                                                                                                                                   |
| Errors (30 days)      | **0**                                                                                                                                                          |
| Subrequests           | ~48% of requests — edge cache absorbs ~half the ZET origin hits, but **every hit is still a billed invocation** (see [[0002-realtime-proxy-cost-and-cadence]]) |
| CPU p50 / p99         | 0.7 ms / ~330 ms (the p99 is the 10-min congestion cron, not user polls)                                                                                       |

**The number that matters:** the free tier's real limit is **100,000 requests/day**. On the worst day this month we used **17%** of it; on a typical day ~4%. This reframes everything below — the app is far from any paid threshold today.

---

## #1 — Free tier vs $5 Standard vs Hetzner

**Verdict: nowhere near needing to pay; when we do, the $5 Standard tier is the move — not Hetzner.**

Runway on the **free** tier from the 16.7k peak day:

- **~6× current peak traffic** before the 100k/day cap threatens.
- **~8×** after the free 7→10 s poll change (Lever A in [[0002-realtime-proxy-cost-and-cadence]], **still unshipped** — `REALTIME_POLL_INTERVAL` is `7_000` in `src/config/index.ts`, Worker `CACHE_TTL_SECONDS = 7`). Ship this regardless: one line each side, ~30% fewer requests, same freshness.

The **$5 Standard** tier is a plateau, not a recurring step: **10M req/mo included** (≈ 333k/day) + 30M CPU-ms (never approached — polls are 0.7 ms). Per [[0002-realtime-proxy-cost-and-cadence]] it holds to ~16k MAU before *any* overage, and overage is $0.30/M. So free → $5 covers roughly **600 DAU → 16k MAU** in one step.

**Hetzner is not the answer for this endpoint.** The only lever that beats per-invocation billing is free edge-cache hits, and that's achievable **on Cloudflare** (R2 + Durable-Object-alarm writer) without CORS regressions or babysitting a process — and only worth it at tens-of-thousands of MAU. A VPS drags a stateless edge workload onto a single-region origin for no gain at this scale. Keep the live feed on Cloudflare.

**The best reason to take the $5 tier isn't capacity — it's removing the daily dark-out DoS vector** (see #3).

---

## #2 — One (beefier) server for all projects?

**Verdict: no. Keep kreni on Cloudflare, separate from the nn-rag box. The platform-per-workload split is a strength, not an accident.**

- **Opposite workload shapes.** nn-rag's box is a stateful, disk-heavy _data_ server (pgvector ~11 GB + `acts.db` ~7 GB + 3.3 GB daily dumps — it has **already hit 100% disk once**, which silently broke its backend deploy). kreni's proxy is stateless, spiky, latency-sensitive, edge-shaped. Co-locating them lets a kreni spike (or abuse burst) starve the legal-RAG DB of CPU/RAM/disk-IO.
- **Blast radius.** kreni's proxy is public and unauthenticated; nn-rag's box holds the whole corpus with Postgres bound loopback-only. Sharing a host widens the data box's attack surface and creates a single point of failure that takes **both** products down.
- **We'd lose kreni's best property:** today it's **$0 and zero-ops** (Pages + Worker, self-managing, DDoS-absorbed at ~300 edge PoPs). A VPS _adds_ patching, disk monitoring, and one-region latency to something that currently costs nothing.
- **The economics don't pencil.** Hetzner boxes are ~€5 each; sharing one vs. running two saves a few euros — not worth the coupling.

**When consolidation would make sense:** only if kreni grows a genuinely stateful backend of its own — and even then, its _own_ small box or a Cloudflare-native store (D1 / Durable Objects), never folded into the nn-rag data box.

---

## #3 — Security posture (WAF-only, no app↔worker auth)

**Verdict: proportionate to the (low) real threat. Two cheap gaps to close; everything beyond is premature.** See also [[gtfs-proxy-worker]]'s auth/CORS section.

The threat model is right: no accounts, no user data, no secrets (ZET data is public). Real risks are only (a) someone abusing the Worker as a free proxy / burning quota, and (b) scraping — neither catastrophic, and a _targeted_ attacker gains almost nothing. The header-based WAF rules (empty-UA, no-Referer, `X-App-Request` custom header — verified attached in `src/stores/dataCache.ts`, 15 req/10 s rate limit) are trivially forgeable but stop the lazy 95%, which is the correct amount of investment. **Don't over-build here.**

Two gaps worth closing:

1. **The real DoS vector is the 100k/day free cap → app dark-out.** On the free plan, exceeding 100k requests in a UTC day errors the Worker for the rest of that day (dark for everyone). Sharp edge: the WAF limit of **15 req/10 s per IP = ~129,600/day per IP**, which **alone exceeds the 100k daily cap** — so a single sustained IP, staying within the WAF rule, can dark-out the app. Fix by tightening the per-IP limit on `vehicle-positions` specifically, **and/or moving to the $5 tier** (no daily cap → this vector disappears; abuse costs cents, not an outage).
2. **Enable the Worker's own rate-limit binding.** `RATE_LIMITER` is scaffolded but commented out and never called (see [[gtfs-proxy-worker]] and the open item in [[project-roadmap]]). Turning it on adds a non-IP layer under the WAF rule.

> [!warning] Android WAF gotcha
> Once the Capacitor app calls the Worker, requests come from a native WebView — `Referer`/`Origin` won't look like a browser (often `https://localhost` / `capacitor://`) and may fail the "block no-Referer" / header WAF rules. **Verify the WAF doesn't block the Android app's own Worker calls** (service-alerts, congestion, nextbike, road-closures still go through the Worker on Android even after the live feed goes direct-to-ZET per [[0002-realtime-proxy-cost-and-cadence]]). Real day-one breakage risk.

Turnstile / signed requests are premature until abuse actually appears.

---

## #4 — Paid Android variant

**Verdict: mostly no infra change. A paid tier ships with zero backend work; the one server-ish feature (push) fits inside the existing Worker.** Monetization stance (RevenueCat, AdMob) lives in [[0001-mobile-platform-strategy]] and [[android-native-roadmap]].

**(A) Client-side pro — no infra (the sweet spot):** remove ads · unlimited favourites/saved routes · custom themes · advanced map layers · home-screen widgets · offline map packs (bundled PMTiles) · more geofenced arrival alarms. Entitlement is a boolean from the **RevenueCat** SDK (receipts validated on their servers, free under $2.5k/mo revenue; Play handles billing). **Nothing stored server-side.**

**(B) Server-dependent pro — where it lives:**

- **Push notifications** (service-alert pushes, delay alerts) — needs a server-side FCM sender. Per [[android-native-roadmap]] this is **the existing CF Worker calling FCM HTTP v1**, device tokens in **KV or D1**. Stays on Cloudflare, no new box.
- **Cross-device favourites sync** → **Cloudflare KV/D1**, still serverless.
- Only a genuinely heavy/stateful feature (server-side multi-modal trip planning, an LLM "ask about your commute") justifies a real backend — reach for **CF D1 / Durable Objects / Workers AI first, a dedicated Hetzner box last**. If LLM, reuse the nn-rag playbook (Ollama free tier / Anthropic with a hard budget cap) but as a _separate_ service, never on the legal-RAG box (#2).

---

## Billing-overage protection (the real fear)

The concern: on the paid Workers plan, a bad actor curling the API could run up a large overage. Verified findings and the mitigation, from Cloudflare docs + this account's live config (2026-07-12).

**The uncomfortable truth:** Cloudflare has **no hard spend cap** for Workers — no "stop at $X" switch. The closest thing is **Budget Alerts** (shipped 2026-04-13; Manage Account → Billing → Billable Usage → Set Budget Alert): dollar-threshold _email warnings_ on projected monthly spend. A smoke detector, **not** a circuit breaker. So the whole strategy is to ensure abusive requests **never reach the billing meter** — which is where Cloudflare is genuinely strong.

**The mechanism that saves you:** per Cloudflare's own docs, _"requests blocked by WAF or other security features will not count"_ as Worker invocations. Blocking happens at the **edge, before the Worker runs** — so a request dropped by a WAF rule or rate-limit rule is **$0**. The catch: this only applies to traffic entering through a **custom domain / route on your zone**. A `workers.dev` subdomain is treated as a "Free website" and **bypasses** your zone's WAF/rate-limit rules entirely.

**Where this account actually stands (verified via CF API):**

| Layer                                                           | Status                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------------------- |
| Worker on a zone custom domain (`api.kreni.app`, proxied)       | ✅ **already in place** — the important structural piece             |
| Zone WAF custom rules + rate-limiting rule deployed at the edge | ✅ live (403 to header-less curl confirms edge blocking)             |
| Automatic L7 DDoS mitigation + request collapsing               | ✅ always on, free                                                   |
| `*.workers.dev` route + Preview URLs (the unfiltered backdoor)  | ✅ **disabled 2026-07-12** — `api.kreni.app` is now the sole ingress |
| Budget alert                                                    | ⬜ **to set** when/if going paid                                     |
| In-Worker `RATE_LIMITER` binding                                | ⬜ off (edge rule is the enforced one)                               |

**The math that should calm the fear:** overage is $0.30 / million requests. Reaching **$1,000** needs ~**3.3 billion** _billed_ requests in a month (~1,270 req/s for 30 days) that all slip past DDoS mitigation **and** the rate-limit rule **and** request collapsing. With the edge stack in front of `api.kreni.app` — which it now is — abusive traffic is dropped for free before billing; the realistic worst case tracks _legitimate_ traffic only (single/low-double-digit dollars). The CPU-ms billing dimension isn't an attack surface either: the only heavy job (the congestion cron) runs on a fixed 144×/day schedule an attacker can't trigger.

**Layered model (in priority order):** free plan = hard $0 cap (can't be billed, just 100k/day dark-out) → custom domain ✅ → edge rate-limit rule ✅ (could tighten) → DDoS ✅ → budget alert ⬜ → manual kill switch (disable the Worker route / "Under Attack" mode) for the worst case.

> [!warning] Durability gap — lock the backdoor in config
> The `workers.dev` disable was done in the dashboard, but the Worker repo's `wrangler.toml` doesn't set `workers_dev = false`. A future `wrangler deploy` could silently re-open the backdoor. **Add `workers_dev = false` to `~/projects/zet-live-realtime-cf-worker/wrangler.toml`** so the closed state is version-controlled and reproducible.

**R2 (`data.kreni.app`)** is not a meaningful overage risk: R2 billing is storage + operations with **no egress fees**, and static assets served through the proxied custom domain are mostly free CDN cache hits.

## Prioritized actions (value-per-effort)

0. ✅ **Done 2026-07-12 — closed the `workers.dev` backdoor.** Disabled the Worker's Production `workers.dev` route and Preview URLs; `api.kreni.app` (behind the edge WAF/rate-limit/DDoS stack) is now the sole ingress. This was the one real hole in the overage protection.
1. **Lock it in config:** add `workers_dev = false` to the Worker repo's `wrangler.toml` so a future deploy can't silently re-open the backdoor (see §Billing-overage protection durability callout).
2. ✅ **Done 2026-07-12 — 7→10 s poll (client only).** Raised `REALTIME_POLL_INTERVAL` to 10 s; left Worker `CACHE_TTL_SECONDS` at 7 s (the `TTL ≤ P` invariant makes frontend-only the safe path). ~26% fewer requests. Optional Step 2 (Worker `TTL` → 10 s) is on the shelf. See [[realtime-polling-timing]].
3. **Tighten the edge rate-limit** on `vehicle-positions` (15 req/10 s ≈ 130k/day per IP is looser than needed) and/or enable the Worker's `RATE_LIMITER` binding as a second layer.
4. **Set a Budget Alert** ($5 / $15) before any paid upgrade — the only early-warning CF offers (no hard cap exists).
5. **Don't change tier yet** — at ~17% of the free cap on peak days. Go to **$5 Standard** when peak days approach ~60–70k **or** to kill the daily dark-out vector — whichever first.
6. **When Android ships:** verify WAF doesn't block the native WebView's Worker calls; take the live feed direct-to-ZET via `CapacitorHttp`.
7. **Paid tier:** RevenueCat + client-side entitlements, no infra. Push goes in the existing Worker (+ KV/D1 tokens) when wanted.
8. **Keep the boxes separate.** Give kreni its own backend (CF D1/DO first, Hetzner last) only if a stateful/heavy pro feature lands.

## Open items

- [x] **Close the `workers.dev` backdoor** — done 2026-07-12 (Production route + Preview URLs disabled; `api.kreni.app` is sole ingress).
- [ ] Add `workers_dev = false` to `~/projects/zet-live-realtime-cf-worker/wrangler.toml` so the disable is version-controlled.
- [x] Ship Lever A Step 1 (client 7 → 10 s poll) — done 2026-07-12, `src/config/index.ts`. Optional Step 2 (Worker `TTL` → 10) still open. See [[realtime-polling-timing]], [[0002-realtime-proxy-cost-and-cadence]].
- [ ] Tighten the edge rate-limit on `vehicle-positions` and/or enable the Worker `RATE_LIMITER` binding.
- [ ] Set a CF Budget Alert before any paid upgrade (no hard spend cap exists).
- [ ] Before Android store release: confirm WAF rules pass the Capacitor WebView's Worker calls.
- [ ] Decide the first paid bundle (client-side only) and wire RevenueCat.
- [ ] Re-check the free-cap headroom against real traffic before any tier change (traffic is spiky; the daily cap bites before monthly volume looks big).

## Related

[[0002-realtime-proxy-cost-and-cadence]] · [[0001-mobile-platform-strategy]] · [[gtfs-proxy-worker]] · [[cloudflare-topology]] · [[android-native-roadmap]] · [[project-roadmap]]
