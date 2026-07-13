import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

interface PreviewVehicleZoomControllerProps {
  position?: null | { lat: number; lon: number };
  tripId?: null | string;
}

export function PreviewVehicleZoomController({
  position,
  tripId,
}: PreviewVehicleZoomControllerProps) {
  const map = useMap();
  const prevTripId = useRef<null | string>(null);

  useEffect(() => {
    if (tripId && position && tripId !== prevTripId.current) {
      // Only pan when the user cycles to a new vehicle or clicks a new vehicle
      map.panTo([position.lat, position.lon], { duration: 0.6 });
      prevTripId.current = tripId;
    }
  }, [position, tripId, map]);

  return null;
}
