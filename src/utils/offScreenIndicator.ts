/**
 * Map viewport → screen: linear lat/lon projection and ray vs inset-rectangle
 * for the off-screen stop arrow (see OffScreenStopIndicator).
 */

export const OFF_SCREEN_INDICATOR_MARGIN_PX = 52;

export interface OffScreenIndicatorPosition {
  /** CSS rotation in degrees — 0 = up (north), clockwise */
  angle: number;
  x: number;
  y: number;
}

interface MapViewportBounds {
  east: number;
  north: number;
  south: number;
  west: number;
}

/**
 * If the stop lies outside the map bounds as projected onto a W×H pixel frame,
 * returns screen position and arrow angle toward the stop; otherwise null.
 *
 * @param marginPx - inset from each edge (default {@link OFF_SCREEN_INDICATOR_MARGIN_PX})
 */
export function computeOffScreenIndicator(
  lat: number,
  lon: number,
  bounds: MapViewportBounds,
  width: number,
  height: number,
  marginPx: number = OFF_SCREEN_INDICATOR_MARGIN_PX
): null | OffScreenIndicatorPosition {
  const { east, north, south, west } = bounds;
  const latSpan = north - south;
  const lonSpan = east - west;
  if (latSpan === 0 || lonSpan === 0) return null;

  const sx = ((lon - west) / lonSpan) * width;
  const sy = ((north - lat) / latSpan) * height;

  if (sx >= 0 && sx <= width && sy >= 0 && sy <= height) return null;

  const cx = width / 2;
  const cy = height / 2;
  const dx = sx - cx;
  const dy = sy - cy;

  if (dx === 0 && dy === 0) return null;

  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;

  const minX = marginPx;
  const maxX = width - marginPx;
  const minY = marginPx;
  const maxY = height - marginPx;

  let t = Infinity;
  if (dx > 0) t = Math.min(t, (maxX - cx) / dx);
  if (dx < 0) t = Math.min(t, (minX - cx) / dx);
  if (dy > 0) t = Math.min(t, (maxY - cy) / dy);
  if (dy < 0) t = Math.min(t, (minY - cy) / dy);

  if (!isFinite(t) || t <= 0) return null;

  return {
    angle,
    x: Math.round(cx + t * dx),
    y: Math.round(cy + t * dy),
  };
}
