/**
 * Shared brand colour for GTFS route_type values.
 *
 * Keeps the tram / rail / bus colour decision in one place so badges render
 * consistently across the route panels, stop bars, and search results. The
 * colours match index 0 of each palette in getDirectionColor().
 *
 * route_type: 0 = tram, 2 = rail, 3 = bus.
 *
 * Icons stay inline at each call site (`type === 3 ? Bus : Train`): lint's
 * react-hooks/static-components rule can't see through a helper that returns a
 * component, so a stable ternary is the clean way to pick the glyph.
 */
import { isNightRoute } from './nightLines';

/** Primary brand colour for a route_type (hex). */
export function routeTypeColor(routeType: null | number | undefined): string {
  if (routeType === 0) return '#2563eb'; // tram — blue
  if (routeType === 2) return '#dc2626'; // rail — red
  if (routeType === 3) return '#d97706'; // bus — amber
  return '#475569'; // mixed / unknown — slate
}

/** Badge colour for night lines — deep indigo, well clear of the tram blue. */
export const NIGHT_ROUTE_COLOR = '#312e81';

/**
 * Night colour for map vehicle markers. Lighter than NIGHT_ROUTE_COLOR because
 * markers sit directly on the basemap — indigo-900 all but disappears into the
 * dark theme, which is exactly when night trams are running.
 */
export const NIGHT_VEHICLE_COLOR = '#6366f1';

/**
 * Badge colour for a specific route: the route_type colour, except that night
 * lines get their own night hue. Prefer this over routeTypeColor() wherever a
 * whole route is being badged; routeTypeColor() stays the right call when only
 * the type is known (mixed route lists, direction palettes).
 */
export function routeBadgeColor(route: { shortName: string; type: number }): string {
  return isNightRoute(route) ? NIGHT_ROUTE_COLOR : routeTypeColor(route.type);
}
