import type { Feature, Point } from 'geojson';

import {
  CITY_CLUSTER_INTERNAL_LAYER_KEY,
  CITY_CLUSTER_INTERNAL_STABLE_KEY,
  type MergedPointClusterLayerId,
} from './cityPointClusterConstants';

export function annotateCityClusterFeatures(
  features: Feature<Point>[],
  layerId: MergedPointClusterLayerId
): Feature<Point>[] {
  return features.map((f, i) => {
    const coords = (f.geometry as Point).coordinates;
    const coordKey = coords && coords.length >= 2 ? `${coords[0]},${coords[1]}` : 'x';
    const base =
      typeof f.properties === 'object' && f.properties !== null ? { ...f.properties } : {};
    const uidRaw = base.uid ?? base.UID;
    const idRaw = base.id;
    let stableKey: string;
    if (
      uidRaw != null &&
      (typeof uidRaw === 'number' || (typeof uidRaw === 'string' && uidRaw !== ''))
    ) {
      stableKey = `${layerId}-uid-${String(uidRaw)}`;
    } else if (idRaw != null && String(idRaw) !== '') {
      stableKey = `${layerId}-id-${String(idRaw)}`;
    } else {
      stableKey = `${layerId}-${i}-${coordKey}`;
    }
    return {
      geometry: f.geometry,
      properties: {
        ...base,
        [CITY_CLUSTER_INTERNAL_LAYER_KEY]: layerId,
        [CITY_CLUSTER_INTERNAL_STABLE_KEY]: stableKey,
      },
      type: 'Feature',
    };
  });
}
