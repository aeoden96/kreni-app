import type { MapFavouriteLayerId, MapFavouriteScope } from '../types/mapPlaceFavourite';

import { firstStringProp } from './geojsonPropertyPick';

/** Stable id for persistence and deduplication. Prefer sourceId when the dataset provides one. */
export function makeMapPlaceFavouriteId(
  scope: MapFavouriteScope,
  layerId: MapFavouriteLayerId,
  lng: number,
  lat: number,
  sourceId?: null | string
): string {
  if (sourceId != null && sourceId !== '') {
    return `${scope}:${layerId}:src:${sourceId}`;
  }
  return `${scope}:${layerId}:${normCoord(lng)}:${normCoord(lat)}`;
}

export function parseTitleForFavourite(title: unknown): string {
  if (typeof title === 'string' && title.trim() !== '') return title.trim();
  return 'Place';
}

function normCoord(n: number): string {
  return n.toFixed(5);
}

const SOURCE_ID_KEYS = [
  'OBJECTID_1',
  'OBJECTID',
  'objectid',
  'ObjectID',
  'FID',
  'fid',
  'id',
  'ID',
  'UID',
  'uid',
];

/** Prefer explicit extractor from the map layer; fallback to generic keys. */
export function defaultGetSourceIdForLayer(
  layerId: MapFavouriteLayerId,
  properties: null | Record<string, unknown> | undefined
): string | undefined {
  return extractMapFavouriteSourceId(layerId, properties);
}

/** Best-effort stable id from GeoJSON properties (used with coord fallback in makeMapPlaceFavouriteId). */
export function extractMapFavouriteSourceId(
  _layerId: MapFavouriteLayerId,
  properties: null | Record<string, unknown> | undefined
): string | undefined {
  if (!properties || typeof properties !== 'object') return undefined;
  return firstStringProp(properties, SOURCE_ID_KEYS);
}
