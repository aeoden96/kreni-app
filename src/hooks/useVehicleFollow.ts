import { useCallback, useEffect, useRef, useState } from 'react';

import type { ParsedTripUpdate, ParsedVehiclePosition } from '../utils/realtime';

export type VehicleFocusState = null | {
  isFollowing: boolean;
  routeId: string;
  tripId: string;
  viewMode: 'full' | 'preview';
};

/**
 * Manages vehicle follow state and handlers.
 */
export function useVehicleFollow(
  selectedRouteId: null | string,
  vehiclePositions: Map<string, ParsedVehiclePosition>,
  tripUpdates: Map<string, ParsedTripUpdate>
) {
  const [vehicleFocus, setVehicleFocus] = useState<VehicleFocusState>(null);
  const [zoomToRouteTrigger, setZoomToRouteTrigger] = useState<number>(0);

  const vehicleFocusRef = useRef(vehicleFocus);
  useEffect(() => {
    vehicleFocusRef.current = vehicleFocus;
  }, [vehicleFocus]);

  // Clear follow mode when route changes, UNLESS the route change was triggered
  // by clicking a vehicle on that specific route.
  useEffect(() => {
    if (selectedRouteId && vehicleFocusRef.current?.routeId === selectedRouteId) return;
    setVehicleFocus(null);
  }, [selectedRouteId]);

  const activeTripId = vehicleFocus?.tripId ?? null;

  const followedRawPos = activeTripId ? (vehiclePositions.get(activeTripId) ?? null) : null;
  const followedVehiclePos = followedRawPos
    ? { lat: followedRawPos.latitude, lon: followedRawPos.longitude }
    : null;
  const followedTripUpdate = activeTripId ? (tripUpdates.get(activeTripId) ?? null) : null;

  const handleVehicleSelect = useCallback(
    (tripId: string, viewMode: 'full' | 'preview' = 'preview', explicitRouteId?: string) => {
      const targetRouteId = explicitRouteId || selectedRouteId;
      if (targetRouteId) {
        setVehicleFocus({
          isFollowing: viewMode === 'full',
          routeId: targetRouteId,
          tripId,
          viewMode,
        });
      }
    },
    [selectedRouteId]
  );

  const handleFollowStart = useCallback(
    (tripId: string) => {
      if (selectedRouteId) {
        setVehicleFocus({ isFollowing: true, routeId: selectedRouteId, tripId, viewMode: 'full' });
      }
    },
    [selectedRouteId]
  );

  const handleFollowDisengage = useCallback(() => {
    setVehicleFocus((prev) => (prev ? { ...prev, isFollowing: false } : null));
  }, []);

  const handleUnfollow = useCallback(() => {
    setVehicleFocus((prev) => (prev ? { ...prev, isFollowing: false } : null));
  }, []);

  /** Leave single-vehicle / follow UI and return to the route vehicle list. */
  const handleBackToRouteOverview = useCallback(() => {
    setVehicleFocus((prev) => (prev ? { ...prev, isFollowing: false, viewMode: 'preview' } : null));
    setZoomToRouteTrigger(Date.now());
  }, []);

  return {
    activeTripId,
    followedTripUpdate,
    followedVehicleParsedPos: followedRawPos,
    followedVehiclePos,
    handleBackToRouteOverview,
    handleFollowDisengage,
    handleFollowStart,
    handleUnfollow,
    handleVehicleSelect,
    setVehicleFocus,
    vehicleFocus,
    zoomToRouteTrigger,
  };
}
