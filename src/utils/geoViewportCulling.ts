import type { MultiPolygon, Polygon } from 'geojson';
import type { LatLngBounds } from 'leaflet';

import L from 'leaflet';

import { polygonExteriorsLatLngs } from './geoJsonPolygonLeaflet';

/** GeoJSON Point coordinates `[lng, lat]`. */
export function geoJsonLngLatInMapBounds(
  mapBounds: LatLngBounds,
  lngLat: [number, number]
): boolean {
  const [lng, lat] = lngLat;
  return mapBounds.contains([lat, lng]);
}

/** Positions as `[lat, lng][]` (Leaflet / road closures). */
export function latLngPolylineIntersectsMapBounds(
  mapBounds: LatLngBounds,
  positions: [number, number][]
): boolean {
  if (positions.length === 0) return false;
  const bounds = L.latLngBounds([0, 0], [0, 0]);
  let has = false;
  for (const [lat, lng] of positions) {
    if (!has) {
      bounds.extend([lat, lng]);
      has = true;
    } else {
      bounds.extend([lat, lng]);
    }
  }
  if (!bounds.isValid()) return false;
  return mapBounds.intersects(bounds);
}

/** GeoJSON outer ring: `[lng, lat][]`. */
export function parkingOuterRingIntersectsMapBounds(
  mapBounds: LatLngBounds,
  ring: [number, number][]
): boolean {
  if (ring.length === 0) return false;
  const bounds = L.latLngBounds([0, 0], [0, 0]);
  let has = false;
  for (const [lng, lat] of ring) {
    if (!has) {
      bounds.extend([lat, lng]);
      has = true;
    } else {
      bounds.extend([lat, lng]);
    }
  }
  if (!bounds.isValid()) return false;
  return mapBounds.intersects(bounds);
}

export function polygonGeometryIntersectsMapBounds(
  mapBounds: LatLngBounds,
  geometry: MultiPolygon | Polygon
): boolean {
  const fb = polygonGeometryLatLngBounds(geometry);
  if (!fb.isValid()) return false;
  return mapBounds.intersects(fb);
}

/** Bounding box for Polygon / MultiPolygon (exterior rings only). */
function polygonGeometryLatLngBounds(geometry: MultiPolygon | Polygon): LatLngBounds {
  const parts = polygonExteriorsLatLngs(geometry);
  const bounds = L.latLngBounds([0, 0], [0, 0]);
  let has = false;
  for (const ring of parts) {
    for (const [lat, lng] of ring) {
      if (!has) {
        bounds.extend([lat, lng]);
        has = true;
      } else {
        bounds.extend([lat, lng]);
      }
    }
  }
  return bounds;
}
