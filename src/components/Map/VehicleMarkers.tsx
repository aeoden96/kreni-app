/**
 * Render vehicle position markers on the map
 */

import type L from 'leaflet';

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';

import type { VehiclePosition } from '../../utils/vehicles';

import { useAnimatedVehiclePosition } from '../../hooks/useAnimatedVehiclePosition';
import { useMapBounds } from '../../hooks/useMapBounds';
import { useSettingsStore } from '../../stores/settingsStore';
import { makeVehicleIcon } from '../../utils/vehicleIcon';
import { getDirectionColor } from './directionColors';
import { MARKER_Z_VEHICLE } from './mapMarkerZIndex';
import { useSpiderfierContext } from './SpiderfierContext';

// ── Spiderfied vehicle sub-component ──────────────────────────────────

interface SpiderfiedVehicleMarkerProps {
  color: string;
  onVehicleSelect?: (tripId: string) => void;
  opacity: number;
  routeShortName: string;
  theme: string;
  vehicle: VehiclePosition;
}

function SpiderfiedVehicleMarker({
  color,
  onVehicleSelect,
  opacity,
  routeShortName,
  theme,
  vehicle,
}: SpiderfiedVehicleMarkerProps) {
  const map = useMap();
  const ctx = useSpiderfierContext();
  const label = routeShortName ? `${routeShortName} – ${vehicle.headsign}` : vehicle.headsign;

  // Compute icon before hooks so iconRef always holds the latest value
  const icon = makeVehicleIcon(
    color,
    vehicle.bearing,
    vehicle.isRealtime,
    routeShortName,
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
      onClick: () => onVehicleSelect?.(vehicle.tripId), // allow follow mode on specific vehicle
    });
    return () => ctx.unregister(vehicle.tripId);
  }, [vehicle.tripId, vehicle.lat, vehicle.lon, label, onVehicleSelect, ctx]);

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

const MemoSpiderfiedVehicleMarker = memo(SpiderfiedVehicleMarker);

interface VehicleMarkersProps {
  onVehicleSelect?: (tripId: string) => void;
  routeShortName?: string;
  routeType: null | number;
  vehicles: VehiclePosition[];
}

export function VehicleMarkers({
  onVehicleSelect,
  routeShortName = '',
  routeType,
  vehicles,
}: VehicleMarkersProps) {
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

  const visible = useMemo(
    () => vehicles.filter((v) => bounds.contains([v.lat, v.lon])),
    [vehicles, bounds]
  );

  const FADE_MIN = 13;
  const FADE_MAX = 14;
  const opacityFactor =
    zoom >= FADE_MAX ? 1 : zoom <= FADE_MIN ? 0 : (zoom - FADE_MIN) / (FADE_MAX - FADE_MIN);

  if (opacityFactor === 0) return null;

  return (
    <>
      {visible.map((vehicle) => {
        const color = getDirectionColor(routeType, vehicle.direction ?? 0);
        return (
          <MemoSpiderfiedVehicleMarker
            color={color}
            key={vehicle.tripId}
            onVehicleSelect={onVehicleSelect}
            opacity={opacityFactor}
            routeShortName={routeShortName}
            theme={theme}
            vehicle={vehicle}
          />
        );
      })}
    </>
  );
}
