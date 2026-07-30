/**
 * Render all vehicle position markers on the map
 */

import type L from 'leaflet';

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';

import type { AllVehiclePosition } from '../../utils/vehicles';
import type { SpiderfierEntry } from './SpiderfierContext';

import { useAnimatedVehiclePosition } from '../../hooks/useAnimatedVehiclePosition';
import { useSettingsStore } from '../../stores/settingsStore';
import { isNightRoute } from '../../utils/nightLines';
import { NIGHT_VEHICLE_COLOR } from '../../utils/routeStyle';
import { makeVehicleIcon } from '../../utils/vehicleIcon';
import { MARKER_Z_VEHICLE } from './mapMarkerZIndex';
import { MAP_ZOOM_VEHICLES_FADE_MAX, MAP_ZOOM_VEHICLES_FADE_MIN } from './mapZoomConstants';
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

  // Compute icon before hooks so iconRef always holds the latest value.
  // Memoized on its visual inputs so the icon keeps a stable identity across the
  // 7 s position polls — react-leaflet only calls marker.setIcon() (a full DOM
  // rebuild) when one of these actually changes, not on every fix. Bearing is
  // quantized so sub-2° GPS jitter doesn't trigger a needless icon rebuild.
  // Night trams get their own hue so they stand apart from the day tram blue at
  // the hours when both can briefly be on the map together.
  const color = isNightRoute({ shortName: vehicle.routeShortName })
    ? NIGHT_VEHICLE_COLOR
    : vehicle.routeType === 0
      ? '#2337ff'
      : '#ff6b35';
  const isDark = theme === 'dark';
  const bearingKey =
    vehicle.bearing === undefined ? undefined : Math.round(vehicle.bearing / 2) * 2;
  const icon = useMemo(
    () =>
      makeVehicleIcon(
        color,
        bearingKey,
        vehicle.isRealtime,
        vehicle.routeShortName,
        isDark,
        opacity
      ),
    [color, bearingKey, vehicle.isRealtime, vehicle.routeShortName, isDark, opacity]
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

  // Register with the spiderfier ONCE per trip. Re-registering on every poll
  // (when lat/lon change) would churn the registry for the whole fleet. Instead
  // the entry's mutable fields are kept current in place via refs below, so the
  // registry always has the live position without re-running this effect.
  const onClickRef = useRef(onVehicleClick);
  useLayoutEffect(() => {
    onClickRef.current = onVehicleClick;
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
      onClick: () => onClickRef.current?.(vehicle.routeId, vehicle.routeType, vehicle.tripId),
    };
    entryRef.current = entry;
    ctx.register(entry);
    return () => ctx.unregister(vehicle.tripId);
    // routeId/routeType/label are constant for a given trip; position is synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, vehicle.tripId]);

  // Keep the already-registered entry's position current without re-registering.
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

// Skip re-rendering markers whose render-relevant fields are unchanged (e.g.
// vehicles stopped at a light or stop). Movers still re-render because lat/lon
// change — but their icon stays memoized, so no setIcon DOM rebuild fires.
const MemoSpiderfiedAllVehicleMarker = memo(
  SpiderfiedAllVehicleMarker,
  (prev, next) =>
    prev.opacity === next.opacity &&
    prev.theme === next.theme &&
    prev.onVehicleClick === next.onVehicleClick &&
    prev.vehicle.tripId === next.vehicle.tripId &&
    prev.vehicle.lat === next.vehicle.lat &&
    prev.vehicle.lon === next.vehicle.lon &&
    prev.vehicle.bearing === next.vehicle.bearing &&
    prev.vehicle.isRealtime === next.vehicle.isRealtime &&
    prev.vehicle.routeShortName === next.vehicle.routeShortName &&
    prev.vehicle.routeType === next.vehicle.routeType &&
    prev.vehicle.headsign === next.vehicle.headsign
);

interface AllVehicleMarkersProps {
  onVehicleClick?: (routeId: string, routeType: number, tripId: string) => void;
  vehicles: AllVehiclePosition[];
}

// How far beyond the viewport (as a fraction of its size) to keep markers
// mounted, so a normal pan reveals already-rendered markers before the next
// moveend refills. 0.5 ≈ one extra half-viewport on every side.
const CULL_PADDING = 0.5;

export function AllVehicleMarkers({ onVehicleClick, vehicles }: AllVehicleMarkersProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  // Padded viewport bounds; markers outside are not rendered as DOM nodes.
  const [bounds, setBounds] = useState<L.LatLngBounds>(() => map.getBounds().pad(CULL_PADDING));
  const theme = useSettingsStore((s) => s.theme);
  useEffect(() => {
    const handleViewChange = () => {
      setZoom(map.getZoom());
      setBounds(map.getBounds().pad(CULL_PADDING));
    };
    map.on('moveend', handleViewChange);
    map.on('zoomend', handleViewChange);
    return () => {
      map.off('moveend', handleViewChange);
      map.off('zoomend', handleViewChange);
    };
  }, [map]);

  const FADE_MIN = MAP_ZOOM_VEHICLES_FADE_MIN;
  const FADE_MAX = MAP_ZOOM_VEHICLES_FADE_MAX;
  const opacityFactor =
    zoom >= FADE_MAX ? 1 : zoom <= FADE_MIN ? 0 : (zoom - FADE_MIN) / (FADE_MAX - FADE_MIN);

  // Viewport culling: render only vehicles inside the padded bounds. At street
  // zoom this is typically a handful instead of the whole ~220-vehicle fleet.
  const visibleVehicles = useMemo(
    () => vehicles.filter((v) => bounds.contains([v.lat, v.lon])),
    [vehicles, bounds]
  );

  if (opacityFactor === 0) return null;

  return (
    <>
      {visibleVehicles.map((vehicle) => (
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
