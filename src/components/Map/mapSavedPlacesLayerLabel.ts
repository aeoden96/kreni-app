import type { MapFavouriteLayerId, MapFavouriteScope } from '../../types/mapPlaceFavourite';

import { CITY_CLUSTER_LAYER_LABEL_KEYS } from './cityPointClusterConstants';

const DRIVING_SAVED_LABEL_KEYS: Partial<Record<MapFavouriteLayerId, string>> = {
  electricCharging: 'drivingLayers.ev.label',
  gasStations: 'drivingLayers.gasStations.label',
  publicGarages: 'drivingLayers.garages.label',
  surveillanceCameras: 'drivingLayers.cameras.label',
  taxiStands: 'drivingLayers.taxi.label',
};

/** i18n key (default namespace) for a saved place’s layer chip. */
export function mapSavedPlaceLayerLabelKey(
  scope: MapFavouriteScope,
  layerId: MapFavouriteLayerId
): string {
  if (scope === 'cycling' && layerId === 'bikeParkings') {
    return 'cyclingLayers.bikeParkings.label';
  }
  if (scope === 'cycling' && layerId === 'nextbikeStations') {
    return 'cyclingLayers.bikeStations.label';
  }
  if (scope === 'driving') {
    return DRIVING_SAVED_LABEL_KEYS[layerId] ?? String(layerId);
  }
  if (layerId === 'publicArchitectureCompetitions') {
    return 'cityLayers.architectureCompetitions.label';
  }
  const k = layerId as keyof typeof CITY_CLUSTER_LAYER_LABEL_KEYS;
  return CITY_CLUSTER_LAYER_LABEL_KEYS[k] ?? String(layerId);
}
