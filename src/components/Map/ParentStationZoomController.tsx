/**
 * Component to handle zooming when parent stations are clicked
 */

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface ParentStationZoomControllerProps {
  zoomTarget: { lat: number; lon: number; zoom?: number } | null;
  panOffsetY?: number;
  onZoomComplete: () => void;
}

export function ParentStationZoomController({ 
  zoomTarget,
  panOffsetY = 0,
  onZoomComplete 
}: ParentStationZoomControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (zoomTarget) {
      // Zoom to provided level (fallback to 17)
      const targetZoom = zoomTarget.zoom ?? 17;
      if (panOffsetY !== 0) {
        // Pre-shift the fly target so the marker lands offset from screen centre.
        const point = map.project([zoomTarget.lat, zoomTarget.lon], targetZoom);
        const adjusted = map.unproject(L.point(point.x, point.y + panOffsetY), targetZoom);
        map.flyTo(adjusted, targetZoom, { duration: 0.8, easeLinearity: 0.25 });
      } else {
        map.flyTo([zoomTarget.lat, zoomTarget.lon], targetZoom, {
          duration: 0.8,
          easeLinearity: 0.25
        });
      }
      
      // Clear the zoom target after animation completes
      const timer = setTimeout(() => {
        onZoomComplete();
      }, 1000); // Give time for animation to complete
      
      return () => clearTimeout(timer);
    }
  }, [zoomTarget, panOffsetY, map, onZoomComplete]);

  return null;
}
