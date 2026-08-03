import type { GeoJsonProperties, Point } from 'geojson';

import { memo, useCallback, useMemo } from 'react';
import { Marker, useMap } from 'react-leaflet';
import Supercluster from 'supercluster';

import type { AllVehiclePosition } from '../../utils/vehicles';
import type { VehicleClusterMode } from './vehicleClusterIcon';

import { useMapViewport } from '../../hooks/useMapBounds';
import { MARKER_Z_VEHICLE } from './mapMarkerZIndex';
import {
  MAP_ZOOM_TRANSIT_STOPS_HINT_THRESHOLD,
  MAP_ZOOM_VEHICLES_FADE_MAX,
} from './mapZoomConstants';
import { createVehicleClusterIcon } from './vehicleClusterIcon';

/**
 * Clusters are only ever read at or below the hint threshold — above it
 * {@link AllVehicleMarkers} takes over with individual icons — so there is no
 * point building the tree past that zoom.
 *
 * `radius` is the density knob, and the one worth tuning by eye: it is a pixel
 * distance, so raising it merges neighbours into fewer, heavier bubbles. That is
 * the only lever that meaningfully cuts marker count here — the per-poll cost at
 * this zoom is DOM churn across bubbles, not the clustering itself. Note that
 * running one tree per mode roughly doubles the bubble count for a given radius,
 * since a tram group and a bus group in the same place no longer merge.
 */
const SUPERCLUSTER_OPTIONS = {
  extent: 512,
  maxZoom: MAP_ZOOM_TRANSIT_STOPS_HINT_THRESHOLD,
  minPoints: 2,
  minZoom: 0,
  /** Pixels (tile extent 512); higher = fewer, larger bubbles on screen. */
  radius: 300,
} satisfies Supercluster.Options<GeoJsonProperties, GeoJsonProperties>;

interface VehicleClusterLayerProps {
  vehicles: AllVehiclePosition[];
}

/**
 * Low-zoom stand-in for the all-vehicles layer.
 *
 * `AllVehicleMarkers` fades to nothing at or below
 * {@link MAP_ZOOM_TRANSIT_STOPS_HINT_THRESHOLD}, which left the city-wide view
 * empty enough to read as a failed load. This renders the same fleet as a
 * handful of counted bubbles instead — vehicles only, no stops, since stop
 * density at that zoom is what the hidden-stops rule exists to avoid.
 *
 * Trams and buses are clustered independently, so a mixed area yields one tram
 * disc and one bus disc rather than a single bubble whose count mixes the two.
 *
 * The two layers are exact complements (`<=` here, `>` there), so a vehicle is
 * never drawn twice.
 */
export const VehicleClusterLayer = memo(function VehicleClusterLayer({
  vehicles,
}: VehicleClusterLayerProps) {
  const { zoom } = useMapViewport();
  if (zoom > MAP_ZOOM_TRANSIT_STOPS_HINT_THRESHOLD) return null;

  return (
    <>
      <ModeClusters mode="tram" vehicles={vehicles} />
      <ModeClusters mode="bus" vehicles={vehicles} />
    </>
  );
});

interface ModeClustersProps {
  mode: VehicleClusterMode;
  vehicles: AllVehiclePosition[];
}

/**
 * One cluster tree for one vehicle type. Rendered once per mode so each keeps its
 * own memoized index — a shared index would have to be re-queried per mode anyway,
 * and supercluster has no notion of clustering within a category.
 */
const ModeClusters = memo(function ModeClusters({ mode, vehicles }: ModeClustersProps) {
  const map = useMap();
  const { bounds, zoom } = useMapViewport();

  const ofMode = useMemo(
    () => vehicles.filter((v) => (v.routeType === 0 ? 'tram' : 'bus') === mode),
    [mode, vehicles]
  );

  // Coarse signature of the fleet: trip identity plus position rounded to ~100 m.
  // At these zooms 100 m is a handful of pixels, so a poll where nothing crossed
  // that grid produces an identical key and everything downstream is skipped.
  const fleetKey = useMemo(
    () => ofMode.map((v) => `${v.tripId}:${v.lat.toFixed(3)}:${v.lon.toFixed(3)}`).join('|'),
    [ofMode]
  );

  const features = useMemo(
    () =>
      ofMode.map((v) => ({
        geometry: { coordinates: [v.lon, v.lat], type: 'Point' as const },
        properties: { tripId: v.tripId },
        type: 'Feature' as const,
      })),
    // Keyed on fleetKey, not the array identity: a new `vehicles` array arrives every
    // 7 s poll, and rebuilding on it re-indexed the tree and remounted every bubble
    // for sub-pixel drift.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fleetKey]
  );

  // Indexing a few hundred points is sub-millisecond, and a mutable tree would drift
  // from the store it mirrors — so rebuild, just only when `fleetKey` says it matters.
  const index = useMemo(() => {
    const sc = new Supercluster<GeoJsonProperties, GeoJsonProperties>(SUPERCLUSTER_OPTIONS);
    sc.load(features as Supercluster.PointFeature<GeoJsonProperties>[]);
    return sc;
  }, [features]);

  const clusters = useMemo(() => {
    if (features.length === 0) return [];
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];
    return index.getClusters(bbox, Math.floor(zoom));
  }, [bounds, features.length, index, zoom]);

  const onClusterClick = useCallback(
    (clusterId: number, lat: number, lng: number) => {
      const expansion = index.getClusterExpansionZoom(clusterId);
      // Always advance at least one step, so a tap on a cluster that supercluster
      // would not split until far in still moves the map.
      const target = Number.isFinite(expansion) ? Math.max(expansion, zoom + 1) : zoom + 1;
      map.setView([lat, lng], Math.min(target, map.getMaxZoom()), { animate: true });
    },
    [index, map, zoom]
  );

  const onLeafClick = useCallback(
    (lat: number, lng: number) => {
      // A lone vehicle has nothing to expand into — go straight to the zoom where
      // individual vehicle icons start rendering.
      map.setView([lat, lng], Math.min(MAP_ZOOM_VEHICLES_FADE_MAX, map.getMaxZoom()), {
        animate: true,
      });
    },
    [map]
  );

  if (features.length === 0) return null;

  return (
    <>
      {clusters.map((item) => {
        const coords = (item.geometry as Point).coordinates;
        if (!coords || coords.length < 2) return null;
        const [lng, lat] = coords;
        const props = (item.properties || {}) as Record<string, unknown>;

        const isCluster = props.cluster === true && typeof props.cluster_id === 'number';
        const clusterId = isCluster ? (props.cluster_id as number) : null;
        const count = isCluster ? (props.point_count as number) || 0 : 1;

        return (
          <Marker
            eventHandlers={{
              click: () =>
                clusterId === null ? onLeafClick(lat, lng) : onClusterClick(clusterId, lat, lng),
            }}
            icon={createVehicleClusterIcon(mode, count)}
            key={
              clusterId === null ? `${mode}-leaf-${String(props.tripId)}` : `${mode}-${clusterId}`
            }
            position={[lat, lng]}
            zIndexOffset={MARKER_Z_VEHICLE}
          />
        );
      })}
    </>
  );
});
