/**
 * Main Leaflet map component
 */

import { BaseMap } from './BaseMap';
import type { Stop, Route } from '../../utils/gtfs';
import type { VehiclePosition, AllVehiclePosition } from '../../utils/vehicles';
import { ZoomBasedStops } from './ZoomBasedStops';
import { RouteShape } from './RouteShape';
import { VehicleMarkers } from './VehicleMarkers';
import { AllVehicleMarkers } from './AllVehicleMarkers';
import { ParentStationZoomController } from './ParentStationZoomController';
import { OffScreenStopIndicator } from './OffScreenStopIndicator';
import { SpiderfierProvider } from './SpiderfierContext';
import { SpiderfierManager } from './SpiderfierManager';
import { RoadClosures } from './RoadClosures';
import { VehicleFollower } from './VehicleFollower';
import { CongestionHeatmap } from './CongestionHeatmap';
import { useRoadClosures } from '../../hooks/useRoadClosures';
import { useGTFSMode } from '../../contexts/GTFSModeContext';

import type { CongestionPoint } from '../../hooks/useCongestionData';


interface MapViewProps {
  parentStations: Stop[];
  platformStops: Stop[];
  parentChildCounts: Map<string, number>;
  selectedRouteId: string | null;
  selectedStopId: string | null;
  routeShapes: Record<string, [number, number][]>;
  routeStops: string[];
  orderedStops?: Record<string, string[]>;
  vehicles: VehiclePosition[];
  routeType: number | null;
  routeShortName?: string;
  onStopClick: (stopId: string) => void;
  onVehicleClick?: (routeId: string, routeType: number, tripId: string) => void;
  /** Called when a vehicle in the selected-route view is clicked (selects the trip for follow mode) */
  onVehicleSelect?: (tripId: string) => void;
  showAllVehicles?: boolean;
  showRoadClosures?: boolean;
  allVehicles?: AllVehiclePosition[];
  routesById: Map<string, Route>;
  serviceId: string | null;
  userLocation?: { lat: number; lon: number } | null;
  locationPanOffsetY?: number;
  parentStationZoomTarget: { lat: number; lon: number; zoom?: number; panOffsetY?: number } | null;
  onZoomComplete: () => void;
  /** Stop object for off-screen directional indicator */
  selectedStop?: Stop | null;
  onFlyToStop?: () => void;
  highlightStopIds?: string[];
  /** GPS position of the currently followed vehicle (enables auto-pan) */
  followedVehiclePos?: { lat: number; lon: number } | null;
  /** Called when user drags the map while following — parent should clear follow state */
  onFollowDisengage?: () => void;
  /** Live congestion data points to render */
  congestionPoints?: CongestionPoint[];
  /** Whether to show the congestion heatmap overlay */
  showCongestionHeatmap?: boolean;
}


export function MapView({
  parentStations,
  platformStops,
  parentChildCounts,
  selectedRouteId,
  selectedStopId,
  routeShapes,
  routeStops,
  orderedStops,
  vehicles,
  routeType,
  routeShortName,
  onStopClick,
  onVehicleClick,
  onVehicleSelect,
  showAllVehicles = false,
  showRoadClosures = false,
  allVehicles = [],
  routesById,
  userLocation,
  locationPanOffsetY = 0,
  // serviceId is declared in the interface for future use
  // but is not consumed by the map component directly
  parentStationZoomTarget,
  onZoomComplete,
  selectedStop,
  onFlyToStop,
  highlightStopIds,
  followedVehiclePos,
  onFollowDisengage,
  congestionPoints = [],
  showCongestionHeatmap = false,
}: MapViewProps) {
  // Fetch road closures if enabled
  const { closures } = useRoadClosures(showRoadClosures);
  const { initialZoom, minZoom } = useGTFSMode();

  return (
    <SpiderfierProvider>
      <BaseMap
        userLocation={userLocation}
        locationPanOffsetY={locationPanOffsetY}
        {...(initialZoom !== undefined ? { zoom: initialZoom } : {})}
        {...(minZoom !== undefined ? { minZoom } : {})}
      >
        <SpiderfierManager />

        <ParentStationZoomController
          zoomTarget={parentStationZoomTarget}
          panOffsetY={parentStationZoomTarget?.panOffsetY ?? 0}
          onZoomComplete={onZoomComplete}
        />

        {selectedStop && onFlyToStop && (
          <OffScreenStopIndicator stop={selectedStop} onFlyTo={onFlyToStop} />
        )}

        {showAllVehicles && (
          <ZoomBasedStops
            parentStations={parentStations}
            platformStops={platformStops}
            parentChildCounts={parentChildCounts}
            selectedStopId={selectedStopId}
            highlightStopIds={highlightStopIds ?? (selectedRouteId ? routeStops : [])}
            orderedStops={orderedStops}
            routesById={routesById}
            onStopClick={onStopClick}
          />
        )}


        {showAllVehicles && (
          <AllVehicleMarkers vehicles={allVehicles} onVehicleClick={onVehicleClick} />
        )}

        <RoadClosures show={showRoadClosures} closures={closures} />

        <CongestionHeatmap points={congestionPoints} show={showCongestionHeatmap} />

        {selectedRouteId && (
          <>
            <RouteShape
              shapes={routeShapes}
              routeType={routeType}
              orderedStops={orderedStops}
            />
            <VehicleMarkers
              vehicles={vehicles}
              routeType={routeType}
              routeShortName={routeShortName}
              onVehicleSelect={onVehicleSelect}
            />
          </>
        )}

        {followedVehiclePos && onFollowDisengage && (
          <VehicleFollower position={followedVehiclePos} onDisengage={onFollowDisengage} />
        )}
      </BaseMap>
    </SpiderfierProvider>
  );
}
