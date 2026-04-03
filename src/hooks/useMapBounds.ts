/**
 * Hook that tracks the current Leaflet map bounds, updating on move and zoom.
 * Only usable inside a react-leaflet MapContainer.
 */

import type { LatLngBounds } from 'leaflet';

import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';

export function useMapBounds(): LatLngBounds {
  const map = useMap();
  const [bounds, setBounds] = useState<LatLngBounds>(() => map.getBounds());

  useEffect(() => {
    const update = () => setBounds(map.getBounds());
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
    bounds: map.getBounds(),
    zoom: map.getZoom(),
  }));

  useEffect(() => {
    const update = () => {
      setViewport({ bounds: map.getBounds(), zoom: map.getZoom() });
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
