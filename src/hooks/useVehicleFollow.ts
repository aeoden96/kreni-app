import { useCallback, useEffect, useRef, useState } from 'react';

import type { ParsedTripUpdate, ParsedVehiclePosition } from '../utils/realtime';

type VehicleFocusState = null | {
  isFollowing: boolean;
  routeId: string;
  tripId: string;
};

/**
 * Manages vehicle focus/follow state for the route panel.
 *
 * The panel's appearance is a pure function of two facts held here:
 *  - a vehicle is focused when `vehicleFocus.tripId` is set (`activeTripId`)
 *  - the map is locked to it when `vehicleFocus.isFollowing` is true
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

  // Clear focus when the route changes, UNLESS the route change was triggered
  // by focusing a vehicle on that specific route.
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

  /**
   * Focus a vehicle. `follow` controls whether the map locks to it; when omitted
   * the current follow state is preserved (so switching vehicles keeps the lock).
   */
  const focusVehicle = useCallback(
    (tripId: string, opts?: { follow?: boolean; routeId?: string }) => {
      setVehicleFocus((prev) => {
        const routeId = opts?.routeId ?? selectedRouteId;
        if (!routeId) return prev;
        return { isFollowing: opts?.follow ?? prev?.isFollowing ?? false, routeId, tripId };
      });
    },
    [selectedRouteId]
  );

  /** Engage follow (map locks) for a focused vehicle. */
  const handleFollowStart = useCallback(
    (tripId: string) => {
      focusVehicle(tripId, { follow: true });
    },
    [focusVehicle]
  );

  /** Stop following but keep the vehicle focused (map drag or explicit stop button). */
  const handleStopFollowing = useCallback(() => {
    setVehicleFocus((prev) => (prev ? { ...prev, isFollowing: false } : null));
  }, []);

  /** Clear the focused vehicle, returning to the route overview and re-zooming to it. */
  const handleClearVehicleFocus = useCallback(() => {
    setVehicleFocus(null);
    setZoomToRouteTrigger(Date.now());
  }, []);

  return {
    activeTripId,
    focusVehicle,
    followedTripUpdate,
    followedVehicleParsedPos: followedRawPos,
    followedVehiclePos,
    handleClearVehicleFocus,
    handleFollowStart,
    handleStopFollowing,
    setVehicleFocus,
    vehicleFocus,
    zoomToRouteTrigger,
  };
}
