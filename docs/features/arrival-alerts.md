---
tags: [area/features, type/proposal]
status: proposed
updated: 2026-07-15
---

# Arrival alerts ("get off here") — proposed

> **Status: not built.** An earlier geofence-only prototype was removed on
> 2026-07-15 (see [below](#why-the-first-attempt-was-removed)). This doc is the
> product/UX spec for the version worth building, written from the rider's point
> of view — _not_ a description of shipped behaviour.

## The job to be done

A rider reaches for an arrival alert because they want to **stop paying
attention**. It's dark, they're tired, they don't ride this line often, or
they're heads-down in their phone. The promise is: _"put your phone away — I'll
tap you on the shoulder in time to get off."_

That makes the real bar **trust**, not "fire a notification." If the alert is
ever wrong — early, late, or silent — the rider goes back to counting stops
themselves and never turns it on again. Every decision below serves
reliability first.

## What the rider actually wants

Framed as the four questions a rider is really asking:

### 1. Where am I going? → pick a _destination_, not a radius

Riders think in **destinations** ("the museum", "work", "Kvatrić"), never in
metres. The user should choose a **place or a stop**; the app resolves which
stop they alight at. Never expose a metre radius — that's our geofence math
leaking into their decision.

### 2. What vehicle am I on? → be _journey-aware_, especially transfers

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
- **Lead time in the rider's language:** _"one stop before"_ / _"a couple of
  minutes before"_ — never a metre slider.

### 4. What do I see when it pings? → glanceable and actionable

- Loud, buzzes, wakes the screen. This is the one moment the rider _wants_ to be
  interrupted (MAX-importance heads-up channel).
- Says the thing that matters: **"Get off next — Kvatrić"** with a countdown the
  rider trusts (_2 stops left_ / _~3 min_).
- Transfers spelled out: **"Get off at Trg → change to 268 (~4 min wait)."**
- One-tap actions on the notification: **Snooze / Got it / Cancel.**
- Tapping opens a live view — map with the rider + destination and a
  stops-remaining countdown — so a groggy rider reorients in a second.

## Non-negotiables (the "reliability" the whole feature rides on)

- **Right timing.** Not early (huge radius → standing up two stops too soon
  destroys trust), not late. Target "press the button _now_."
- **Works screen-off, in tunnels, with no data.** If GPS drops, fall back to
  counting stops by schedule / trip progress. Trust is all-or-nothing.
- **No open app required.**
- **Safety net.** If the rider blows past the stop, "You've passed Kvatrić" beats
  silence.
- **Self-cleans.** Once they're off, forget it — no zombie notification, no nag.

## The through-line

The removed prototype answered _"is the phone physically near a point on a
map?"_ The rider's actual question is _"is it time for **me** to get off **my**
ride?"_ Those two diverge exactly where it matters most — big radius, transfers,
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
  required the rider to be _outside_ the radius first. With radii up to 800 m
  (≈2–4 stops) the rider was often already inside on activation.
- **Radius is the wrong unit** — riders don't think in metres, and 800 m fires
  several stops early.
- **Not journey-aware** — no stop count, no ETA, no transfers; it knew a _point_,
  not the _ride_.
- **UI bugs** (modal trapped beneath a lower z-index badge; banner/modal
  status-bar overlap) — see the Android modal/z-index cleanup.

Removed files: `utils/arrivalAlerts.ts`, `types/arrivalAlert.ts`,
`components/common/ArrivalAlert{Modal,Banner}.tsx`,
`hooks/useArrivalAlertSync.ts`, plus the arrival channel/notification helpers,
`settingsStore` fields, the StopInfoBar bell trigger, and the `arrivalAlerts.*`
i18n keys.

> **Note:** `@capacitor-community/background-geolocation` was **removed** on
> 2026-08-02, ahead of the first Play submission. It contributed
> `ACCESS_BACKGROUND_LOCATION` and `FOREGROUND_SERVICE_LOCATION` to the merged
> manifest even though no code called it, and Play requires a declaration _plus
> a demo video_ for each — impossible to supply for a parked feature.
>
> Removed with it: the `capacitor_background_geolocation_notification_*` strings
> in `android/app/src/main/res/values/strings.xml`, and `useLegacyBridge` in
> `capacitor.config.ts` (that flag existed only to keep the plugin's watch
> alive past ~5 min).
>
> Reinstating it is a native change — `yarn add`, `npx cap sync`, Android
> rebuild — and must land in the **same release as the shipping feature**, so
> the Play declarations can point at something a reviewer can actually see. A
> journey/stop-count design may not need continuous background GPS at all.

Related: [[stop-departures]] · [[service-alerts]] · [[gps-realtime-trust-model]]
