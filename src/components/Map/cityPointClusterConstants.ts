export const CITY_POINT_CLUSTER_LAYERS = [
  'fountains',
  'fountainsExtra',
  'wifi',
  'toilets',
  'restaurants',
  'markets',
  'gardens',
  'playgrounds',
  'sportsFacilities',
  'galleries',
  'dogParks',
  'evacuation',
  'cultural',
  'graffiti',
  'pharmacies',
  'healthHomes',
  'healthInst',
  'recycling',
] as const;

export type CityPointClusterLayerId = (typeof CITY_POINT_CLUSTER_LAYERS)[number];

/** Driving-mode point layers merged into {@link CityMergedClusterLayer} (polygons like parking zones stay separate). */
const DRIVING_POINT_CLUSTER_LAYERS = [
  'publicGarages',
  'electricCharging',
  'gasStations',
  'taxiStands',
  'surveillanceCameras',
] as const;

export type DrivingPointClusterLayerId = (typeof DRIVING_POINT_CLUSTER_LAYERS)[number];

/** Cycling-mode point layers merged into {@link CityMergedClusterLayer}. */
const CYCLING_POINT_CLUSTER_LAYERS = ['nextbikeStations', 'bikeParkings'] as const;

export type CyclingPointClusterLayerId = (typeof CYCLING_POINT_CLUSTER_LAYERS)[number];

export type MergedPointClusterLayerId =
  | CityPointClusterLayerId
  | CyclingPointClusterLayerId
  | DrivingPointClusterLayerId;

const MERGED_LAYER_ID_SET = new Set<string>([
  ...CITY_POINT_CLUSTER_LAYERS,
  ...CYCLING_POINT_CLUSTER_LAYERS,
  ...DRIVING_POINT_CLUSTER_LAYERS,
]);

export function isMergedPointClusterLayerId(id: string): id is MergedPointClusterLayerId {
  return MERGED_LAYER_ID_SET.has(id);
}

/** i18n key paths under default namespace (e.g. cityLayers.fountains.label). */
export const CITY_CLUSTER_LAYER_LABEL_KEYS: Record<CityPointClusterLayerId, string> = {
  cultural: 'cityLayers.cultural.label',
  dogParks: 'cityLayers.dogParks.label',
  evacuation: 'cityLayers.evacuation.label',
  fountains: 'cityLayers.fountains.label',
  fountainsExtra: 'cityLayers.fountainsExtra.label',
  galleries: 'cityLayers.galleries.label',
  gardens: 'cityLayers.gardens.label',
  graffiti: 'cityLayers.graffiti.label',
  healthHomes: 'cityLayers.healthHomes.label',
  healthInst: 'cityLayers.healthInst.label',
  markets: 'cityLayers.markets.label',
  pharmacies: 'cityLayers.pharmacies.label',
  playgrounds: 'cityLayers.playgrounds.label',
  recycling: 'cityLayers.recycling.label',
  restaurants: 'cityLayers.restaurants.label',
  sportsFacilities: 'cityLayers.sportsFacilities.label',
  toilets: 'cityLayers.toilets.label',
  wifi: 'cityLayers.wifi.label',
};

export const CITY_CLUSTER_INTERNAL_LAYER_KEY = '_cityClusterLayer';
export const CITY_CLUSTER_INTERNAL_STABLE_KEY = '_cityClusterKey';
