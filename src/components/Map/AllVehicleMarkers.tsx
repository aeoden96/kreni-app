/**
 * Render all vehicle position markers on the map
 */

import { useEffect, useLayoutEffect, useRef, useState, useMemo, memo } from 'react';
import { Marker, useMap } from 'react-leaflet';
import type { AllVehiclePosition } from '../../utils/vehicles';
import { makeVehicleIcon } from '../../utils/vehicleIcon';
import { useSettingsStore } from '../../stores/settingsStore';
import { useMapBounds } from '../../hooks/useMapBounds';
import { useSpiderfierContext } from './SpiderfierContext';

// ── Spiderfied sub-component for all-vehicles view ───────────────────────

interface SpiderfiedAllVehicleMarkerProps {
  vehicle: AllVehiclePosition;
  theme: string;
  onVehicleClick?: (routeId: string, routeType: number, tripId: string) => void;
  opacity: number;
}

function SpiderfiedAllVehicleMarker({
  vehicle,
  theme,
  onVehicleClick,
  opacity,
}: SpiderfiedAllVehicleMarkerProps) {
  const map = useMap();
  const ctx = useSpiderfierContext();
  const label = vehicle.routeShortName
    ? `${vehicle.routeShortName} – ${vehicle.headsign}`
    : vehicle.headsign;

  // Compute icon before hooks so iconRef always holds the latest value
  const color = vehicle.routeType === 0 ? '#2337ff' : '#ff6b35';
  const icon = makeVehicleIcon(color, vehicle.bearing, vehicle.isRealtime, vehicle.routeShortName, theme === 'dark', opacity);
  const iconRef = useRef(icon);
  useLayoutEffect(() => { iconRef.current = icon; });

  useEffect(() => {
    if (!ctx) return;
    ctx.register({
      id: vehicle.tripId,
      lat: vehicle.lat,
      lon: vehicle.lon,
      label,
      onClick: () => onVehicleClick?.(vehicle.routeId, vehicle.routeType, vehicle.tripId),
      getIcon: () => iconRef.current,
      hideLabel: true, // icon already shows the route number; no need for a text bubble
    });
    return () => ctx.unregister(vehicle.tripId);
  }, [vehicle.tripId, vehicle.lat, vehicle.lon, label, onVehicleClick, vehicle.routeId, vehicle.routeType, ctx]);

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

const MemoSpiderfiedAllVehicleMarker = memo(SpiderfiedAllVehicleMarker);

interface AllVehicleMarkersProps {
  vehicles: AllVehiclePosition[];
  onVehicleClick?: (routeId: string, routeType: number, tripId: string) => void;
}

export function AllVehicleMarkers({ vehicles, onVehicleClick }: AllVehicleMarkersProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const bounds = useMapBounds();
  const theme = useSettingsStore((s) => s.theme);
  useEffect(() => {
    const handleZoomEnd = () => setZoom(map.getZoom());
    map.on('zoomend', handleZoomEnd);
    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map]);

  const visible = useMemo(() => vehicles.filter((v) => bounds.contains([v.lat, v.lon])), [vehicles, bounds]);

  const FADE_MIN = 13;
  const FADE_MAX = 14;
  const opacityFactor = zoom >= FADE_MAX
    ? 1
    : zoom <= FADE_MIN
      ? 0
      : (zoom - FADE_MIN) / (FADE_MAX - FADE_MIN);
  if (opacityFactor === 0) return null;

  return (
    <>
      {visible.map((vehicle) => (
        <MemoSpiderfiedAllVehicleMarker
          key={vehicle.tripId}
          vehicle={vehicle}
          theme={theme}
          onVehicleClick={onVehicleClick}
          opacity={opacityFactor}
        />
      ))}
    </>
  );
}
