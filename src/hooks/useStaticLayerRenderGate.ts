import type { LatLngBounds } from 'leaflet';

import { MAP_ZOOM_CITY_STATIC_LAYERS_MIN } from '../components/Map/mapZoomConstants';
import { useMapViewport } from './useMapBounds';

/** Kept for call-site clarity (`city` vs `driving`); threshold is the same for both. */
type StaticLayerRenderGateVariant = 'city' | 'driving';

/**
 * City and driving static layers: skip rendering when zoomed out; when zoomed in,
 * use `bounds` to cull features outside the viewport.
 *
 * Detail appears when zoom is strictly greater than {@link MAP_ZOOM_CITY_STATIC_LAYERS_MIN}
 * (same wider city view as `/city`).
 */
export function useStaticLayerRenderGate(_options?: { variant?: StaticLayerRenderGateVariant }): {
  bounds: LatLngBounds;
  shouldRenderDetail: boolean;
} {
  const { bounds, zoom } = useMapViewport();
  const threshold = MAP_ZOOM_CITY_STATIC_LAYERS_MIN;
  return {
    bounds,
    shouldRenderDetail: zoom > threshold,
  };
}
