/**
 * Smooth per-vehicle animation between sparse GPS fixes.
 *
 * When a new GPS fix arrives, the marker linearly interpolates from its current
 * on-screen position to the new fix over EASE_MS (~poll interval). This keeps
 * markers visually moving without extrapolating past known GPS positions, which
 * causes wrong predictions at intersections and turns.
 *
 * All position updates bypass React via marker.setLatLng(), so there are zero
 * React re-renders during animation frames. The rAF loop is self-stopping and
 * woken up only when a new fix arrives.
 */

import { useEffect, useRef } from 'react';
import type { Marker as LeafletMarker } from 'leaflet';
import { REALTIME_POLL_INTERVAL } from '../config';

// Ease over slightly less than the poll interval so the marker arrives at the
// GPS fix just before the next one comes in, keeping motion continuous.
const EASE_MS = REALTIME_POLL_INTERVAL * 0.9;

interface Vec2 { lat: number; lon: number }

export function useAnimatedVehiclePosition(
  markerRef: React.RefObject<LeafletMarker | null>,
  lat: number,
  lon: number,
): void {
  // Current animated position (what the Leaflet marker is displaying).
  const animPosRef = useRef<Vec2>({ lat, lon });

  // Active ease transition, or null when idle.
  const easeRef = useRef<{ from: Vec2; to: Vec2; startTime: number } | null>(null);

  // Restarts the rAF loop after it has gone idle.
  const wakeUpRef = useRef<(() => void) | null>(null);

  // rAF loop — self-stopping when the ease completes, woken by each GPS fix.
  useEffect(() => {
    let rafId = -1;
    let alive = true;

    const tick = (now: number) => {
      const ease = easeRef.current;
      if (ease === null) {
        rafId = -1;
        return;
      }

      const t = Math.min(1, (now - ease.startTime) / EASE_MS);
      const pos: Vec2 = {
        lat: ease.from.lat + (ease.to.lat - ease.from.lat) * t,
        lon: ease.from.lon + (ease.to.lon - ease.from.lon) * t,
      };

      animPosRef.current = pos;
      markerRef.current?.setLatLng([pos.lat, pos.lon]);

      if (t >= 1) {
        easeRef.current = null;
        rafId = -1;
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    wakeUpRef.current = () => {
      if (alive && rafId === -1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    return () => {
      alive = false;
      if (rafId !== -1) cancelAnimationFrame(rafId);
      wakeUpRef.current = null;
    };
  }, [markerRef]);

  // Detect new GPS fixes and start a new ease from the current animated position.
  const mountedRef = useRef(false);
  const prevGpsRef = useRef<Vec2>({ lat, lon });

  useEffect(() => {
    // Skip first render — marker is already at the correct GPS position.
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (lat === prevGpsRef.current.lat && lon === prevGpsRef.current.lon) return;
    prevGpsRef.current = { lat, lon };

    easeRef.current = {
      from: { ...animPosRef.current },
      to: { lat, lon },
      startTime: performance.now(),
    };
    wakeUpRef.current?.();
  }, [lat, lon]);
}
