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

/** Primary brand colour for a route_type (hex). */
export function routeTypeColor(routeType: null | number | undefined): string {
  if (routeType === 0) return '#2563eb'; // tram — blue
  if (routeType === 2) return '#dc2626'; // rail — red
  if (routeType === 3) return '#d97706'; // bus — amber
  return '#475569'; // mixed / unknown — slate
}
