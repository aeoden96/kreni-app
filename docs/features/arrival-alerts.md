---
tags: [area/features, type/proposal]
status: proposed
updated: 2026-07-15
---

# Arrival alerts ("get off here") — proposed

> **Status: not built.** An earlier geofence-only prototype was removed on
> 2026-07-15 (see [below](#why-the-first-attempt-was-removed)). This doc is the
> product/UX spec for the version worth building, written from the rider's point
> of view — *not* a description of shipped behaviour.

## The job to be done

A rider reaches for an arrival alert because they want to **stop paying
attention**. It's dark, they're tired, they don't ride this line often, or
they're heads-down in their phone. The promise is: *"put your phone away — I'll
tap you on the shoulder in time to get off."*

That makes the real bar **trust**, not "fire a notification." If the alert is
ever wrong — early, late, or silent — the rider goes back to counting stops
themselves and never turns it on again. Every decision below serves
reliability first.

## What the rider actually wants

Framed as the four questions a rider is really asking:

### 1. Where am I going? → pick a *destination*, not a radius

Riders think in **destinations** ("the museum", "work", "Kvatrić"), never in
metres. The user should choose a **place or a stop**; the app resolves which
stop they alight at. Never expose a metre radius — that's our geofence math
leaking into their decision.

### 2. What vehicle am I on? → be *journey-aware*, especially transfers

The highest-value version knows the rider's **trip**, not just a point on a map.
The anxious moment is a **transfer** — "tram 6, off at Trg, change to bus 268."
The alert should ping:

- before each **transfer** (get off + which line/stall + expected wait), and
- before the **final stop**.

Ideally the rider never has to state which line they're on: infer it from a trip
they planned in-app, or from their movement along a route.

### 3. What do I select? → as close to one tap as possible

- **Best:** from a planned journey → a single **"Alert me"** toggle. The app
  already knows the alighting stops and transfers.
- **Good:** search a destination → **"Alert me here."**
- **Lead time in the rider's language:** *"one stop before"* / *"a couple of
  minutes before"* — never a metre slider.

### 4. What do I see when it pings? → glanceable and actionable

- Loud, buzzes, wakes the screen. This is the one moment the rider *wants* to be
  interrupted (MAX-importance heads-up channel).
- Says the thing that matters: **"Get off next — Kvatrić"** with a countdown the
  rider trusts (*2 stops left* / *~3 min*).
- Transfers spelled out: **"Get off at Trg → change to 268 (~4 min wait)."**
- One-tap actions on the notification: **Snooze / Got it / Cancel.**
- Tapping opens a live view — map with the rider + destination and a
  stops-remaining countdown — so a groggy rider reorients in a second.

## Non-negotiables (the "reliability" the whole feature rides on)

- **Right timing.** Not early (huge radius → standing up two stops too soon
  destroys trust), not late. Target "press the button *now*."
- **Works screen-off, in tunnels, with no data.** If GPS drops, fall back to
  counting stops by schedule / trip progress. Trust is all-or-nothing.
- **No open app required.**
- **Safety net.** If the rider blows past the stop, "You've passed Kvatrić" beats
  silence.
- **Self-cleans.** Once they're off, forget it — no zombie notification, no nag.

## The through-line

The removed prototype answered *"is the phone physically near a point on a
map?"* The rider's actual question is *"is it time for **me** to get off **my**
ride?"* Those two diverge exactly where it matters most — big radius, transfers,
unfamiliar routes. The version worth building is **journey/stop-count aware**,
expressed in **stops and minutes**, riding on top of the trip-planning and
timetable data we already have rather than being a standalone geofence.

## Realistic build phases

We already have: GTFS **static stop sequences** (ordered stops per trip),
**realtime trip-updates** (per-stop delays), and **GPS** — subject to the
[[gps-realtime-trust-model]].

1. **Stop-count alert, single leg.** Bind the alert to the alighting stop's
   position in its trip's stop sequence; count down remaining stops from GPS
   position matched to the sequence (schedule fallback when GPS is poor). Ping
   at "N stops before" (default 1). Lead time in stops, not metres.
2. **Live "N stops left / ~M min" surface + snooze/dismiss actions** on the
   notification and an in-app live view.
3. **Journey/transfer awareness.** Once trip planning surfaces alighting +
   transfer stops, hang the alert off a planned journey with a single toggle;
   ping before each transfer with the connecting line and wait.
4. **Aspirational: vehicle binding.** Match the rider to a specific GTFS-RT
   vehicle/trip so ETA and delays come from the ride itself, not just proximity.

## Why the first attempt was removed

The prototype was a **pure GPS geofence** (`@capacitor-community/background-geolocation`
foreground-service watch) that fired once when the phone came within a chosen
radius (300/500/800 m) of the destination stop. Problems that made it not worth
keeping:

- **No arm/disarm** — it could fire the instant it started, because it never
  required the rider to be *outside* the radius first. With radii up to 800 m
  (≈2–4 stops) the rider was often already inside on activation.
- **Radius is the wrong unit** — riders don't think in metres, and 800 m fires
  several stops early.
- **Not journey-aware** — no stop count, no ETA, no transfers; it knew a *point*,
  not the *ride*.
- **UI bugs** (modal trapped beneath a lower z-index badge; banner/modal
  status-bar overlap) — see the Android modal/z-index cleanup.

Removed files: `utils/arrivalAlerts.ts`, `types/arrivalAlert.ts`,
`components/common/ArrivalAlert{Modal,Banner}.tsx`,
`hooks/useArrivalAlertSync.ts`, plus the arrival channel/notification helpers,
`settingsStore` fields, the StopInfoBar bell trigger, and the `arrivalAlerts.*`
i18n keys.

> **Note:** `@capacitor-community/background-geolocation` is now an unused
> dependency (still in `package.json`; referenced by the `useLegacyBridge` note
> in `capacitor.config.ts`). A journey/stop-count design may not need continuous
> background GPS at all — decide during phase 1 whether to drop the plugin (a
> native change requiring `npx cap sync` + an Android rebuild) or keep it.

Related: [[stop-departures]] · [[service-alerts]] · [[gps-realtime-trust-model]]
