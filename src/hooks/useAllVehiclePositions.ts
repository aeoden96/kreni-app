/**
 * Hook for providing all-routes vehicle positions.
 *
 * Data comes from the GTFS Realtime proxy (realtimeStore).
 * Returns the same { vehicles, loading, error } shape as before.
 *
 * --- Schedule-based interpolation (replaced by realtime GPS) ---
 * The original implementation fetched all_active_trips.json once, cached it in a
 * ref, then called getAllActiveVehicles() every 30 s via setInterval. The function
 * is kept commented out in vehicles.ts for reference.
 */

import { useMemo } from 'react';
import type { Route } from '../utils/gtfs';
import type { AllVehiclePosition } from '../utils/vehicles';
import { mapRealtimeToAllVehiclePositions } from '../utils/vehicles';
import { useRealtimeStore } from '../stores/realtimeStore';

export function useAllVehiclePositions(
  enabled: boolean,
  // serviceId kept in signature for API compatibility
  _serviceId: string | null,
  routesById?: Map<string, Route>
) {
  const vehiclePositions = useRealtimeStore((s) => s.vehiclePositions);
  const tripUpdates = useRealtimeStore((s) => s.tripUpdates);
  const loading = useRealtimeStore((s) => s.loading);
  const error = useRealtimeStore((s) => s.error);

  const vehicles = useMemo((): AllVehiclePosition[] => {
    if (!enabled || !routesById) return [];

    return mapRealtimeToAllVehiclePositions(
      vehiclePositions,
      tripUpdates,
      routesById
    );
  }, [enabled, vehiclePositions, tripUpdates, routesById]);

  return { vehicles, loading, error };
}
