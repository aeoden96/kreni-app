/**
 * Render route shape polylines on the map
 */

import { Polyline } from 'react-leaflet';

import { getDirectionColor } from './directionColors';

interface RouteShapeProps {
  /** Optional ordered stops mapping (direction -> stop ids) — unused here but accepted for future use */
  orderedStops?: Record<string, string[]>;
  routeType: null | number;
  shapes: Record<string, [number, number][]>;
}

export function RouteShape({ routeType, shapes }: RouteShapeProps) {
  // Determine unique suffixes (e.g. shape ids like "1_1", "1_2") and map to palette indexes
  const suffixes: string[] = [];
  const suffixMap: Record<string, number> = {};
  Object.keys(shapes).forEach((shapeId) => {
    const m = shapeId.match(/_([^_]+)$/);
    const suf = m ? m[1] : shapeId;
    if (!Object.hasOwn(suffixMap, suf)) {
      suffixMap[suf] = suffixes.length;
      suffixes.push(suf);
    }
  });

  return (
    <>
      {Object.entries(shapes).map(([shapeId, coordinates]) => {
        const m = shapeId.match(/_([^_]+)$/);
        const suf = m ? m[1] : shapeId;
        const idx = suffixMap[suf] ?? 0;
        const color = getDirectionColor(routeType, idx);

        return (
          <Polyline
            key={shapeId}
            pathOptions={{
              className: 'route-polyline',
              color,
              opacity: 0.8,
              weight: 4,
            }}
            positions={coordinates}
          />
        );
      })}
    </>
  );
}
