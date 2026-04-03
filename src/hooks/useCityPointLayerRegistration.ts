import type { Feature, Point } from 'geojson';

import { useEffect } from 'react';

import type { MergedPointClusterLayerId } from '../components/Map/cityPointClusterConstants';

import { useOptionalCityPointsClusterRegistry } from '../components/Map/CityPointsClusterContext';

/**
 * When {@link CityPointsClusterProvider} is present, publishes point features for merged clustering.
 * Returns whether the host should skip rendering individual markers.
 */
export function useCityPointLayerRegistration(
  layerId: MergedPointClusterLayerId,
  show: boolean,
  canPublish: boolean,
  featuresForCluster: Feature<Point>[]
): boolean {
  const registry = useOptionalCityPointsClusterRegistry();

  useEffect(() => {
    if (!registry) return;
    if (!show || !canPublish) {
      registry.clearLayerPoints(layerId);
      return;
    }
    registry.setLayerPoints(layerId, featuresForCluster);
    return () => registry.clearLayerPoints(layerId);
  }, [registry, show, canPublish, layerId, featuresForCluster]);

  return registry !== null;
}
