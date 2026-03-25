import { useCallback } from 'react';

import { useGeolocation } from './useGeolocation';

export function useRideHailingDeepLinks() {
  const { userLocation } = useGeolocation();

  const getLinks = useCallback(
    (stopLat: number, stopLon: number, stopName: string, mode: 'departure' | 'destination') => {
      const safeStopName = encodeURIComponent(stopName);

      if (mode === 'departure') {
        return {
          bolt: BOLT_INTENT_URI,
          uber: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${stopLat}&pickup[longitude]=${stopLon}&pickup[nickname]=${safeStopName}`,
        };
      } else {
        if (userLocation) {
          return {
            bolt: BOLT_INTENT_URI,
            uber: `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${stopLat}&dropoff[longitude]=${stopLon}&dropoff[nickname]=${safeStopName}`,
          };
        } else {
          return {
            bolt: BOLT_INTENT_URI,
            uber: `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${stopLat}&dropoff[longitude]=${stopLon}&dropoff[nickname]=${safeStopName}`,
          };
        }
      }
    },
    [userLocation]
  );

  return { getLinks };
}

/**
 * Android intent:// URI that opens the Bolt ride-hailing app (ee.mtakso.client).
 *
 * Targets bolt.onelink.me — one of Bolt's two verified App Link domains
 * (visible in Android Settings → Apps → Bolt → "Supported web addresses").
 * A VIEW intent for this domain matches the app's intent-filter and opens it directly.
 *
 * Coordinate pre-filling is not possible: Bolt does not expose a public deep-link
 * API for pickup/dropoff params. Approaches tested and confirmed non-functional:
 *  - bolt.me / bolt.eu query params  → wrong app / opens browser
 *  - intent://bolt.eu VIEW           → no matching intent-filter path
 *  - LAUNCHER intent                 → Chrome requires a host in intent:// URI
 *  - af_dp with taxify:// scheme     → app opens but silently ignores params
 *  - taxify:// scheme directly       → app opens but silently ignores params
 *
 * Falls back to Play Store if the app is not installed.
 */
const BOLT_INTENT_URI = `intent://bolt.onelink.me/#Intent;package=ee.mtakso.client;scheme=https;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=ee.mtakso.client')};end`;
