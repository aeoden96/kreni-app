import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { useSettingsStore } from '../stores/settingsStore';

const LAYER_KEYS = {
  bike_parking: 'showBikeParkings',
  bike_paths: 'showBikePaths',
  bike_stations: 'showBikeStations',
  congestion: 'showCongestionHeatmap',
  ev: 'showElectricCharging',
  fountains: 'showPublicFountains',
  garages: 'showPublicGarages',
  pedestrian: 'showPedestrianZones',
  restaurants: 'showStudentRestaurants',
  train_stations: 'showRailwayStations',
  wifi: 'showFreeWifi',
  zones: 'showParkingZones',
} as const;

type LayerKey = keyof typeof LAYER_KEYS;

const ROUTE_LAYERS: Record<string, LayerKey[]> = {
  '/': ['congestion'],
  '/city': ['restaurants', 'fountains', 'pedestrian', 'wifi'],
  '/cycling': ['bike_stations', 'bike_parking', 'bike_paths'],
  '/driving': ['garages', 'ev', 'zones'],
  '/train': ['train_stations'],
};

type StoreState = ReturnType<typeof useSettingsStore.getState>;

export function useUrlQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // 1. Sync URL -> Store on Mount + URL changes + Route changes
  useEffect(() => {
    const layersParam = searchParams.get('layers');
    const viewParam = searchParams.get('view');

    const updates: Partial<StoreState> = {};
    let hasChanges = false;

    const activeRouteLayers = ROUTE_LAYERS[location.pathname] || [];

    if (layersParam !== null) {
      const activeLayers = new Set(
        layersParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      );
      // Only process keys relevant to the current route
      activeRouteLayers.forEach((urlKey) => {
        const storeKey = LAYER_KEYS[urlKey];
        const shouldBeActive = activeLayers.has(urlKey);
        if (useSettingsStore.getState()[storeKey as keyof StoreState] !== shouldBeActive) {
          (updates as any)[storeKey] = shouldBeActive;
          hasChanges = true;
        }
      });
    }

    if (location.pathname === '/' && (viewParam === 'map' || viewParam === 'list')) {
      if (useSettingsStore.getState().appMode !== viewParam) {
        updates.appMode = viewParam;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      useSettingsStore.setState(updates);
    }
  }, [searchParams, location.pathname]);

  // 2. Sync Store -> URL on store changes + route changes
  useEffect(() => {
    const syncUrl = () => {
      const state = useSettingsStore.getState();
      const activeRouteLayers = ROUTE_LAYERS[location.pathname] || [];

      const activeLayers: string[] = [];
      activeRouteLayers.forEach((urlKey) => {
        const storeKey = LAYER_KEYS[urlKey];
        if (state[storeKey as keyof StoreState]) {
          activeLayers.push(urlKey);
        }
      });

      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);

          const newLayersStr = activeLayers.join(',');
          if (newLayersStr) {
            newParams.set('layers', newLayersStr);
          } else {
            newParams.delete('layers');
          }

          if (location.pathname === '/' && state.appMode) {
            newParams.set('view', state.appMode);
          } else if (location.pathname !== '/') {
            newParams.delete('view');
          }

          if (newParams.toString() !== prev.toString()) {
            return newParams;
          }
          return prev;
        },
        { replace: true }
      );
    };

    // Initially sync route-specific URL params just in case they are stale from another route
    syncUrl();

    // Subscribe to state changes and sync
    const unsubscribe = useSettingsStore.subscribe((state, prevState) => {
      let changed = false;

      const activeRouteLayers = ROUTE_LAYERS[location.pathname] || [];

      if (location.pathname === '/' && state.appMode !== prevState.appMode) changed = true;

      activeRouteLayers.forEach((urlKey) => {
        const storeKey = LAYER_KEYS[urlKey];
        if (state[storeKey as keyof StoreState] !== prevState[storeKey as keyof StoreState]) {
          changed = true;
        }
      });

      if (changed) {
        syncUrl();
      }
    });

    return unsubscribe;
  }, [setSearchParams, location.pathname]);
}
