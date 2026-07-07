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

import type { Marker as LeafletMarker } from 'leaflet';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

import { REALTIME_POLL_INTERVAL } from '../config';

// Ease over slightly less than the poll interval so the marker arrives at the
// GPS fix just before the next one comes in, keeping motion continuous.
const EASE_MS = REALTIME_POLL_INTERVAL * 0.9;

interface Vec2 {
  lat: number;
  lon: number;
}

export function useAnimatedVehiclePosition(
  markerRef: React.RefObject<LeafletMarker | null>,
  lat: number,
  lon: number
): void {
  const map = useMap();

  // Current animated position (fractional state during easing).
  const animPosRef = useRef<Vec2>({ lat, lon });

  // Active ease transition, or null when idle.
  const easeRef = useRef<null | { from: Vec2; startTime: number; to: Vec2 }>(null);

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

      const marker = markerRef.current;
      if (!marker) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const t = Math.min(1, (now - ease.startTime) / EASE_MS);
      const pos: Vec2 = {
        lat: ease.from.lat + (ease.to.lat - ease.from.lat) * t,
        lon: ease.from.lon + (ease.to.lon - ease.from.lon) * t,
      };

      animPosRef.current = pos;

      // Calculate sub-pixel translation relative to the ease.from anchor.
      // map.project returns precise fractional pixels.
      const zoom = map.getZoom();
      const startPx = map.project([ease.from.lat, ease.from.lon], zoom);
      const currPx = map.project([pos.lat, pos.lon], zoom);
      const dx = currPx.x - startPx.x;
      const dy = currPx.y - startPx.y;

      const el = marker.getElement();
      if (el) {
        // We translate the inner element (the actual icon content) rather than calling
        // setLatLng(), completely bypassing Leaflet's forced integer pixel rounding.
        const inner = el.firstElementChild as HTMLElement;
        if (inner) {
          inner.style.transform = `translate(${dx}px, ${dy}px)`;
          inner.style.willChange = 'transform';
        }
      }

      if (t >= 1) {
        // Ease finished: snap the outer Leaflet marker to the final position
        marker.setLatLng([ease.to.lat, ease.to.lon]);
        easeRef.current = null;
        rafId = -1;

        // Reset the inner sub-pixel translation
        if (el) {
          const inner = el.firstElementChild as HTMLElement;
          if (inner) {
            inner.style.transform = '';
            inner.style.willChange = 'auto';
          }
        }
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
  }, [markerRef, map]);

  // Detect new GPS fixes and start a new ease from the current animated position.
  const mountedRef = useRef(false);
  const prevGpsRef = useRef<{ lat: number; lon: number; time: number }>({
    lat,
    lon,
    time: 0,
  });

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevGpsRef.current = { lat, lon, time: performance.now() };
      return;
    }
    if (lat === prevGpsRef.current.lat && lon === prevGpsRef.current.lon) return;

    const now = performance.now();
    const timeSinceLastUpdate = now - prevGpsRef.current.time;
    prevGpsRef.current = { lat, lon, time: now };

    // If a large amount of time has passed, snap instantly.
    if (timeSinceLastUpdate > REALTIME_POLL_INTERVAL * 2.5) {
      animPosRef.current = { lat, lon };
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
        const el = markerRef.current.getElement();
        if (el) {
          const inner = el.firstElementChild as HTMLElement;
          if (inner) {
            inner.style.transform = '';
            inner.style.willChange = 'auto';
          }
        }
      }
      easeRef.current = null;
      return;
    }

    // Lock the outer Leaflet marker to the start of this new ease path.
    // This provides a stable origin point for the inner sub-pixel translation.
    if (markerRef.current) {
      markerRef.current.setLatLng([animPosRef.current.lat, animPosRef.current.lon]);
    }

    easeRef.current = {
      from: { ...animPosRef.current },
      startTime: now,
      to: { lat, lon },
    };

    wakeUpRef.current?.();
  }, [lat, lon, markerRef]);
}
