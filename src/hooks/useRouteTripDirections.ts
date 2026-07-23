import { useEffect, useState } from 'react';

import { fetchRouteActiveTrips } from '../utils/gtfs';

/**
 * Maps each of a route's tripIds to its GTFS direction_id (0 or 1).
 *
 * The realtime vehicle feed carries no usable direction (bearing/speed are also
 * unreliable on this provider), so the per-route trip index is the authoritative
 * source — the same lookup the single-route view uses to label vehicles. Callers
 * gate the fetch with `enabled` (typically "does this route have live vehicles
 * right now"), so no network happens for routes with nothing to place. The file
 * is cached, and it's the same one the route detail view loads on tap.
 *
 * Returns an empty map while loading or on failure.
 */
export function useRouteTripDirections(
  routeId: string,
  enabled: boolean,
  dataDir = 'data'
): Map<string, number> {
  const [directions, setDirections] = useState<Map<string, number>>(() => new Map());

  useEffect(() => {
    if (!enabled) {
      setDirections(new Map());
      return;
    }
    let cancelled = false;
    fetchRouteActiveTrips(routeId, dataDir)
      .then((data) => {
        if (cancelled) return;
        setDirections(new Map(data.trips.map((trip) => [trip.id, trip.direction])));
      })
      .catch(() => {
        if (cancelled) return;
        setDirections(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [routeId, enabled, dataDir]);

  return directions;
}
