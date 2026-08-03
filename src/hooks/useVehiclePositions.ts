/**
 * Hook for providing vehicle positions for the selected route.
 *
 * Data comes from the GTFS Realtime proxy (realtimeStore).
 * Positions are GPS-based; the store is polled by useRealtimeData()
 * which must be called higher up in the tree.
 *
 * --- Schedule-based interpolation (replaced by realtime GPS) ---
 * The original implementation called getActiveVehicles() every 30 s to
 * compute lat/lon by interpolating along route shapes based on scheduled
 * stop times. It is kept commented out in vehicles.ts for reference.
 */

import { useMemo } from 'react';

import type { RouteActiveTripsData } from '../utils/gtfs';
import type { VehiclePosition } from '../utils/vehicles';

import { useRealtimeStore } from '../stores/realtimeStore';
import { createStaticTripResolver } from '../utils/staticTripResolver';
import { mapRealtimeToVehiclePositions } from '../utils/vehicles';

export function useVehiclePositions(
  /**
   * Selected route. Lets the markers render straight from the feed while
   * `activeTripsData` (a sizeable fetch) is still in flight — see
   * `mapRealtimeToVehiclePositions`.
   */
  routeId: null | string,
  activeTripsData: null | RouteActiveTripsData,
  /**
   * Today's service. Scopes the realtime → static trip ID resolution:
   * `route_active_trips` carries every service variant at once, so the resolver
   * has to be told which ones are live before it can key them.
   */
  serviceId: null | string,
  /** Yesterday's service — still owns trips running past midnight. */
  previousServiceId: null | string
): VehiclePosition[] {
  const vehiclePositions = useRealtimeStore((s) => s.vehiclePositions);
  const tripUpdates = useRealtimeStore((s) => s.tripUpdates);

  // Scalars rather than an array of them, so this memo keys on values a caller
  // cannot accidentally destabilise by rebuilding the array each render.
  const resolver = useMemo(
    () =>
      createStaticTripResolver(
        (activeTripsData?.trips ?? []).map((t) => t.id),
        [serviceId, previousServiceId]
      ),
    [activeTripsData, serviceId, previousServiceId]
  );

  return useMemo(() => {
    if (!routeId && !activeTripsData) return [];

    return mapRealtimeToVehiclePositions(
      vehiclePositions,
      tripUpdates,
      activeTripsData?.trips ?? [],
      routeId,
      resolver
    );
  }, [vehiclePositions, tripUpdates, activeTripsData, routeId, resolver]);
}
