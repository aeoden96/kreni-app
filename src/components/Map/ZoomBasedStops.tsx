/**
 * Component that renders different stops based on zoom level
 */

import { memo, useEffect, useMemo, useState } from 'react';
import { useMap } from 'react-leaflet';

import type { Route, Stop } from '../../utils/gtfs';

import { useGTFSMode } from '../../contexts/GTFSModeContext';
import { useMapBounds } from '../../hooks/useMapBounds';
import { MAP_ZOOM_TRANSIT_STOPS_HINT_THRESHOLD } from './mapZoomConstants';
import { StopMarkers } from './StopMarkers';

interface ZoomBasedStopsProps {
  alertStopIds: Set<string>;
  highlightStopIds: string[];

  onStopClick: (stopId: string) => void;
  /** Optional ordered stops mapping from useRouteData (direction -> stop ids) */
  orderedStops?: Record<string, string[]>;
  parentChildCounts: Map<string, number>;
  parentStations: Stop[];
  platformStops: Stop[];

  routesById: Map<string, Route>;
  selectedStopId: null | string;
}

export const ZoomBasedStops = memo(function ZoomBasedStops({
  alertStopIds,
  highlightStopIds,

  onStopClick,
  orderedStops,
  parentChildCounts,
  parentStations,
  platformStops,
  routesById,
  selectedStopId,
}: ZoomBasedStopsProps) {
  const map = useMap();
  const { alwaysShowStops } = useGTFSMode();
  const [zoom, setZoom] = useState(map.getZoom());
  const bounds = useMapBounds();

  useEffect(() => {
    const handleZoomEnd = () => {
      setZoom(map.getZoom());
    };

    map.on('zoomend', handleZoomEnd);

    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map]);

  // Pre-compute sets for route-based filtering (must be before any early return)
  const highlightSet = useMemo(() => new Set(highlightStopIds), [highlightStopIds]);

  // Show labels when the map is at (or above) its max zoom.
  const showLabels = Math.round(zoom) >= map.getMaxZoom();

  // Build a mapping stopId -> direction index (0,1,...) if orderedStops provided
  const stopDirectionMap = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    if (!orderedStops) return map;
    Object.entries(orderedStops).forEach(([dirKey, ids]) => {
      const idx = Number.parseInt(dirKey, 10) || 0;
      ids.forEach((sid) => {
        map[sid] = idx;
      });
    });
    return map;
  }, [orderedStops]);

  // When a route is selected (highlightStopIds is populated) derive the parent
  // station IDs that belong to that route so grouped-mode can filter correctly.
  const routeParentIds = useMemo<null | Set<string>>(() => {
    if (highlightSet.size === 0) return null;
    const parents = new Set<string>();
    platformStops.forEach((s) => {
      if (highlightSet.has(s.id) && s.parentStation) parents.add(s.parentStation);
    });
    return parents;
  }, [highlightSet, platformStops]);

  // Transit: either full-opacity stops or none — same threshold as the
  // "zoom in" badge (MAP_ZOOM_TRANSIT_STOPS_HINT_THRESHOLD). Train mode always shows stops.
  // Also force opacity to 1 if a route is selected (routeParentIds is truthy) so the route's stops are always visible.
  const opacityFactor =
    alwaysShowStops || zoom > MAP_ZOOM_TRANSIT_STOPS_HINT_THRESHOLD || routeParentIds ? 1 : 0;

  let visiblePlatforms = platformStops.filter((s) => bounds.contains([s.lat, s.lon]));
  // When a route is selected, only show stops on that route (always keep the selected stop).
  if (routeParentIds) {
    visiblePlatforms = visiblePlatforms.filter(
      (s) => highlightSet.has(s.id) || s.id === selectedStopId
    );
  }

  return (
    <StopMarkers
      alertStopIds={alertStopIds}
      highlightStopIds={highlightStopIds}
      isParentStationView={false}
      onStopClick={onStopClick}
      opacityFactor={opacityFactor}
      parentChildCounts={parentChildCounts}
      parentStations={parentStations}
      routesById={routesById}
      selectedStopId={selectedStopId}
      showLabels={showLabels}
      stopDirectionMap={stopDirectionMap}
      stops={visiblePlatforms}
    />
  );
});
