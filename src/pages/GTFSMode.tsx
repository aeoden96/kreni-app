/**
 * Unified GTFS transit page, shared between Public-Transport (bus/tram) and
 * Train modes.  All mode-specific behaviour is controlled by the
 * GTFSModeConfig that is injected via props and published on GTFSModeContext
 * so that leaf components (StopInfoBar, StopModal) can read dataDir without
 * prop-drilling.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { trackEvent } from '../utils/analytics';
import { Search, X, Train } from 'lucide-react';
import { useSelectionParams } from '../hooks/useSelectionParams';
import type { DirectionFilter } from '../hooks/useSelectionParams';
import { MapView } from '../components/Map/MapView';
import { SearchModal } from '../components/common/SearchModal';
import { RouteModal } from '../components/common/RouteModal';
import { StopModal } from '../components/common/StopModal';
import { StopInfoBar } from '../components/common/StopInfoBar';
import { RouteInfoBar } from '../components/common/RouteInfoBar';
import { VehicleFollowBar } from '../components/common/VehicleFollowBar';
import { DebugPanel } from '../components/common/DebugPanel';
import { OnboardingWizard } from '../components/common/OnboardingWizard';
import { NearbyStopsModal } from '../components/common/NearbyStopsModal';
import { RealtimeStatusPanel } from '../components/common/RealtimeStatusPanel';
import type { RealtimeStatusPanelHandle } from '../components/common/RealtimeStatusPanel';
import { useInitialData } from '../hooks/useInitialData';
import { useCurrentService } from '../hooks/useCurrentService';
import { useRouteData } from '../hooks/useRouteData';
import { useSettingsStore } from '../stores/settingsStore';
import { useRealtimeStore } from '../stores/realtimeStore';
import { useAllVehiclePositions } from '../hooks/useAllVehiclePositions';
import { useVehiclePositions } from '../hooks/useVehiclePositions';
import { useRealtimeData } from '../hooks/useRealtimeData';
import { useRealtimeFreshness } from '../hooks/useRealtimeFreshness';
import { useVehicleFollow } from '../hooks/useVehicleFollow';
import { useMapPanTarget } from '../hooks/useMapPanTarget';
import { useGeolocation } from '../hooks/useGeolocation';
import { GTFSModeProvider } from '../contexts/GTFSModeContext';
import { useRssServiceAlerts } from '../hooks/useRssServiceAlerts';
import { useCongestionData } from '../hooks/useCongestionData';
import type { GTFSModeConfig } from '../config/modes';

interface GTFSModeProps {
  config: GTFSModeConfig;
}

export function GTFSMode({ config }: GTFSModeProps) {
  // Modal states
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);

  const realtimePanelRef = useRef<RealtimeStatusPanelHandle>(null);
  /** Close Legend and "tehnički detalji" when user performs other actions (stop click, location, etc.) */
  const closeLegendAndDetails = useCallback(() => {
    realtimePanelRef.current?.closeLegends();
  }, []);

  // URL-backed selection state (route, stop, direction)
  const {
    selectedRouteId,
    selectedStopId,
    directionFilter,
    selectRoute,
    clearRoute,
    selectStop,
    clearStop,
  } = useSelectionParams();

  // Settings — realtime-only settings are ignored in train mode
  const showAllVehiclesFromStore = useSettingsStore((s) => s.showAllVehicles);
  const showRoadClosuresFromStore = useSettingsStore((s) => s.showRoadClosures);
  const mapZoom = useSettingsStore((s) => s.mapZoom);
  const { addRecentRoute, addRecentStop } = useSettingsStore();

  // In train mode there is no "hide all vehicles" toggle — stops are always visible.
  const showAllVehicles = config.hasRealtime ? showAllVehiclesFromStore : true;
  const showRoadClosures = config.hasRealtime && showRoadClosuresFromStore;
  const showCongestionHeatmap = false; // useSettingsStore((s) => s.showCongestionHeatmap);

  // Load initial data from the mode's data directory
  const {
    stops,
    routes,
    stopsById,
    routesById,
    groupedParentStations,
    calendar,
    loading: initialLoading,
    error: initialError,
  } = useInitialData({ dataDir: config.dataDir });

  // Separate parent stations and platform stops for zoom-based rendering
  const parentStations = stops.filter((stop) => stop.locationType === 1);
  const platformStops = stops.filter((stop) => stop.locationType === 0);

  const parentChildCounts = new Map<string, number>();
  parentStations.forEach((parent) => {
    parentChildCounts.set(
      parent.id,
      platformStops.filter((s) => s.parentStation === parent.id).length,
    );
  });

  const {
    parentStationZoomTarget,
    handleZoomComplete,
    handleStopClickFromMap,
    handleSelectStop,
    handleSelectStopFromNearby,
    setParentStationZoomTarget,
  } = useMapPanTarget({
    stops,
    stopsById,
    groupedParentStations,
    config,
    selectStop,
    addRecentStop,
    setNearbyOpen,
    closeLegendAndDetails,
  });

  const serviceId = useCurrentService(calendar);

  // Load route-specific data
  const { shapes, routeStops, orderedStops, activeTripsData, loading: routeLoading } =
    useRouteData(selectedRouteId, { dataDir: config.dataDir });

  // Scheduled vehicle positions (transit only; null activeTripsData yields [])
  const vehicles = useVehiclePositions(
    config.hasRealtime ? activeTripsData : null,
    serviceId,
  );

  // Realtime GTFS-RT polling (no-op when disabled)
  const { error: _realtimeError, stats: realtimeStats } = useRealtimeData(
    config.hasRealtime && showAllVehicles,
  );
  const gtfsRtAlerts = useRealtimeStore((s) => s.serviceAlerts);
  const lastUpdate = useRealtimeStore((s) => s.lastUpdate);
  const workerTimestamp = useRealtimeStore((s) => s.workerTimestamp);
  const cacheStatus = useRealtimeStore((s) => s.cacheStatus);
  const fetchLatencyMs = useRealtimeStore((s) => (s as any).fetchLatencyMs);
  const vehiclePositions = useRealtimeStore((s) => s.vehiclePositions);
  const tripUpdates = useRealtimeStore((s) => s.tripUpdates);

  const { timeAgoStr, feedAgeStr } = useRealtimeFreshness(config, lastUpdate, realtimeStats ?? null);

  const {
    lastClickedVehicle,
    setLastClickedVehicle,
    followedVehicleTripId,
    followedVehiclePos,
    followedVehicleParsedPos,
    followedTripUpdate,
    handleVehicleSelect,
    handleFollowStart,
    handleFollowDisengage,
    handleUnfollow,
  } = useVehicleFollow(selectedRouteId, vehiclePositions, tripUpdates);

  // RSS-parsed ZET service alerts (polled by GitHub Actions cron every 30 min)
  const rssAlerts = useRssServiceAlerts(routesById);
  const serviceAlerts = [...rssAlerts, ...gtfsRtAlerts];

  // Congestion heatmap (tram-only, transit mode only)
  const { congestionPoints } = useCongestionData({
    enabled: config.hasRealtime && showCongestionHeatmap,
    stopsById,
    routesById,
  });

  // All-vehicles overlay (transit only)
  const { vehicles: allVehicles } =
    useAllVehiclePositions(
      config.hasRealtime && showAllVehicles,
      serviceId,
      routesById,
    );

  const selectedRouteType = selectedRouteId
    ? (routesById.get(selectedRouteId)?.type ?? null)
    : null;

  // Geolocation
  const onLocateSuccess = useCallback(
    (_lat: number, _lon: number) => {
      clearStop();
      closeLegendAndDetails();
      setNearbyOpen(true);
    },
    [clearStop, closeLegendAndDetails],
  );
  const { userLocation, locateError } = useGeolocation(onLocateSuccess);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectRoute = (
    routeId: string,
    _routeType: number,
    df?: DirectionFilter | 'all',
    tripId?: string,
  ) => {
    const dir: DirectionFilter = df === 'A' || df === 'B' ? df : 'A';
    if (tripId) {
      trackEvent('vehicle_clicked', { route_id: routeId, trip_id: tripId });
    }
    selectRoute(routeId, { dir });
    setSearchModalOpen(false);
    closeLegendAndDetails();
    addRecentRoute(routeId);
    if (tripId) setLastClickedVehicle({ routeId, tripId });
    setRouteModalOpen(false);
    setStopModalOpen(false);
  };

  const handleExpandStop = (stopId: string) => {
    closeLegendAndDetails();
    const stop = stopsById.get(stopId);
    if (stop && stop.locationType === 1) {
      const childPlatform = stops.find(
        (s) => s.parentStation === stopId && s.locationType === 0,
      );
      selectStop(childPlatform ? childPlatform.id : stopId);
    } else {
      selectStop(stopId);
    }
    addRecentStop(stopId);
    setStopModalOpen(true);
  };

  const handleStopClickFromRoute = (stopId: string) => {
    closeLegendAndDetails();
    selectStop(stopId);
    setRouteModalOpen(false);
  };

  const handleRouteClickFromStop = (routeId: string, _routeType: number) => {
    selectRoute(routeId);
    setStopModalOpen(false);
    setRouteModalOpen(false);
  };

  const handleExpandRoute = () => setRouteModalOpen(true);
  const handleCloseRoute = () => setRouteModalOpen(false);
  const handleClearRoute = () => clearRoute();

  const handleCloseStop = () => {
    setStopModalOpen(false);
  };

  const handleCloseStopInfo = () => clearStop();

  // ── Derived ───────────────────────────────────────────────────────────────


  const activeHighlightStopIds = useMemo(
    () => (selectedRouteId && routeStops ? routeStops : []),
    [selectedRouteId, routeStops],
  );

  const selectedRoute = selectedRouteId ? routesById.get(selectedRouteId) : null;
  const selectedStop = selectedStopId ? stopsById.get(selectedStopId) : null;

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (initialLoading) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <div className="mt-4">{config.loadingText}</div>
        </div>
      </div>
    );
  }

  if (initialError) {
    return (
      <div className="min-h-svh flex items-center justify-center p-4">
        <div className="alert alert-error max-w-md">
          <span>Greška pri učitavanju podataka: {initialError.message}</span>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <GTFSModeProvider config={config}>
      <div className="h-svh w-screen overflow-hidden relative">
        {/* Full-screen map */}
        <MapView
          parentStations={parentStations}
          platformStops={platformStops}
          parentChildCounts={parentChildCounts}
          selectedRouteId={selectedRouteId}
          selectedStopId={selectedStopId}
          routeShapes={shapes}
          routeStops={routeStops}
          orderedStops={orderedStops}
          vehicles={vehicles}
          routeType={selectedRouteType}
          routeShortName={selectedRoute?.shortName}
          onStopClick={handleStopClickFromMap}
          onVehicleClick={(routeId, routeType, tripId) => handleSelectRoute(routeId, routeType, undefined, tripId)}
          showAllVehicles={showAllVehicles}
          showRoadClosures={showRoadClosures}
          allVehicles={
            showAllVehicles && selectedRouteId
              ? allVehicles.filter((v) => v.routeId === selectedRouteId)
              : allVehicles
          }
          routesById={routesById}
          serviceId={serviceId}
          userLocation={userLocation}
          locationPanOffsetY={nearbyOpen && typeof window !== 'undefined' && window.innerWidth < 640 ? -Math.round(window.innerHeight / 4) : 0}
          parentStationZoomTarget={parentStationZoomTarget}
          onZoomComplete={handleZoomComplete}
          selectedStop={selectedStop && !stopModalOpen ? selectedStop : null}
          onFlyToStop={
            selectedStop
              ? () =>
                setParentStationZoomTarget({
                  lat: selectedStop.lat,
                  lon: selectedStop.lon,
                  zoom: config.stopZoom,
                  panOffsetY:
                    typeof window !== 'undefined' && window.innerWidth < 640
                      ? -Math.round(window.innerHeight / 4)
                      : 0,
                })
              : undefined
          }
          highlightStopIds={activeHighlightStopIds}
          onVehicleSelect={handleVehicleSelect}
          followedVehiclePos={followedVehiclePos}
          onFollowDisengage={handleFollowDisengage}
          congestionPoints={congestionPoints}
          showCongestionHeatmap={config.hasRealtime && showCongestionHeatmap}
        />

        {/* Route loading indicator */}
        {routeLoading && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000]">
            <div className="alert alert-info py-2 px-4 shadow-lg">
              <span className="loading loading-spinner loading-sm"></span>
              <span>Učitavanje rute...</span>
            </div>
          </div>
        )}

        {/* Realtime status badges (transit only) */}
        {config.hasRealtime && showAllVehicles && realtimeStats && (
          <RealtimeStatusPanel
            ref={realtimePanelRef}
            alerts={serviceAlerts}
            routesById={routesById}
            selectedRouteId={selectedRouteId}
            onRouteClick={(routeId, routeType) => handleSelectRoute(routeId, routeType)}
            realtimeStats={realtimeStats}
            timeAgoStr={timeAgoStr}
            feedAgeStr={feedAgeStr}
            workerTimestamp={workerTimestamp}
            fetchLatencyMs={fetchLatencyMs}
            lastUpdate={lastUpdate}
            cacheStatus={cacheStatus}
          />
        )}

        {/* Low-zoom hint when vehicles and stops are hidden (transit only) */}
        {config.hasRealtime && showAllVehicles && mapZoom <= 14 && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000]">
            <div className="badge badge-neutral gap-2 shadow text-xs sm:text-sm opacity-90">
              <span className="w-2 h-2 rounded-full bg-base-content/60" />
              Zumiraj za prikaz stanica i vozila
            </div>
          </div>
        )}

        {/* No-realtime notice (train mode) */}
        {!config.hasRealtime && (
          <div className="absolute bottom-6 right-4 z-[1000]">
            <div className="badge badge-neutral gap-1.5 shadow text-[11px] opacity-80">
              <Train className="w-3 h-3" />
              Live praćenje vlakova nije dostupno
            </div>
          </div>
        )}

        {/* Congestion summary badge */}
        {/* GUŽVE functionality hidden for now
        {config.hasRealtime && showCongestionHeatmap && congestionSummary && (
          <div className="absolute bottom-6 left-4 z-[1000]">
            <div className="bg-base-100/90 backdrop-blur-sm rounded-xl shadow-lg border border-base-200 px-3 py-2 text-xs space-y-1 max-w-52">
              <div className="font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                Zagušenja tramvaja
              </div>
              <div className="text-base-content/70">
                Prosj. kašnjenje: <span className="font-semibold text-base-content">{Math.round(congestionSummary.averageDelay / 60)} min</span>
              </div>
              <div className="text-base-content/70">
                {congestionSummary.stopsWithData} stanica s podacima
              </div>
              {(congestionSummary.severeCount > 0 || congestionSummary.highCount > 0) && (
                <div className="text-error font-semibold">
                  {congestionSummary.severeCount + congestionSummary.highCount} kritičnih stanica
                </div>
              )}
            </div>
          </div>
        )}
        */}

        {/* Route Info Bar / Vehicle Follow Bar */}
        {selectedRoute && !routeModalOpen && !stopModalOpen && (
          followedVehicleTripId ? (
            <VehicleFollowBar
              route={selectedRoute}
              vehiclePos={followedVehicleParsedPos}
              tripUpdate={followedTripUpdate}
              stopsById={stopsById}
              onUnfollow={handleUnfollow}
              onExpand={handleExpandRoute}
            />
          ) : (
            <RouteInfoBar
              route={selectedRoute}
              vehicles={vehicles}
              orderedStops={orderedStops}
              stopsById={stopsById}
              onExpand={handleExpandRoute}
              onClose={handleClearRoute}
              followCandidateTripId={lastClickedVehicle?.routeId === selectedRouteId ? lastClickedVehicle.tripId : null}
              onFollowStart={handleFollowStart}
            />
          )
        )}

        {/* Stop Info Bar */}
        {selectedStop && !stopModalOpen && (
          <StopInfoBar
            stop={selectedStop}
            routesById={routesById}
            stopsById={stopsById}
            onExpand={handleExpandStop}
            onClose={handleCloseStopInfo}
            onStopSelect={handleSelectStop}
            stackBelow={!!(selectedRoute && !routeModalOpen)}
          />
        )}

        {/* Floating search bar */}
        {showAllVehicles && (
          <div className="absolute top-2 left-2 right-32 sm:left-4 sm:right-auto sm:top-4 z-[1000]">
            <div className="w-full sm:w-80 flex items-center gap-2 bg-base-100 rounded-xl px-4 py-3 shadow-lg">
              <button
                onClick={() => { trackEvent('search_opened'); setSearchModalOpen(true); }}
                className="flex-1 flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
              >
                <Search className="w-5 h-5 text-base-content/50 shrink-0" />
                {selectedRoute && routeModalOpen ? (
                  <span className="text-sm flex-1">
                    <span
                      className="badge font-bold mr-2 text-white"
                      style={{ backgroundColor: selectedRoute.type === 0 ? '#2563eb' : '#d97706' }}
                    >
                      {selectedRoute.shortName}
                    </span>
                    <span className="text-base-content/70">{selectedRoute.longName}</span>
                  </span>
                ) : (
                  <span className="text-base-content/50 text-sm flex-1">
                    {config.searchPlaceholder}
                  </span>
                )}
              </button>
              {selectedRoute && routeModalOpen && (
                <button
                  onClick={handleClearRoute}
                  className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
                  aria-label="Očisti odabir"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Locate error toast */}
        {locateError && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1300]">
            <div className="alert alert-error py-2 px-4 shadow-lg text-xs max-w-72 text-center">
              <span>{locateError}</span>
            </div>
          </div>
        )}

        {/* Debug panel (transit only) */}
        {config.hasRealtime && (
          <DebugPanel
            selectedStopId={selectedStopId}
            stopsById={stopsById}
            routesById={routesById}
          />
        )}

        {/* Search Modal */}
        <SearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          routes={routes}
          stops={stops}
          stopsById={stopsById}
          onSelectRoute={handleSelectRoute}
          onSelectStop={handleSelectStop}
        />

        {/* Route Modal */}
        {selectedRoute && (
          <RouteModal
            isOpen={routeModalOpen}
            route={selectedRoute}
            routeStops={routeStops}
            orderedStops={orderedStops}
            stopsById={stopsById}
            vehicles={vehicles}
            initialDirectionFilter={directionFilter}
            onClose={handleCloseRoute}
            onStopClick={handleStopClickFromRoute}
          />
        )}

        {/* Stop Modal */}
        {selectedStop && (
          <StopModal
            isOpen={stopModalOpen}
            stop={selectedStop}
            routesById={routesById}
            stopsById={stopsById}
            onClose={handleCloseStop}
            onRouteClick={handleRouteClickFromStop}
            onStopSelect={handleSelectStop}
          />
        )}

        {/* Nearby Stops Modal */}
        {userLocation && (
          <NearbyStopsModal
            isOpen={nearbyOpen}
            userLat={userLocation.lat}
            userLon={userLocation.lon}
            stops={platformStops}
            onClose={() => {
              setNearbyOpen(false);
            }}
            onSelectStop={handleSelectStopFromNearby}
          />
        )}

        {/* Onboarding Wizard */}
        <OnboardingWizard variant={config.onboardingVariant} />
      </div>
    </GTFSModeProvider>
  );
}
