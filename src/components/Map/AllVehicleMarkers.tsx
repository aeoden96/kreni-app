/**
 * Render all vehicle position markers on the map
 */

import type L from 'leaflet';

import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';

import type { AllVehiclePosition } from '../../utils/vehicles';

import { useAnimatedVehiclePosition } from '../../hooks/useAnimatedVehiclePosition';
import { useSettingsStore } from '../../stores/settingsStore';
import { makeVehicleIcon } from '../../utils/vehicleIcon';
import { MARKER_Z_VEHICLE } from './mapMarkerZIndex';
import { useSpiderfierContext } from './SpiderfierContext';

// ── Spiderfied sub-component for all-vehicles view ───────────────────────

interface SpiderfiedAllVehicleMarkerProps {
  onVehicleClick?: (routeId: string, routeType: number, tripId: string) => void;
  opacity: number;
  theme: string;
  vehicle: AllVehiclePosition;
}

function SpiderfiedAllVehicleMarker({
  onVehicleClick,
  opacity,
  theme,
  vehicle,
}: SpiderfiedAllVehicleMarkerProps) {
  const map = useMap();
  const ctx = useSpiderfierContext();
  const label = vehicle.routeShortName
    ? `${vehicle.routeShortName} – ${vehicle.headsign}`
    : vehicle.headsign;

  // Compute icon before hooks so iconRef always holds the latest value
  const color = vehicle.routeType === 0 ? '#2337ff' : '#ff6b35';
  const icon = makeVehicleIcon(
    color,
    vehicle.bearing,
    vehicle.isRealtime,
    vehicle.routeShortName,
    theme === 'dark',
    opacity
  );
  const iconRef = useRef(icon);
  useLayoutEffect(() => {
    iconRef.current = icon;
  });

  // Stable initial position — kept constant so React-Leaflet never calls
  // setLatLng() on the Marker, leaving all position updates to the rAF loop.
  const [initPos] = useState<[number, number]>([vehicle.lat, vehicle.lon]);
  const markerRef = useRef<L.Marker | null>(null);
  useAnimatedVehiclePosition(markerRef, vehicle.lat, vehicle.lon);

  useEffect(() => {
    if (!ctx) return;
    ctx.register({
      getIcon: () => iconRef.current,
      hideLabel: true, // icon already shows the route number; no need for a text bubble
      id: vehicle.tripId,
      label,
      lat: vehicle.lat,
      lon: vehicle.lon,
      onClick: () => onVehicleClick?.(vehicle.routeId, vehicle.routeType, vehicle.tripId),
    });
    return () => ctx.unregister(vehicle.tripId);
  }, [
    vehicle.tripId,
    vehicle.lat,
    vehicle.lon,
    label,
    onVehicleClick,
    vehicle.routeId,
    vehicle.routeType,
    ctx,
  ]);

  if (ctx?.isHidden(vehicle.tripId)) return null;

  return (
    <Marker
      eventHandlers={{
        click: (e) => {
          e.originalEvent.stopPropagation();
          ctx?.triggerSpiderfy(vehicle.tripId, map);
        },
      }}
      icon={icon}
      position={initPos}
      ref={markerRef}
      zIndexOffset={MARKER_Z_VEHICLE}
    />
  );
}

const MemoSpiderfiedAllVehicleMarker = memo(SpiderfiedAllVehicleMarker);

interface AllVehicleMarkersProps {
  onVehicleClick?: (routeId: string, routeType: number, tripId: string) => void;
  vehicles: AllVehiclePosition[];
}

export function AllVehicleMarkers({ onVehicleClick, vehicles }: AllVehicleMarkersProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const theme = useSettingsStore((s) => s.theme);
  useEffect(() => {
    const handleZoomEnd = () => setZoom(map.getZoom());
    map.on('zoomend', handleZoomEnd);
    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map]);

  const FADE_MIN = 13;
  const FADE_MAX = 14;
  const opacityFactor =
    zoom >= FADE_MAX ? 1 : zoom <= FADE_MIN ? 0 : (zoom - FADE_MIN) / (FADE_MAX - FADE_MIN);
  if (opacityFactor === 0) return null;

  return (
    <>
      {vehicles.map((vehicle) => (
        <MemoSpiderfiedAllVehicleMarker
          key={vehicle.tripId}
          onVehicleClick={onVehicleClick}
          opacity={opacityFactor}
          theme={theme}
          vehicle={vehicle}
        />
      ))}
    </>
  );
}
