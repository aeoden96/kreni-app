/**
 * Invisible Leaflet child component that keeps the map centred on a followed
 * vehicle.  Pan is smooth but uses a short duration so it doesn't fight the
 * realtime update interval.  Following is automatically disengaged when the
 * user manually drags the map.
 */

import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';

interface VehicleFollowerProps {
  /** Current GPS position of the followed vehicle, or null when not following. */
  position: { lat: number; lon: number } | null;
  /** Called when the user drags the map — parent should clear follow state. */
  onDisengage: () => void;
}

export function VehicleFollower({ position, onDisengage }: VehicleFollowerProps) {
  const map = useMap();
  const prevPosRef = useRef<{ lat: number; lon: number } | null>(null);

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
    map.panTo([position.lat, position.lon], { animate: true, duration: 0.8 });
  }, [position, map]);

  return null;
}
