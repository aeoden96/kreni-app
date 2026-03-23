import { useCallback, useEffect, useState } from 'react';

import type { ParsedTripUpdate, ParsedVehiclePosition } from '../utils/realtime';

/**
 * Manages vehicle follow state and handlers. When the user selects a vehicle
 * and taps "Follow", the map auto-centers on it. Clears follow mode when the
 * route changes.
 */
export function useVehicleFollow(
  selectedRouteId: null | string,
  vehiclePositions: Map<string, ParsedVehiclePosition>,
  tripUpdates: Map<string, ParsedTripUpdate>
) {
  const [lastClickedVehicle, setLastClickedVehicle] = useState<null | {
    routeId: string;
    tripId: string;
  }>(null);
  const [followedVehicleTripId, setFollowedVehicleTripId] = useState<null | string>(null);

  // Clear follow mode when route changes.
  // lastClickedVehicle is intentionally NOT cleared here — it's already gated
  // by routeId === selectedRouteId in the render, and clearing it here creates
  // a race condition that wipes it before the RouteInfoBar can display the follow button.
  useEffect(() => {
    setFollowedVehicleTripId(null);
  }, [selectedRouteId]);

  const followedRawPos = followedVehicleTripId
    ? (vehiclePositions.get(followedVehicleTripId) ?? null)
    : null;
  const followedVehiclePos = followedRawPos
    ? { lat: followedRawPos.latitude, lon: followedRawPos.longitude }
    : null;
  const followedTripUpdate = followedVehicleTripId
    ? (tripUpdates.get(followedVehicleTripId) ?? null)
    : null;

  const handleVehicleSelect = useCallback(
    (tripId: string) => {
      if (selectedRouteId) setLastClickedVehicle({ routeId: selectedRouteId, tripId });
    },
    [selectedRouteId]
  );

  const handleFollowStart = useCallback((tripId: string) => {
    setFollowedVehicleTripId(tripId);
  }, []);

  const handleFollowDisengage = useCallback(() => {
    setFollowedVehicleTripId(null);
  }, []);

  const handleUnfollow = useCallback(() => {
    setFollowedVehicleTripId(null);
  }, []);

  return {
    followedTripUpdate,
    followedVehicleParsedPos: followedRawPos,
    followedVehiclePos,
    followedVehicleTripId,
    handleFollowDisengage,
    handleFollowStart,
    handleUnfollow,
    handleVehicleSelect,
    lastClickedVehicle,
    setLastClickedVehicle,
  };
}
