import { useCallback } from 'react';

import { useGeolocation } from './useGeolocation';

export function useRideHailingDeepLinks() {
  const { userLocation } = useGeolocation();

  const getLinks = useCallback(
    (stopLat: number, stopLon: number, stopName: string, mode: 'departure' | 'destination') => {
      const safeStopName = encodeURIComponent(stopName);

      if (mode === 'departure') {
        // Stop is departure
        return {
          bolt: `https://bolt.me/?pickup_lat=${stopLat}&pickup_lng=${stopLon}`,
          uber: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${stopLat}&pickup[longitude]=${stopLon}&pickup[nickname]=${safeStopName}`,
        };
      } else {
        // Stop is destination, try to fill departure with GPS if available
        if (userLocation) {
          return {
            bolt: `https://bolt.me/?pickup_lat=${userLocation.lat}&pickup_lng=${userLocation.lon}&dropoff_lat=${stopLat}&dropoff_lng=${stopLon}`,
            uber: `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${stopLat}&dropoff[longitude]=${stopLon}&dropoff[nickname]=${safeStopName}`,
          };
        } else {
          return {
            // Bolt defaults to my_location if you only provide dropoff
            bolt: `https://bolt.me/?dropoff_lat=${stopLat}&dropoff_lng=${stopLon}`,
            uber: `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${stopLat}&dropoff[longitude]=${stopLon}&dropoff[nickname]=${safeStopName}`,
          };
        }
      }
    },
    [userLocation]
  );

  return { getLinks };
}
