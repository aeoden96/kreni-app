/**
 * Invisible Leaflet child component that keeps the map centred on a followed
 * vehicle.  Pan is smooth but uses a short duration so it doesn't fight the
 * realtime update interval.  Following is automatically disengaged when the
 * user manually drags the map.
 */

import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';

interface VehicleFollowerProps {
  /** Called when the user drags the map — parent should clear follow state. */
  onDisengage: () => void;
  /** Pixel offset applied to the pan target (negative = vehicle appears lower on screen). */
  panOffsetY?: number;
  /** Current GPS position of the followed vehicle, or null when not following. */
  position: null | { lat: number; lon: number };
}

export function VehicleFollower({ onDisengage, panOffsetY = 0, position }: VehicleFollowerProps) {
  const map = useMap();
  const prevPosRef = useRef<null | { lat: number; lon: number }>(null);

  // Disengage on manual drag
  useMapEvents({
    dragstart: () => {
      onDisengage();
    },
  });

  useEffect(() => {
    if (!position) return;
    const prev = prevPosRef.current;
    // Skip if position hasn't changed (avoids needless panning on re-renders)
    if (prev && prev.lat === position.lat && prev.lon === position.lon) return;
    prevPosRef.current = position;
    if (panOffsetY !== 0) {
      const zoom = map.getZoom();
      const point = map.project([position.lat, position.lon], zoom);
      const adjusted = map.unproject(L.point(point.x, point.y + panOffsetY), zoom);
      map.panTo(adjusted, { animate: true, duration: 0.8 });
    } else {
      map.panTo([position.lat, position.lon], { animate: true, duration: 0.8 });
    }
  }, [position, panOffsetY, map]);

  return null;
}
