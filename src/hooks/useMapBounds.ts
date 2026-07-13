/**
 * Hook that tracks the current Leaflet map bounds, updating on move and zoom.
 * Only usable inside a react-leaflet MapContainer.
 *
 * Leaflet reuses and mutates the object returned from `map.getBounds()`. Storing that
 * reference in React state breaks comparisons and can amplify feedback loops with
 * controlled MapContainer props. We keep immutable snapshots and skip setState when
 * the viewport has not meaningfully changed.
 */

import type { LatLngBounds } from 'leaflet';

import L from 'leaflet';
import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';

const BOUNDS_EPS = 1e-9;

export function useMapBounds(): LatLngBounds {
  const map = useMap();
  const [bounds, setBounds] = useState<LatLngBounds>(() => cloneBounds(map.getBounds()));

  useEffect(() => {
    const update = () => {
      const live = map.getBounds();
      setBounds((prev) => (boundsNearlyEqual(prev, live) ? prev : cloneBounds(live)));
    };
    map.on('moveend', update);
    map.on('zoomend', update);
    return () => {
      map.off('moveend', update);
      map.off('zoomend', update);
    };
  }, [map]);

  return bounds;
}

export function useMapViewport(): { bounds: LatLngBounds; zoom: number } {
  const map = useMap();
  const [viewport, setViewport] = useState(() => ({
    bounds: cloneBounds(map.getBounds()),
    zoom: map.getZoom(),
  }));

  useEffect(() => {
    const update = () => {
      const liveBounds = map.getBounds();
      const liveZoom = map.getZoom();
      setViewport((prev) => {
        if (prev.zoom === liveZoom && boundsNearlyEqual(prev.bounds, liveBounds)) {
          return prev;
        }
        return { bounds: cloneBounds(liveBounds), zoom: liveZoom };
      });
    };
    map.on('moveend', update);
    map.on('zoomend', update);
    return () => {
      map.off('moveend', update);
      map.off('zoomend', update);
    };
  }, [map]);

  return viewport;
}

function boundsNearlyEqual(a: LatLngBounds, b: LatLngBounds): boolean {
  return (
    Math.abs(a.getWest() - b.getWest()) < BOUNDS_EPS &&
    Math.abs(a.getSouth() - b.getSouth()) < BOUNDS_EPS &&
    Math.abs(a.getEast() - b.getEast()) < BOUNDS_EPS &&
    Math.abs(a.getNorth() - b.getNorth()) < BOUNDS_EPS
  );
}

function cloneBounds(b: LatLngBounds): LatLngBounds {
  return L.latLngBounds(b.getSouthWest().clone(), b.getNorthEast().clone());
}
