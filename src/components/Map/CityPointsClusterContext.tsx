/* eslint-disable react-refresh/only-export-components */

import type { Feature, Point } from 'geojson';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import type { MergedPointClusterLayerId } from './cityPointClusterConstants';

interface CityPointsClusterRegistry {
  clearLayerPoints: (layerId: MergedPointClusterLayerId) => void;
  setLayerPoints: (layerId: MergedPointClusterLayerId, features: Feature<Point>[]) => void;
}

const RegistryContext = createContext<CityPointsClusterRegistry | null>(null);
const MergedFeaturesContext = createContext<Feature<Point>[]>([]);

export function CityPointsClusterProvider({ children }: { children: ReactNode }) {
  const [layers, setLayers] = useState<
    Partial<Record<MergedPointClusterLayerId, Feature<Point>[]>>
  >({});

  const setLayerPoints = useCallback(
    (layerId: MergedPointClusterLayerId, features: Feature<Point>[]) => {
      setLayers((prev) => ({ ...prev, [layerId]: features }));
    },
    []
  );

  const clearLayerPoints = useCallback((layerId: MergedPointClusterLayerId) => {
    setLayers((prev) => {
      if (!(layerId in prev)) return prev;
      const next = { ...prev };
      delete next[layerId];
      return next;
    });
  }, []);

  const mergedFeatures = useMemo(() => Object.values(layers).flat() as Feature<Point>[], [layers]);

  const registry = useMemo<CityPointsClusterRegistry>(
    () => ({ clearLayerPoints, setLayerPoints }),
    [clearLayerPoints, setLayerPoints]
  );

  return (
    <RegistryContext.Provider value={registry}>
      <MergedFeaturesContext.Provider value={mergedFeatures}>
        {children}
      </MergedFeaturesContext.Provider>
    </RegistryContext.Provider>
  );
}

export function useCityMergedPointFeatures(): Feature<Point>[] {
  return useContext(MergedFeaturesContext);
}

export function useOptionalCityPointsClusterRegistry(): CityPointsClusterRegistry | null {
  return useContext(RegistryContext);
}
