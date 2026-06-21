# Platform & Mobile Strategy

> **Decision record.** How Kreni ships to mobile and why. Status: **accepted; Android implemented via Capacitor** (app id `app.kreni`).

## TL;DR

- **Stay web-first.** The PWA already delivers every current feature; the data
  layer (CF Worker + sharded static JSON) is a platform-agnostic HTTP API that
  ports to any client for free.
- **Native target: Capacitor.** It wraps the _existing_ React/Leaflet codebase
  unchanged and exposes native APIs via plugins. The **Android** project lives in
  `android/` (app id `app.kreni`); **iOS** is a later `npx cap add ios`.
- **The old Bubblewrap TWA was removed.** It was never published (no Play
  account), is Android-only, and is limited on in-app payments/ads; Capacitor
  supersedes it for both platforms.
- **No React Native, no fully-native rewrite.** Neither is justified for a
  solo-maintained app whose current features are fully served by the web.

## Why not React Native or native?

| Path                   | Keeps codebase | Stores        | Native APIs       | Cost      |
| ---------------------- | -------------- | ------------- | ----------------- | --------- |
| **TWA** (removed)      | 100%           | Android only  | none (web only)   | ~0        |
| **Capacitor** (chosen) | 100%           | Android + iOS | most, via plugins | low       |
| **React Native**       | ~0% (rewrite)  | Android + iOS | full              | very high |
| **Fully native**       | 0% (×2)        | Android + iOS | maximum           | highest   |

- **React Native does not run our code.** It cannot render DOM or Leaflet. Going
  RN means rewriting ~126 `.tsx` components, swapping Leaflet for
  `@maplibre/maplibre-react-native`/`react-native-maps`, and rebuilding routing,
  bottom sheets, layer panels, and the offline layer — then maintaining web + RN
  in parallel. The payoff (native UI) does not match a product whose current
  features already work on the web.
- **Fully native** doubles that cost across two codebases for capabilities we
  don't need.
- **Capacitor** keeps 100% of the codebase, adds both stores, and lets us add
  native capability incrementally. The only "native code" we ever write is thin
  plugin shims (Kotlin/Swift) for the most platform-specific features.

## TWA and Capacitor are alternatives, not layers

They do **not** stack. TWA runs the PWA in Chrome's engine; Capacitor ships the
web app in its own WebView container with a native plugin bridge. On Android you
pick one — and we picked Capacitor:

- **Android** now ships via Capacitor (`android/`), replacing the removed TWA.
- **iOS** is added later with `npx cap add ios` (no TWA equivalent exists on iOS).
- A single Capacitor project serves both stores from one web codebase.

## Capabilities matrix

| Capability                                              | Web / PWA                   | Capacitor            | Needs RN/native? |
| ------------------------------------------------------- | --------------------------- | -------------------- | ---------------- |
| Live map, layers, timetables, favourites, i18n          | ✅                          | ✅                   | no               |
| Offline (service worker / Workbox)                      | ✅                          | ✅ (runs in WebView) | no               |
| iOS App Store presence                                  | ❌                          | ✅                   | no               |
| Push (FCM / APNs)                                       | web push only (weak on iOS) | ✅ plugin            | no               |
| Background geolocation / geofenced arrival alerts       | ❌                          | ✅ plugin            | no               |
| Home-screen widgets, foreground "live ETA" notification | ❌                          | ✅ custom plugin     | no               |
| iOS Live Activities / Dynamic Island                    | ❌                          | ✅ custom plugin     | no               |

"Custom plugin" = a small Kotlin/Swift shim inside the Capacitor project, called
from JS. Still no React Native.

## Feature portability

The transition **preserves every existing feature** and is unusually cheap
because of the architecture:

- **Web → Capacitor:** literally the same code. Zero porting; offline, i18n, and
  all modes carry over. The service worker keeps running inside the Capacitor
  WebView.
- **Data layer ports for free:** the CF Worker + sharded-JSON API is just HTTP —
  identical for a browser, WebView, RN `fetch`, or native client. Protect this
  asset; it is what makes any future move low-risk.

