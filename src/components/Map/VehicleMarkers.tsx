/**
 * Render vehicle position markers on the map
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';
import type { VehiclePosition } from '../../utils/vehicles';
import { makeVehicleIcon } from '../../utils/vehicleIcon';
import { getDirectionColor } from './directionColors';
import { useSettingsStore } from '../../stores/settingsStore';
import { useMapBounds } from '../../hooks/useMapBounds';
import { useSpiderfierContext } from './SpiderfierContext';

// ── Spiderfied vehicle sub-component ──────────────────────────────────

interface SpiderfiedVehicleMarkerProps {
  vehicle: VehiclePosition;
  color: string;
  routeShortName: string;
  theme: string;
  onVehicleSelect?: (tripId: string) => void;
  opacity: number;
}

function SpiderfiedVehicleMarker({
  vehicle,
  color,
  routeShortName,
  theme,
  onVehicleSelect,
  opacity,
}: SpiderfiedVehicleMarkerProps) {
  const map = useMap();
  const ctx = useSpiderfierContext();
  const label = routeShortName
    ? `${routeShortName} – ${vehicle.headsign}`
    : vehicle.headsign;

  // Compute icon before hooks so iconRef always holds the latest value
  const icon = makeVehicleIcon(color, vehicle.bearing, vehicle.isRealtime, routeShortName, theme === 'dark', opacity);
  const iconRef = useRef(icon);
  useLayoutEffect(() => { iconRef.current = icon; });

  useEffect(() => {
    if (!ctx) return;
    ctx.register({
      id: vehicle.tripId,
      lat: vehicle.lat,
      lon: vehicle.lon,
      label,
      onClick: () => onVehicleSelect?.(vehicle.tripId), // allow follow mode on specific vehicle
      getIcon: () => iconRef.current,
      hideLabel: true, // icon already shows the route number; no need for a text bubble
    });
    return () => ctx.unregister(vehicle.tripId);
  }, [vehicle.tripId, vehicle.lat, vehicle.lon, label, onVehicleSelect, ctx]);

  if (ctx?.isHidden(vehicle.tripId)) return null;

  return (
    <Marker
      position={[vehicle.lat, vehicle.lon]}
      icon={icon}
      eventHandlers={{
        click: (e) => {
          e.originalEvent.stopPropagation();
          ctx?.triggerSpiderfy(vehicle.tripId, map);
        },
      }}
    />
  );
}

interface VehicleMarkersProps {
  vehicles: VehiclePosition[];
  routeType: number | null;
  routeShortName?: string;
  onVehicleSelect?: (tripId: string) => void;
}

export function VehicleMarkers({ vehicles, routeType, routeShortName = '', onVehicleSelect }: VehicleMarkersProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const theme = useSettingsStore((s) => s.theme);
  const bounds = useMapBounds();

  useEffect(() => {
    const handleZoomEnd = () => setZoom(map.getZoom());
    map.on('zoomend', handleZoomEnd);
    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map]);

  const FADE_MIN = 13;
  const FADE_MAX = 14;
  const opacityFactor = zoom >= FADE_MAX
    ? 1
    : zoom <= FADE_MIN
      ? 0
      : (zoom - FADE_MIN) / (FADE_MAX - FADE_MIN);

  if (opacityFactor === 0) return null;

  const visible = vehicles.filter((v) => bounds.contains([v.lat, v.lon]));

  return (
    <>
      {visible.map((vehicle) => {
        const color = getDirectionColor(routeType, vehicle.direction ?? 0);
        return (
          <SpiderfiedVehicleMarker
            key={vehicle.tripId}
            vehicle={vehicle}
            color={color}
            routeShortName={routeShortName}
            theme={theme}
            onVehicleSelect={onVehicleSelect}
            opacity={opacityFactor}
          />
        );
      })}
    </>
  );
}
