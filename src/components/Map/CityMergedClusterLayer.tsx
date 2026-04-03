import type { GeoJsonProperties, Point } from 'geojson';

import { memo, useCallback, useMemo } from 'react';
import { Marker, useMap } from 'react-leaflet';
import Supercluster from 'supercluster';

import { useMapViewport } from '../../hooks/useMapBounds';
import { useStaticLayerRenderGate } from '../../hooks/useStaticLayerRenderGate';
import {
  createCityClusterBubbleIcon,
  getCityClusterLeafIcon,
  MERGED_CLUSTER_LAYER_EMOJI,
  readClusterLayerId,
} from './cityClusterIcons';
import { cityClusterLeafMarkerKey } from './cityClusterLeafKeys';
import { CityClusterLeafTooltip } from './cityClusterLeafTooltip';
import {
  CITY_CLUSTER_INTERNAL_LAYER_KEY,
  type MergedPointClusterLayerId,
} from './cityPointClusterConstants';
import { useCityMergedPointFeatures } from './CityPointsClusterContext';
import { MAP_LEAFLET_MAX_ZOOM } from './mapZoomConstants';
import { getNextbikeClusterLeafIcon } from './modes/cycling/nextbikeClusterLeafIcon';

/**
 * Cluster only below map max zoom; at {@link MAP_LEAFLET_MAX_ZOOM} supercluster reads the raw point tree (no clusters).
 * Larger {@link radius} yields fewer, heavier clusters on screen.
 */
const SUPERCLUSTER_OPTIONS = {
  extent: 512,
  map: (props: GeoJsonProperties) => {
    if (!props || typeof props !== 'object') {
      return { layerCounts: {} };
    }
    const id = (props as Record<string, unknown>)[CITY_CLUSTER_INTERNAL_LAYER_KEY];
    const sid = typeof id === 'string' ? id : '';
    return {
      layerCounts: sid ? { [sid]: 1 } : {},
    };
  },
  maxZoom: MAP_LEAFLET_MAX_ZOOM - 1,
  minPoints: 2,
  minZoom: 11,
  /** Pixels (tile extent 512); higher = fewer, larger clusters on screen. */
  radius: 150,
  reduce: (
    acc: { layerCounts: Record<string, number> },
    props: { layerCounts: Record<string, number> }
  ) => {
    const incoming = props.layerCounts || {};
    for (const k of Object.keys(incoming)) {
      acc.layerCounts[k] = (acc.layerCounts[k] || 0) + incoming[k];
    }
  },
} satisfies Supercluster.Options<GeoJsonProperties, { layerCounts: Record<string, number> }>;

function topLayersByCount(
  layerCounts: Record<string, number> | undefined,
  limit: number
): MergedPointClusterLayerId[] {
  if (!layerCounts) return [];
  return Object.entries(layerCounts)
    .filter(([id]) => id in MERGED_CLUSTER_LAYER_EMOJI)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id as MergedPointClusterLayerId);
}

export const CityMergedClusterLayer = memo(function CityMergedClusterLayer() {
  const map = useMap();
  const { bounds, zoom } = useMapViewport();
  const { shouldRenderDetail } = useStaticLayerRenderGate();
  const mergedFeatures = useCityMergedPointFeatures();

  const index = useMemo(() => {
    const sc = new Supercluster(SUPERCLUSTER_OPTIONS);
    sc.load(mergedFeatures as Supercluster.PointFeature<GeoJsonProperties>[]);
    return sc;
  }, [mergedFeatures]);

  const clusters = useMemo(() => {
    if (!shouldRenderDetail || mergedFeatures.length === 0) return [];
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];
    return index.getClusters(bbox, Math.floor(zoom));
  }, [bounds, index, mergedFeatures.length, shouldRenderDetail, zoom]);

  const onClusterClick = useCallback(
    (clusterId: number, lat: number, lng: number) => {
      const z = index.getClusterExpansionZoom(clusterId);
      const target = Number.isFinite(z) ? z : zoom + 1;
      map.setView([lat, lng], Math.min(target, map.getMaxZoom()), { animate: true });
    },
    [index, map, zoom]
  );

  if (!shouldRenderDetail || mergedFeatures.length === 0) return null;

  return (
    <>
      {clusters.map((item) => {
        const coords = (item.geometry as Point).coordinates;
        if (!coords || coords.length < 2) return null;
        const [lng, lat] = coords;
        const props = (item.properties || {}) as Record<string, unknown>;

        if (props.cluster === true && typeof props.cluster_id === 'number') {
          const clusterId = props.cluster_id;
          const pointCount = (props.point_count as number) || 0;
          const layerCounts = props.layerCounts as Record<string, number> | undefined;
          const top = topLayersByCount(layerCounts, 3);
          const icon = createCityClusterBubbleIcon(pointCount, top);

          return (
            <Marker
              eventHandlers={{
                click: () => onClusterClick(clusterId, lat, lng),
              }}
              icon={icon}
              key={`cl-${clusterId}`}
              position={[lat, lng]}
            />
          );
        }

        const layerId = readClusterLayerId(props);
        if (!layerId) return null;
        const leafIcon =
          layerId === 'nextbikeStations'
            ? getNextbikeClusterLeafIcon(props)
            : getCityClusterLeafIcon(layerId);

        return (
          <Marker icon={leafIcon} key={cityClusterLeafMarkerKey(props)} position={[lat, lng]}>
            <CityClusterLeafTooltip lat={lat} lng={lng} properties={props} />
          </Marker>
        );
      })}
    </>
  );
});
