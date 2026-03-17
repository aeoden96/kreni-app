import { useState, useCallback } from 'react';
import type { GTFSModeConfig } from '../config/modes';
import type { Stop } from '../utils/gtfs';

/** Vertical pixel offset to shift a stop marker below the top StopInfoBar overlay on mobile. */
function stopSelectPanOffsetY(): number {
  if (typeof window === 'undefined' || window.innerWidth >= 640) return 0;
  return -Math.round(window.innerHeight / 4);
}

export interface MapPanTarget {
  lat: number;
  lon: number;
  zoom?: number;
  panOffsetY?: number;
}

export interface UseMapPanTargetDeps {
  stops: Stop[];
  stopsById: Map<string, Stop>;
  config: GTFSModeConfig;
  selectStop: (stopId: string) => void;
  addRecentStop: (stopId: string) => void;
  setNearbyOpen: (open: boolean) => void;
  closeLegendAndDetails: () => void;
}

/**
 * Manages the map fly-to target and all stop-click routing logic. When the user
 * selects a stop (from map, search, nearby, etc.), computes the pan target with
 * mobile offset and triggers MapView to fly to it.
 */
export function useMapPanTarget(deps: UseMapPanTargetDeps) {
  const {
    stops,
    stopsById,
    config,
    selectStop,
    addRecentStop,
    setNearbyOpen,
    closeLegendAndDetails,
  } = deps;

  const [parentStationZoomTarget, setParentStationZoomTarget] = useState<MapPanTarget | null>(null);

  const handleZoomComplete = useCallback(() => setParentStationZoomTarget(null), []);

  const handleStopClickFromMap = useCallback(
    (stopId: string) => {
      closeLegendAndDetails();
      setNearbyOpen(false);
      const stop = stopsById.get(stopId);
      if (stop && stop.locationType === 1) {
        setParentStationZoomTarget({
          lat: stop.lat,
          lon: stop.lon,
          zoom: config.stopZoom,
          panOffsetY: stopSelectPanOffsetY(),
        });
        const childPlatform = stops.find(
          (s) => s.parentStation === stopId && s.locationType === 0,
        );
        selectStop(childPlatform ? childPlatform.id : stopId);
      } else {
        selectStop(stopId);
        addRecentStop(stopId);
      }
    },
    [
      stops,
      stopsById,
      config.stopZoom,
      selectStop,
      addRecentStop,
      closeLegendAndDetails,
      setNearbyOpen,
    ],
  );

  const handleSelectStop = useCallback(
    (stopId: string) => {
      setNearbyOpen(false);
      closeLegendAndDetails();
      const stop = stopsById.get(stopId);
      selectStop(stopId);
      addRecentStop(stopId);
      if (stop) {
        setParentStationZoomTarget({
          lat: stop.lat,
          lon: stop.lon,
          zoom: config.stopZoom,
          panOffsetY: stopSelectPanOffsetY(),
        });
      }
    },
    [selectStop, stopsById, addRecentStop, config.stopZoom, closeLegendAndDetails, setNearbyOpen],
  );

  /** Same as handleSelectStop but offsets the map so the stop lands in the
   *  bottom-half centre on mobile (where the top-half is occupied by the
   *  nearby-stops list). */
  const handleSelectStopFromNearby = useCallback(
    (stopId: string) => {
      setNearbyOpen(false);
      closeLegendAndDetails();
      const stop = stopsById.get(stopId);
      selectStop(stopId);
      addRecentStop(stopId);
      if (stop) {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
        const panOffsetY = isMobile ? -Math.round(window.innerHeight / 4) : 0;
        setParentStationZoomTarget({
          lat: stop.lat,
          lon: stop.lon,
          zoom: config.stopZoom,
          panOffsetY,
        });
      }
    },
    [selectStop, stopsById, addRecentStop, config.stopZoom, closeLegendAndDetails, setNearbyOpen],
  );

  return {
    parentStationZoomTarget,
    handleZoomComplete,
    handleStopClickFromMap,
    handleSelectStop,
    handleSelectStopFromNearby,
    setParentStationZoomTarget,
  };
}
