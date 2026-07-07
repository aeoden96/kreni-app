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
import { PreviewVehicleZoomController } from './PreviewVehicleZoomController';
import { RouteShape } from './RouteShape';
import { RouteZoomController } from './RouteZoomController';
import { SpiderfierProvider } from './SpiderfierContext';
import { SpiderfierManager } from './SpiderfierManager';
import { VehicleFollower } from './VehicleFollower';
import { VehicleMarkers } from './VehicleMarkers';
import { ZoomBasedStops } from './ZoomBasedStops';

interface MapViewProps {
  allVehicles?: AllVehiclePosition[];
  autoZoomToRoute?: boolean;
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
  previewVehiclePos?: null | { lat: number; lon: number };
  previewVehicleTripId?: null | string;
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
  /** Pixel offset for vehicle follow pan — negative shifts vehicle lower on screen (mobile) */
  vehicleFollowOffsetY?: number;
  vehicles: VehiclePosition[];
  zoomTrigger?: number;
}

export function MapView({
  allVehicles = [],
  autoZoomToRoute = false,
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
  previewVehiclePos,
  previewVehicleTripId,
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
  vehicleFollowOffsetY = 0,
  vehicles,
  zoomTrigger,
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

        {autoZoomToRoute && (
          <RouteZoomController
            platformStops={platformStops}
            routeStops={routeStops}
            selectedRouteId={selectedRouteId}
            zoomTrigger={zoomTrigger}
          />
        )}

        <PreviewVehicleZoomController position={previewVehiclePos} tripId={previewVehicleTripId} />

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

        <AllVehicleMarkers
          onVehicleClick={onVehicleClick}
          vehicles={selectedRouteId ? [] : allVehicles}
        />

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
          <VehicleFollower
            onDisengage={onFollowDisengage}
            panOffsetY={vehicleFollowOffsetY}
            position={followedVehiclePos}
          />
        )}
      </BaseMap>
    </SpiderfierProvider>
  );
}
