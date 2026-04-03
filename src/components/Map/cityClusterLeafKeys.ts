import { CITY_CLUSTER_INTERNAL_STABLE_KEY } from './cityPointClusterConstants';

export function cityClusterLeafMarkerKey(properties: Record<string, unknown>): string {
  const k = properties[CITY_CLUSTER_INTERNAL_STABLE_KEY];
  return typeof k === 'string' ? k : 'leaf-unknown';
}
