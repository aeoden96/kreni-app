/**
 * Main Leaflet map component
 */

import type { CongestionPoint } from '../../hooks/useCongestionData';
import type { Route, Stop } from '../../utils/gtfs';
import type { AllVehiclePosition, VehiclePosition } from '../../utils/vehicles';

import { useGTFSMode } from '../../contexts/GTFSModeContext';
import { AllVehicleMarkers } from './AllVehicleMarkers';
import { BaseMap } from './BaseMap';
import { CongestionHeatmap } from './CongestionHeatmap';
import { OffScreenStopIndicator } from './OffScreenStopIndicator';
import { ParentStationZoomController } from './ParentStationZoomController';
import { RouteShape } from './RouteShape';
import { SpiderfierProvider } from './SpiderfierContext';
import { SpiderfierManager } from './SpiderfierManager';
import { VehicleFollower } from './VehicleFollower';
import { VehicleMarkers } from './VehicleMarkers';
import { ZoomBasedStops } from './ZoomBasedStops';

interface MapViewProps {
  allVehicles?: AllVehiclePosition[];
  /** Live congestion data points to render */
  congestionPoints?: CongestionPoint[];
  /** GPS position of the currently followed vehicle (enables auto-pan) */
  followedVehiclePos?: null | { lat: number; lon: number };
  highlightStopIds?: string[];
  locationPanOffsetY?: number;
  onFlyToStop?: () => void;
  /** Called when user drags the map while following — parent should clear follow state */
  onFollowDisengage?: () => void;
  onStopClick: (stopId: string) => void;
  onVehicleClick?: (routeId: string, routeType: number, tripId: string) => void;
  /** Called when a vehicle in the selected-route view is clicked (selects the trip for follow mode) */
  onVehicleSelect?: (tripId: string) => void;
  onZoomComplete: () => void;
  orderedStops?: Record<string, string[]>;
  parentChildCounts: Map<string, number>;
  parentStations: Stop[];
  parentStationZoomTarget: null | { lat: number; lon: number; panOffsetY?: number; zoom?: number };
  platformStops: Stop[];
  routesById: Map<string, Route>;
  routeShapes: Record<string, [number, number][]>;
  routeShortName?: string;
  routeStops: string[];
  routeType: null | number;
  selectedRouteId: null | string;
  /** Stop object for off-screen directional indicator */
  selectedStop?: null | Stop;
  selectedStopId: null | string;
  serviceId: null | string;
  /** Whether to show the congestion heatmap overlay */
  showCongestionHeatmap?: boolean;
  userLocation?: null | { lat: number; lon: number };
  vehicles: VehiclePosition[];
}

export function MapView({
  allVehicles = [],
  congestionPoints = [],
  followedVehiclePos,
  highlightStopIds,
  locationPanOffsetY = 0,
  onFlyToStop,
  onFollowDisengage,
  onStopClick,
  onVehicleClick,
  onVehicleSelect,
  onZoomComplete,
  orderedStops,
  parentChildCounts,
  parentStations,
  // serviceId is declared in the interface for future use
  // but is not consumed by the map component directly
  parentStationZoomTarget,
  platformStops,
  routesById,
  routeShapes,
  routeShortName,
  routeStops,
  routeType,
  selectedRouteId,
  selectedStop,
  selectedStopId,
  showCongestionHeatmap = false,
  userLocation,
  vehicles,
}: MapViewProps) {
  const { initialZoom, minZoom } = useGTFSMode();

  return (
    <SpiderfierProvider>
      <BaseMap
        locationPanOffsetY={locationPanOffsetY}
        userLocation={userLocation}
        {...(initialZoom !== undefined ? { zoom: initialZoom } : {})}
        {...(minZoom !== undefined ? { minZoom } : {})}
      >
        <SpiderfierManager />

        <ParentStationZoomController
          onZoomComplete={onZoomComplete}
          panOffsetY={parentStationZoomTarget?.panOffsetY ?? 0}
          zoomTarget={parentStationZoomTarget}
        />

        {selectedStop && onFlyToStop && (
          <OffScreenStopIndicator onFlyTo={onFlyToStop} stop={selectedStop} />
        )}

        <ZoomBasedStops
          highlightStopIds={highlightStopIds ?? (selectedRouteId ? routeStops : [])}
          onStopClick={onStopClick}
          orderedStops={orderedStops}
          parentChildCounts={parentChildCounts}
          parentStations={parentStations}
          platformStops={platformStops}
          routesById={routesById}
          selectedStopId={selectedStopId}
        />

        <AllVehicleMarkers onVehicleClick={onVehicleClick} vehicles={allVehicles} />

        <CongestionHeatmap points={congestionPoints} show={showCongestionHeatmap} />

        {selectedRouteId && (
          <>
            <RouteShape orderedStops={orderedStops} routeType={routeType} shapes={routeShapes} />
            <VehicleMarkers
              onVehicleSelect={onVehicleSelect}
              routeShortName={routeShortName}
              routeType={routeType}
              vehicles={vehicles}
            />
          </>
        )}

        {followedVehiclePos && onFollowDisengage && (
          <VehicleFollower onDisengage={onFollowDisengage} position={followedVehiclePos} />
        )}
      </BaseMap>
    </SpiderfierProvider>
  );
}
