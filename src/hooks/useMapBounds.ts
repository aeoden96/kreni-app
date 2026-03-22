/**
 * Hook that tracks the current Leaflet map bounds, updating on move and zoom.
 * Only usable inside a react-leaflet MapContainer.
 */

import { useState, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { LatLngBounds } from 'leaflet';

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
