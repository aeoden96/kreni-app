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

/**
 * All-vehicles layer: fully opaque at or above this zoom, fully hidden at or
 * below {@link MAP_ZOOM_TRANSIT_STOPS_HINT_THRESHOLD} — which is the layer's fade
 * floor, so there is no separate constant for it.
 *
 * Deliberately aligned with that threshold: the hint badge promises "zoom in to
 * show stops and individual vehicles", so individual icons must not already be on
 * screen while it is up. It is also what keeps the layer cheap — one zoom step out
 * roughly quadruples the viewport area, and with the whole fleet inside it the
 * marker count (and its per-poll DOM churn) is what makes low zoom levels stutter.
 *
 * Below this range the fleet is not gone, only aggregated: {@link VehicleClusterLayer}
 * renders it as counted bubbles, which is bounded by cluster count rather than
 * fleet size and so avoids the churn described above.
 */
export const MAP_ZOOM_VEHICLES_FADE_MAX = MAP_ZOOM_TRANSIT_STOPS_HINT_THRESHOLD + 1;
