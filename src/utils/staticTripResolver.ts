/**
 * Resolving a *realtime* trip ID against a *static* collection.
 *
 * This is the mirror image of {@link matchRealtime}, and the asymmetry is the
 * whole point. There, a static trip ID is looked up in a realtime map: the
 * realtime feed runs exactly one service at a time, so the publication-stable
 * key from {@link tripKey} is unique on its own and a flat index is safe.
 *
 * Here the pool is static data, which carries every service variant at once.
 * Route 6's `route_active_trips` file holds 2722 trips across 11 services and
 * 1241 of its 1481 keys collide. Indexing that wholesale would drop most keys
 * and leave the survivors arbitrary, so the pool is **scoped to one service
 * before it is keyed**, and services are consulted in order rather than merged.
 * Within a single service the key is unique (route 6: 291 trips, 291 keys, zero
 * collisions), which is the same guarantee `matchRealtime` relies on.
 *
 * Why this is needed at all: ZET's realtime feed emits trip IDs whose service
 * segment is `40` while the static feed publishes `4`–`14`, so an exact
 * `trip_id` join scores zero. `useStopDepartures` was taught to cope; the route
 * panel and the focused-vehicle itinerary were not, and silently rendered an
 * empty line while the map — which joins on `routeId` and needs no trip ID at
 * all — kept showing the same vehicles.
 */

import { tripKey } from './tripIdMatch';

export interface StaticTripResolver {
  /**
   * The static trip ID matching `realtimeTripId`, or `undefined`.
   *
   * Exact hits are returned unchanged, so once ZET republishes static and
   * realtime from the same feed this is a plain identity lookup again.
   */
  resolve: (realtimeTripId: string) => string | undefined;
}

/** A resolver that only ever matches exactly — the safe degenerate case. */
const EXACT_ONLY_EMPTY: StaticTripResolver = { resolve: () => undefined };

/**
 * Build a resolver over a set of static trip IDs.
 *
 * @param staticTripIds Every trip ID in the static collection being searched.
 * @param serviceIds Services to consider, **most specific first**. Today's
 *   service should lead; yesterday's belongs after it, since it still owns
 *   trips running past midnight (GTFS encodes those as ≥ 24:00 on the previous
 *   service day). `null` entries are ignored, and a resolver built with no
 *   usable service degrades to exact-only matching rather than guessing across
 *   the whole file.
 */
export function createStaticTripResolver(
  staticTripIds: Iterable<string>,
  serviceIds: readonly (null | string)[]
): StaticTripResolver {
  const wanted = serviceIds.filter((id): id is string => id !== null && id !== '');
  const known = new Set(staticTripIds);

  if (known.size === 0) return EXACT_ONLY_EMPTY;
  if (wanted.length === 0) {
    return { resolve: (id) => (known.has(id) ? id : undefined) };
  }

  // One index per service, never a merged one: merging is what reintroduces the
  // cross-service collisions this module exists to avoid.
  const perService = wanted.map((serviceId) => {
    const prefix = `${serviceId}_`;
    const index = new Map<string, string>();
    const collided = new Set<string>();

    for (const staticTripId of known) {
      if (!staticTripId.startsWith(prefix)) continue;
      const key = tripKey(staticTripId);
      if (key === null) continue;
      // Unreachable for well-formed two-segment service IDs: the prefix plus the
      // key is the entire trip ID, so a second entry would have to be the same
      // string. Kept because a caller passing a truncated prefix would otherwise
      // pair vehicles with an arbitrary service, and a wrong vehicle on a line is
      // worse than a missing one.
      if (index.has(key)) {
        collided.add(key);
        continue;
      }
      index.set(key, staticTripId);
    }
    for (const key of collided) index.delete(key);

    return index;
  });

  return {
    resolve(realtimeTripId) {
      if (known.has(realtimeTripId)) return realtimeTripId;

      const key = tripKey(realtimeTripId);
      if (key === null) return undefined;

      for (const index of perService) {
        const hit = index.get(key);
        if (hit !== undefined) return hit;
      }
      return undefined;
    },
  };
}
