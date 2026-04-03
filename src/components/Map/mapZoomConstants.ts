/**
 * Hard cap for Leaflet zoom in {@link BaseMap}; city clustering uses maxZoom − 1 so at this level only points show.
 */
export const MAP_LEAFLET_MAX_ZOOM = 18;

/**
 * Transit (realtime) map: the low-zoom hint badge is shown when zoom is at or
 * below this value; platform stops are hidden in the same range (train mode
 * ignores this via alwaysShowStops).
 */
export const MAP_ZOOM_TRANSIT_STOPS_HINT_THRESHOLD = 15;

/**
 * Reference zoom for transit stop hints and other UI aligned with “zoom 15” behaviour.
 * City/driving static detail uses {@link MAP_ZOOM_CITY_STATIC_LAYERS_MIN} (derived from this value).
 */
const MAP_ZOOM_STATIC_LAYERS_MIN = MAP_ZOOM_TRANSIT_STOPS_HINT_THRESHOLD;

/**
 * City and driving map overlays (points, polygons, clusters, road closures): detail when
 * zoom is strictly greater than this value — wider view than transit’s zoom-15 hint range.
 */
export const MAP_ZOOM_CITY_STATIC_LAYERS_MIN = MAP_ZOOM_STATIC_LAYERS_MIN - 4;
