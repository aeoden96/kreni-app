import { Geolocation } from '@capacitor/geolocation';

import { isNative } from './platform';

/**
 * Platform-aware geolocation. On the web/PWA this is a thin pass-through to
 * `navigator.geolocation`; inside the Capacitor native shell it routes through
 * `@capacitor/geolocation`, which drives the real Android runtime permission
 * prompt and native location provider. Callers (see GeolocationProvider) get one
 * normalized shape so their body is platform-agnostic.
 */

export type GeoWatchId = number | string;

interface GeoPosition {
  coords: { latitude: number; longitude: number };
}

interface GeoWatchOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
}

type OnError = (error: unknown) => void;
type OnPosition = (position: GeoPosition) => void;

/** Stop a watch started by {@link watchPosition}. Safe to call with any id. */
export function clearWatch(id: GeoWatchId): void {
  if (isNative()) {
    if (id !== '') void Geolocation.clearWatch({ id: String(id) });
    return;
  }
  navigator.geolocation.clearWatch(id as number);
}

/** Whether position tracking is available at all on this platform. */
export function isGeolocationAvailable(): boolean {
  return isNative() || (typeof navigator !== 'undefined' && !!navigator.geolocation);
}

/**
 * Start watching position. Resolves to a watch id that must be passed to
 * {@link clearWatch}. Native path requests permission first; a hard denial is
 * surfaced through `onError` (and yields an empty id that clears harmlessly).
 */
export async function watchPosition(
  onPosition: OnPosition,
  onError: OnError,
  options: GeoWatchOptions
): Promise<GeoWatchId> {
  if (isNative()) {
    const status = await Geolocation.requestPermissions();
    if (status.location === 'denied' && status.coarseLocation === 'denied') {
      onError(new Error('Location permission denied'));
      return '';
    }
    return Geolocation.watchPosition(options, (position, err) => {
      if (err || !position) {
        onError(err ?? new Error('No position'));
        return;
      }
      onPosition({
        coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
      });
    });
  }

  return navigator.geolocation.watchPosition(
    (pos) =>
      onPosition({ coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } }),
    (err) => onError(err),
    options
  );
}
