import type { MultiPolygon, Polygon, Position } from 'geojson';

type LatLngTuple = [number, number];

/** One closed ring per Leaflet polygon (exterior ring only; ignores holes). */
export function polygonExteriorsLatLngs(geometry: MultiPolygon | Polygon): LatLngTuple[][] {
  if (geometry.type === 'Polygon') {
    const outer = geometry.coordinates[0];
    if (!outer?.length) return [];
    return [ringToLatLngs(outer)];
  }
  return geometry.coordinates
    .map((poly) => poly[0])
    .filter((ring): ring is Position[] => Boolean(ring?.length))
    .map(ringToLatLngs);
}

/** Bounding-box center of all exterior rings (good enough for map icons). */
export function polygonGeometryBBoxCenterLatLng(
  geometry: MultiPolygon | Polygon
): LatLngTuple | null {
  const rings = polygonExteriorsLatLngs(geometry);
  const flat = rings.flat();
  if (flat.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const [lat, lng] of flat) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  return [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
}

function ringToLatLngs(ring: Position[]): LatLngTuple[] {
  return ring.map(([lng, lat]) => [lat, lng] as LatLngTuple);
}