The move does **not** improve existing features (already good on the web) — it
**unlocks a new class** of them: store reach, reliable push, background
geofenced alerts, and widgets.

## Monetization (Android)

Monetization is the clearest reason to prefer **Capacitor over TWA**:

- **In-app payments:** Google Play mandates **Play Billing** for digital
  goods/subscriptions (15–30% cut); physical goods/real-world services may use
  any processor (e.g. Stripe). TWA can only reach Play Billing via the limited
  Digital Goods + Payment Request API. Capacitor uses a Play Billing plugin or,
  preferably, **RevenueCat** (one SDK covering Play Billing + Apple StoreKit).
- **In-app ads:** Capacitor runs native **AdMob** (`@capacitor-community/admob`)
  — banner/interstitial/rewarded, highest eCPM. TWA **cannot** run AdMob; it is
  limited to web ads (AdSense), lower revenue and more policy friction.
- **Fit note:** a free utility app usually monetizes better with a single
  "remove ads / pro" subscription than with aggressive interstitials.

## Map strategy (coupled to the platform choice)

- **While web (PWA / Capacitor):** Leaflet and MapLibre GL JS both run in the
  WebView, so it is a free choice.
  - **Keep Leaflet for now.** It is mature and tiny, and our HTML `divIcon`
    markers (route number, bearing arrow, realtime dot) are trivial in it.
  - **Limit:** Leaflet DOM/SVG markers don't scale — many animated vehicles plus
    dense city-point layers will jank in a mid-range Android WebView. Note
    `preferCanvas` does **not** help here: the canvas renderer only accelerates
    vector layers (`circleMarker`/polyline), not `divIcon` markers — so the
    hottest path (vehicles) gets no benefit.
  - **Migrate to MapLibre GL JS when** marker count janks or we want vector
    sharpness / rotation / pitch. Cost: rewrite the icon + animation system
    (vehicles → GeoJSON source + symbol layer, animated via `setData`/feature-
    state instead of `marker.setLatLng()`), and switch to a vector tile source.
    Free vector options: CARTO vector, OpenFreeMap, MapTiler free tier, or
    **Protomaps PMTiles** self-hosted as a single `.pmtiles` on R2 (fits the
    zero-backend model).
- **If we ever go RN/native:** Leaflet is off the table (DOM). MapLibre is the
  future-proof choice because styles/knowledge transfer to its native SDKs — so
  doing the MapLibre migration on web first would de-risk that path.

## Suggested sequencing

1. **Done** — Removed the TWA and stood up the Capacitor **Android** project
   (`android/`, app id `app.kreni`, modern SDK via Maven Central). The web app
   runs in the WebView at feature parity.
2. **Next: native capabilities** — Add `@capacitor/geolocation` and push
   (FCM/APNs), then `npx cap add ios`. Highest gain per unit effort, no rewrite.
3. **When the map janks** — Migrate the vehicle layer to MapLibre GL JS; consider
   self-hosted PMTiles on R2.
4. **Only if the product becomes notification/widget-centric** — re-evaluate RN.
   By then the MapLibre + Capacitor-plugin experience de-risks it.

## Open risks / notes

- **Service worker in the WebView:** the Workbox SW (`registerType: 'prompt'`)
  runs inside Capacitor; confirm its update flow isn't confusing in the native
  shell, and consider disabling it for the native build if it is.
- **Android App Links:** to make `https://kreni.app/...` open the app, re-add a
  `.well-known/assetlinks.json` with the **new** `app.kreni` signing fingerprint
  (the old TWA one was deleted).
- **Feed dependency / legal:** ZET, Nextbike, and Zagreb open-data feeds are
  proxied with no formal agreement. ToS/rate-limit/brand risk rises once the app
  is a named store listing (Nextbike's live JSON especially).
- **Map attribution** (OSM / CARTO / CyclOSM) must survive any wrapper — it is a
  licensing requirement, easy to drop in a rewrite.
- **Bus factor:** solo hobby project with a sophisticated CI data pipeline —
  keep the slicing/cron flow documented and reproducible.
