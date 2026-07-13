/**
 * Render vehicle position markers on the map
 */

import type L from 'leaflet';

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';

import type { VehiclePosition } from '../../utils/vehicles';
import type { SpiderfierEntry } from './SpiderfierContext';

import { useAnimatedVehiclePosition } from '../../hooks/useAnimatedVehiclePosition';
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

  // Compute icon before hooks so iconRef always holds the latest value.
  // Memoized on its visual inputs so the icon keeps a stable identity across the
  // 7 s position polls — react-leaflet only calls marker.setIcon() (a full DOM
  // rebuild) when one of these actually changes. Bearing is quantized so sub-2°
  // GPS jitter doesn't trigger a needless icon rebuild.
  const isDark = theme === 'dark';
  const bearingKey =
    vehicle.bearing === undefined ? undefined : Math.round(vehicle.bearing / 2) * 2;
  const icon = useMemo(
    () => makeVehicleIcon(color, bearingKey, vehicle.isRealtime, routeShortName, isDark, opacity),
    [color, bearingKey, vehicle.isRealtime, routeShortName, isDark, opacity]
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

  // Register with the spiderfier ONCE per trip; keep the entry's position current
  // in place via refs so a poll doesn't re-run this effect (see AllVehicleMarkers).
  const onClickRef = useRef(onVehicleSelect);
  useLayoutEffect(() => {
    onClickRef.current = onVehicleSelect;
  });
  const entryRef = useRef<null | SpiderfierEntry>(null);
  useEffect(() => {
    if (!ctx) return;
    const entry: SpiderfierEntry = {
      getIcon: () => iconRef.current,
      hideLabel: true, // icon already shows the route number; no need for a text bubble
      id: vehicle.tripId,
      label,
      lat: vehicle.lat,
      lon: vehicle.lon,
      onClick: () => onClickRef.current?.(vehicle.tripId), // allow follow mode on specific vehicle
    };
    entryRef.current = entry;
    ctx.register(entry);
    return () => ctx.unregister(vehicle.tripId);
    // label is constant for a given trip; position is synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, vehicle.tripId]);

  useLayoutEffect(() => {
    const e = entryRef.current;
    if (e) {
      e.lat = vehicle.lat;
      e.lon = vehicle.lon;
    }
  });

  // Stable click handler so the Marker's eventHandlers object keeps a constant
  // identity — otherwise react-leaflet rebinds listeners on every poll.
  const handleMarkerClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      e.originalEvent.stopPropagation();
      ctx?.triggerSpiderfy(vehicle.tripId, map);
    },
    [ctx, vehicle.tripId, map]
  );
  const eventHandlers = useMemo(() => ({ click: handleMarkerClick }), [handleMarkerClick]);

  if (ctx?.isHidden(vehicle.tripId)) return null;

  return (
    <Marker
      eventHandlers={eventHandlers}
      icon={icon}
      position={initPos}
      ref={markerRef}
      zIndexOffset={MARKER_Z_VEHICLE}
    />
  );
}

// Skip re-rendering markers whose render-relevant fields are unchanged. Movers
// still re-render (lat/lon change) but keep their memoized icon, so no setIcon
// DOM rebuild fires.
const MemoSpiderfiedVehicleMarker = memo(
  SpiderfiedVehicleMarker,
  (prev, next) =>
    prev.color === next.color &&
    prev.opacity === next.opacity &&
    prev.theme === next.theme &&
    prev.routeShortName === next.routeShortName &&
    prev.onVehicleSelect === next.onVehicleSelect &&
    prev.vehicle.tripId === next.vehicle.tripId &&
    prev.vehicle.lat === next.vehicle.lat &&
    prev.vehicle.lon === next.vehicle.lon &&
    prev.vehicle.bearing === next.vehicle.bearing &&
    prev.vehicle.isRealtime === next.vehicle.isRealtime &&
    prev.vehicle.direction === next.vehicle.direction &&
    prev.vehicle.headsign === next.vehicle.headsign
);

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
  const isDark = theme === 'dark';

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
      {vehicles.map((vehicle) => {
        const color = getDirectionColor(routeType, vehicle.direction ?? 0, isDark);
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
