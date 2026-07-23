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
import { mapRealtimeToVehiclePositions } from '../utils/vehicles';

export function useVehiclePositions(
  /**
   * Selected route. Lets the markers render straight from the feed while
   * `activeTripsData` (a sizeable fetch) is still in flight — see
   * `mapRealtimeToVehiclePositions`.
   */
  routeId: null | string,
  activeTripsData: null | RouteActiveTripsData,
  // serviceId kept in signature for API compatibility; filtering is now done
  // by matching tripIds from the realtime feed against the route's trip list.
  _serviceId: null | string
): VehiclePosition[] {
  const vehiclePositions = useRealtimeStore((s) => s.vehiclePositions);
  const tripUpdates = useRealtimeStore((s) => s.tripUpdates);

  return useMemo(() => {
    if (!routeId && !activeTripsData) return [];

    return mapRealtimeToVehiclePositions(
      vehiclePositions,
      tripUpdates,
      activeTripsData?.trips ?? [],
      routeId
    );
  }, [vehiclePositions, tripUpdates, activeTripsData, routeId]);
}
