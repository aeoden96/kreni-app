---
tags: [area/status, type/reference]
status: roadmap
updated: 2026-07-04
---

# Android native — powercharge roadmap

Ideas for making the Capacitor Android port feel and perform more native, beyond
the baseline wiring already shipped (edge-to-edge, hardware back, native
geolocation, status-bar sync, splash/keyboard, Play signing/App-Links scaffold).
Platform rationale and the "thin plugin shim, no React Native" stance live in
[[0001-mobile-platform-strategy]]. Tiers are ordered by impact-per-effort.

## Already shipped (baseline)

- Edge-to-edge (`viewport-fit=cover` + safe-area insets on chrome).
- Hardware/gesture **Back** + `appUrlOpen` deep-link routing (`useAndroidBackButton`), plus predictive-back opt-in (`enableOnBackInvokedCallback`).
- Native **geolocation** via `@capacitor/geolocation` + location permissions.
- **Status bar** theme sync; **splash** hide-on-mount; **keyboard** resize config.
- Service worker kept for offline; update prompt suppressed on native.
- Release path scaffolded: signing from `keystore.properties`, R8/shrink on, `versionName`←package.json, `versionCode`←`ANDROID_VERSION_CODE`, `assetlinks.json` + App-Links intent-filter (fingerprint still a placeholder).
- **Tier 1 (below) — shipped:** haptics (`src/utils/haptics.ts`), 3 launcher shortcuts, native share (menu → current URL), themed monochrome icon, offline banner. Kept here as the record; the tables below are the original design reference.
- **Tier 2 — shipped:** **local notifications** (recurring departure reminders, `src/utils/notifications.ts` + Settings) and **geofenced arrival alerts** ("get off here" — foreground-service GPS watch via `@capacitor-community/background-geolocation`, `src/utils/arrivalAlerts.ts` + stop-view bell). Remaining Tier 2 item: **push notifications** (needs external Firebase + a server-side FCM sender in [[gtfs-proxy-worker]] — not buildable in this repo).

> [!warning] Themed-icon regeneration
> `yarn cap:assets` regenerates the adaptive-icon XMLs and **drops the
> `<monochrome>` layer**. After any icon regen, re-add it to both
> `mipmap-anydpi-v26/ic_launcher{,_round}.xml` and re-run
> `python3 scripts/gen-android-monochrome-icon.py`.

## Tier 1 — cheap native wins (low effort, high polish)

| Feature                    | Approach                               | Notes                                                                                               |
| -------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Haptics                    | `@capacitor/haptics`                   | Tactile tick on locate / select / mode-switch. The cheapest "feels native" upgrade.                 |
| App shortcuts              | static `res/xml/shortcuts.xml` (no JS) | Long-press launcher icon → "Nearby", "Cycling", "Train". ~20 lines, deep-links via existing routes. |
| Native share               | `@capacitor/share`                     | Share a stop/route as an `https://kreni.app/…` App Link (pairs with deep-linking).                  |
| Themed (Material You) icon | `@capacitor/assets` monochrome layer   | Icon tints to wallpaper on Android 13+. Regenerate with `yarn cap:assets`.                          |
| Network status             | `@capacitor/network`                   | Native offline banner instead of relying on `navigator.onLine`.                                     |

## Tier 2 — transit-defining features (medium effort, high product value)

| Feature                  | Approach                                                     | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Push notifications       | `@capacitor/push-notifications` + FCM `google-services.json` | Service-alert pushes, re-engagement. `android/app/build.gradle` **already** conditionally applies the google-services plugin — half-wired. Sender can be the CF proxy Worker calling FCM HTTP v1 ([[gtfs-proxy-worker]]).                                                                                                                                                                                                                                                                                                             |
| Local notifications      | `@capacitor/local-notifications`                             | On-device "leave now" / departure reminders with **no server** — much cheaper than push for scheduled alerts.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Geofenced arrival alerts | community background-geolocation plugin + foreground service | **Shipped** (GPS-radius "get off here", active-trip model). `@capacitor-community/background-geolocation` foreground service + ongoing notification; user-GPS distance to the stop only (trust-model compliant, no vehicle feed). Started from the stop-view 🔔. **Play gate:** `ACCESS_BACKGROUND_LOCATION` needs a data-safety background-location declaration + justification video at submission; `capacitor.config.ts` sets `android.useLegacyBridge`. Future enrichment: optional "N stops away" mode when following a vehicle. |

## Tier 3 — deep integration & performance (bigger bets)

| Item                                                 | Payoff                                                                                                        | Cost                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Home-screen widget / ongoing "live ETA" notification | Favourite stop's next departures on the home screen; high retention                                           | Real Kotlin (App Widget provider)                                                                            |
| **MapLibre GL JS** migration                         | GPU vector rendering; fixes vehicle-marker jank on mid-range Android WebViews; de-risks any future RN         | Rewrite icon/animation system — see [[map-and-navigation]] and [[0001-mobile-platform-strategy]] map section |
| Route-based **code-splitting**                       | Main chunk is ~1.28 MB (372 KB gz); `React.lazy` per mode cuts first paint on low-end devices — helps web too | Low–medium                                                                                                   |
| On-device offline maps                               | True offline transit via a bundled/downloaded PMTiles base map (SW only caches tiles after first view)        | Medium                                                                                                       |

## Monetization hooks (when relevant)

Per [[0001-mobile-platform-strategy]]: **RevenueCat** (one SDK for Play Billing +
StoreKit) for a "remove ads / pro" subscription, and `@capacitor-community/admob`
for native ads (higher eCPM than web AdSense). A single "pro" subscription
usually beats aggressive interstitials for a free utility.

## Suggested sequencing

1. Tier 1 bundle (haptics + shortcuts + share + themed icon) — ~a day, big feel upgrade.
2. Push → local notifications → geofenced alerts (Tier 2), in that order.
3. MapLibre + code-splitting when vehicle markers jank (Tier 3).
4. Widgets / monetization only if the product becomes notification- or revenue-centric.

> [!note] Keeping this current
> When one of these ships, flip this note's frontmatter to `status: current` (or
> split the shipped item out) so the [[project-roadmap]] Dataview drops it.
