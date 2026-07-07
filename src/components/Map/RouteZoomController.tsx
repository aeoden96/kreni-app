import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

import type { Stop } from '../../utils/gtfs';

interface RouteZoomControllerProps {
  platformStops: Stop[];
  routeStops: string[];
  selectedRouteId: null | string;
  zoomTrigger?: number;
}

export function RouteZoomController({
  platformStops,
  routeStops,
  selectedRouteId,
  zoomTrigger = 0,
}: RouteZoomControllerProps) {
  const map = useMap();
  const prevRouteId = useRef<null | string>(null);
  const prevZoomTrigger = useRef<number>(zoomTrigger);

  useEffect(() => {
    // Fly to bounds when a new route is selected OR when zoomTrigger changes
    if (
      (selectedRouteId && selectedRouteId !== prevRouteId.current) ||
      zoomTrigger !== prevZoomTrigger.current
    ) {
      const stopsForRoute = platformStops.filter((s) => routeStops.includes(s.id));
      if (stopsForRoute.length > 0) {
        const bounds = L.latLngBounds(stopsForRoute.map((s) => [s.lat, s.lon]));
        if (bounds.isValid()) {
          map.flyToBounds(bounds, {
            duration: 0.8,
            maxZoom: 15,
            paddingBottomRight: [20, 20],
            paddingTopLeft: [20, 150], // Account for the RouteViewSmall modal at the top
          });
        }
      }
    }
    prevRouteId.current = selectedRouteId;
    prevZoomTrigger.current = zoomTrigger;
  }, [selectedRouteId, routeStops, platformStops, map, zoomTrigger]);

  return null;
}
