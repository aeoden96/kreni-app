/**
 * Smooth per-vehicle animation between sparse GPS fixes.
 *
 * When a new GPS fix arrives, the marker linearly interpolates from its current
 * on-screen position to the new fix over EASE_MS (~poll interval). This keeps
 * markers visually moving without extrapolating past known GPS positions, which
 * causes wrong predictions at intersections and turns.
 *
 * All position updates bypass React via marker.setLatLng() / inner transforms,
 * so there are zero React re-renders during animation frames. This hook is a thin
 * wrapper: the actual rAF loop is shared across every vehicle by a single
 * per-map ticker (see vehicleAnimationTicker.ts), which projects each ease once
 * instead of twice per marker per frame.
 */

import type { Marker as LeafletMarker } from 'leaflet';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

import { getVehicleAnimationTicker, type VehicleAnimationTicker } from './vehicleAnimationTicker';

export function useAnimatedVehiclePosition(
  markerRef: React.RefObject<LeafletMarker | null>,
  lat: number,
  lon: number
): void {
  const map = useMap();
  const idRef = useRef<null | number>(null);
  const tickerRef = useRef<null | VehicleAnimationTicker>(null);

  // Register once with the shared ticker; unregister on unmount.
  useEffect(() => {
    const ticker = getVehicleAnimationTicker(map);
    tickerRef.current = ticker;
    idRef.current = ticker.register(markerRef, lat, lon);
    return () => {
      if (idRef.current !== null) ticker.unregister(idRef.current);
      idRef.current = null;
      tickerRef.current = null;
    };
    // Registration captures the initial position intentionally; subsequent
    // positions flow through the update effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, markerRef]);

  // Push each new GPS fix to the ticker, which starts/refreshes the ease.
  useEffect(() => {
    if (idRef.current !== null) tickerRef.current?.update(idRef.current, lat, lon);
  }, [lat, lon]);
}
