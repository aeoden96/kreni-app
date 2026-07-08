import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';

import { registerPlugin } from '@capacitor/core';

import type { ArrivalAlert } from '../types/arrivalAlert';

import { isNative } from './platform';
import { haversineDistance } from './realtime';

/**
 * "Get off here" arrival alerts. A foreground-service GPS watch
 * (@capacitor-community/background-geolocation) keeps running with the app
 * backgrounded / screen off; when the user's own position comes within the
 * alert radius of the destination stop, it fires once and the watch is removed.
 *
 * Only GPS lat/lon is used (per the feed trust model) — no vehicle feed, no ETA.
 * All calls no-op on web/PWA (guarded by isNative()); the feature is native-only.
 */

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

interface ArrivalWatchLabels {
  /** Ongoing foreground-service notification body. */
  backgroundMessage: string;
  /** Ongoing foreground-service notification title. */
  backgroundTitle: string;
}

/**
 * Start watching the user's position for an arrival alert. Resolves to a watcher
 * id that must be passed to {@link stopArrivalWatch}. `onFire` runs once, when the
 * user first comes within `alert.radiusMeters` of the stop; the watch is removed
 * immediately after (one-shot), which also stops the foreground service.
 * Returns `''` on web (no-op).
 */
export async function startArrivalWatch(
  alert: ArrivalAlert,
  labels: ArrivalWatchLabels,
  onFire: () => void
): Promise<string> {
  if (!isNative()) return '';

  let fired = false;
  let watcherId = '';

  watcherId = await BackgroundGeolocation.addWatcher(
    {
      // Defining backgroundMessage is what enables background delivery + the
      // required persistent notification on Android.
      backgroundMessage: labels.backgroundMessage,
      backgroundTitle: labels.backgroundTitle,
      distanceFilter: 50,
      requestPermissions: true,
    },
    (position, error) => {
      if (error || !position || fired) return;
      const metres = haversineDistance(position.latitude, position.longitude, alert.lat, alert.lon);
      if (metres <= alert.radiusMeters) {
        fired = true;
        onFire();
        if (watcherId !== '') void BackgroundGeolocation.removeWatcher({ id: watcherId });
      }
    }
  );

  return watcherId;
}

/** Stop an arrival watch (removes the foreground service). Safe with any id. */
export async function stopArrivalWatch(id: string): Promise<void> {
  if (!isNative() || id === '') return;
  await BackgroundGeolocation.removeWatcher({ id });
}
