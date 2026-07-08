/**
 * Shared animation ticker for vehicle markers.
 *
 * Replaces the previous one-rAF-loop-per-marker design. With ~220 vehicles that
 * meant ~220 independent rAF callbacks each doing two map.project() calls every
 * frame (~26k projections per ease cycle). Here a single rAF loop iterates every
 * active ease, and each ease's from/to pixel positions are projected ONCE when
 * it starts (reprojected only when the map zoom changes), so per-frame work is
 * cheap arithmetic + one transform write. Motion is identical to before: linear
 * interpolation from the marker's current on-screen position to the new GPS fix
 * over EASE_MS, never extrapolating past a known fix.
 *
 * One ticker instance per Leaflet map, cached in a WeakMap.
 */

import type { Map as LeafletMap, Marker as LeafletMarker, Point } from 'leaflet';

import { REALTIME_POLL_INTERVAL } from '../config';

// Ease over slightly less than the poll interval so the marker arrives at the
// GPS fix just before the next one comes in, keeping motion continuous.
const EASE_MS = REALTIME_POLL_INTERVAL * 0.9;

// Below this zoom, a vehicle's per-poll movement is only a pixel or two on
// screen, so easing it is per-frame work for motion nobody can perceive — and
// at these zooms the whole fleet (100s of markers) is visible. Snap instead.
const ANIMATE_MIN_ZOOM = 15;

interface AnimEntry {
  animPos: Vec2;
  ease: Ease | null;
  markerRef: React.RefObject<LeafletMarker | null>;
  mounted: boolean;
  prevGps: { lat: number; lon: number; time: number };
}

interface Ease {
  from: Vec2;
  fromPx: Point;
  projZoom: number;
  startTime: number;
  to: Vec2;
  toPx: Point;
  wcSet: boolean;
}

interface Vec2 {
  lat: number;
  lon: number;
}

class VehicleAnimationTicker {
  private entries = new Map<number, AnimEntry>();
  private map: LeafletMap;
  private nextId = 1;
  private rafId = -1;

  constructor(map: LeafletMap) {
    this.map = map;
  }

  register(markerRef: React.RefObject<LeafletMarker | null>, lat: number, lon: number): number {
    const id = this.nextId++;
    this.entries.set(id, {
      animPos: { lat, lon },
      ease: null,
      markerRef,
      mounted: false,
      prevGps: { lat, lon, time: 0 },
    });
    return id;
  }

  unregister(id: number): void {
    this.entries.delete(id);
    if (this.entries.size === 0 && this.rafId !== -1) {
      cancelAnimationFrame(this.rafId);
      this.rafId = -1;
    }
  }

  /** Called when a new GPS fix arrives for this marker. */
  update(id: number, lat: number, lon: number): void {
    const e = this.entries.get(id);
    if (!e) return;

    // First fix after mount: just record it, no animation.
    if (!e.mounted) {
      e.mounted = true;
      e.animPos = { lat, lon };
      e.prevGps = { lat, lon, time: performance.now() };
      return;
    }

    if (lat === e.prevGps.lat && lon === e.prevGps.lon) return;

    const now = performance.now();
    const timeSinceLastUpdate = now - e.prevGps.time;
    e.prevGps = { lat, lon, time: now };
    const marker = e.markerRef.current;

    // Snap instantly (no ease) when a large gap has passed, or when zoomed out
    // far enough that per-fix motion is sub-pixel (see ANIMATE_MIN_ZOOM).
    if (
      timeSinceLastUpdate > REALTIME_POLL_INTERVAL * 2.5 ||
      this.map.getZoom() < ANIMATE_MIN_ZOOM
    ) {
      e.animPos = { lat, lon };
      if (marker) {
        marker.setLatLng([lat, lon]);
        resetInner(marker);
      }
      e.ease = null;
      return;
    }

    // Lock the outer Leaflet marker to the current animated position — this is
    // the stable origin the inner sub-pixel translation is measured against.
    if (marker) {
      marker.setLatLng([e.animPos.lat, e.animPos.lon]);
    }

    const from: Vec2 = { ...e.animPos };
    const to: Vec2 = { lat, lon };
    const zoom = this.map.getZoom();
    e.ease = {
      from,
      fromPx: this.map.project([from.lat, from.lon], zoom),
      projZoom: zoom,
      startTime: now,
      to,
      toPx: this.map.project([to.lat, to.lon], zoom),
      wcSet: false,
    };

    if (this.rafId === -1) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  private tick = (now: number): void => {
    this.rafId = -1;
    // Read zoom once for the whole batch; endpoints are reprojected only when it
    // actually changes, so the per-frame per-marker cost is plain arithmetic.
    const zoom = this.map.getZoom();
    let anyActive = false;

    for (const e of this.entries.values()) {
      const ease = e.ease;
      if (!ease) continue;

      const marker = e.markerRef.current;
      if (!marker) {
        anyActive = true;
        continue;
      }

      const t = Math.min(1, (now - ease.startTime) / EASE_MS);

      // Reproject endpoints only if the zoom changed since this ease last ran.
      if (zoom !== ease.projZoom) {
        ease.fromPx = this.map.project([ease.from.lat, ease.from.lon], zoom);
        ease.toPx = this.map.project([ease.to.lat, ease.to.lon], zoom);
        ease.projZoom = zoom;
      }

      // Track the animated lat/lon (linear) so the next ease starts from here.
      e.animPos = {
        lat: ease.from.lat + (ease.to.lat - ease.from.lat) * t,
        lon: ease.from.lon + (ease.to.lon - ease.from.lon) * t,
      };

      const dx = (ease.toPx.x - ease.fromPx.x) * t;
      const dy = (ease.toPx.y - ease.fromPx.y) * t;

      const el = marker.getElement();
      const inner = el?.firstElementChild as HTMLElement | null | undefined;
      if (inner) {
        if (!ease.wcSet) {
          inner.style.willChange = 'transform';
          ease.wcSet = true;
        }
        inner.style.transform = `translate(${dx}px, ${dy}px)`;
      }

      if (t >= 1) {
        // Ease finished: snap the outer marker to the final position, clear the
        // inner sub-pixel translation.
        marker.setLatLng([ease.to.lat, ease.to.lon]);
        e.animPos = { lat: ease.to.lat, lon: ease.to.lon };
        e.ease = null;
        if (inner) {
          inner.style.transform = '';
          inner.style.willChange = 'auto';
        }
      } else {
        anyActive = true;
      }
    }

    if (anyActive) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  };
}

function resetInner(marker: LeafletMarker): void {
  const el = marker.getElement();
  if (!el) return;
  const inner = el.firstElementChild as HTMLElement | null;
  if (inner) {
    inner.style.transform = '';
    inner.style.willChange = 'auto';
  }
}

const tickers = new WeakMap<LeafletMap, VehicleAnimationTicker>();

export function getVehicleAnimationTicker(map: LeafletMap): VehicleAnimationTicker {
  let ticker = tickers.get(map);
  if (!ticker) {
    ticker = new VehicleAnimationTicker(map);
    tickers.set(map, ticker);
  }
  return ticker;
}

export type { VehicleAnimationTicker };
