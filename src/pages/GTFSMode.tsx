/**
 * Unified GTFS transit page, shared between Public-Transport (bus/tram) and
 * Train modes.  All mode-specific behaviour is controlled by the
 * GTFSModeConfig that is injected via props and published on GTFSModeContext
 * so that leaf components (StopInfoBar, StopModal) can read dataDir without
 * prop-drilling.
 */

import { Search, Train, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { RealtimeStatusPanelHandle } from '../components/common/RealtimeStatusPanel';
import type { GTFSModeConfig } from '../config/modes';
import type { DirectionFilter } from '../hooks/useSelectionParams';

import { DebugPanel } from '../components/common/DebugPanel';
import { NearbyStopsModal } from '../components/common/NearbyStopsModal';
import { OnboardingWizard } from '../components/common/OnboardingWizard';
import { RealtimeStatusPanel } from '../components/common/RealtimeStatusPanel';
import { RouteInfoBar } from '../components/common/RouteInfoBar';
import { RouteModal } from '../components/common/RouteModal';
import { SearchModal } from '../components/common/SearchModal';
import { StopInfoBar } from '../components/common/StopInfoBar';
import { StopModal } from '../components/common/StopModal';
import { ZetAppLogoLink } from '../components/common/ZetAppLogoLink';
import { MapView } from '../components/Map/MapView';
import { MAP_ZOOM_TRANSIT_STOPS_HINT_THRESHOLD } from '../components/Map/mapZoomConstants';
import { GTFSModeProvider } from '../contexts/GTFSModeContext';
import { useAllVehiclePositions } from '../hooks/useAllVehiclePositions';
import { useCongestionData } from '../hooks/useCongestionData';
import { useCurrentService } from '../hooks/useCurrentService';
import { useGeolocation, useRegisterGeolocationFirstFix } from '../hooks/useGeolocation';
import { useInitialData } from '../hooks/useInitialData';
import { useMapPanTarget } from '../hooks/useMapPanTarget';
import { useRealtimeData } from '../hooks/useRealtimeData';
import { useRealtimeFreshness } from '../hooks/useRealtimeFreshness';
import { useRouteData } from '../hooks/useRouteData';
import { useRouteTimetable } from '../hooks/useRouteTimetable';
import { useRssServiceAlerts } from '../hooks/useRssServiceAlerts';
import { useSelectionParams } from '../hooks/useSelectionParams';
import { useVehicleFollow } from '../hooks/useVehicleFollow';
import { useVehiclePositions } from '../hooks/useVehiclePositions';
import { useNavigationStore } from '../stores/navigationStore';
import { useRealtimeStore } from '../stores/realtimeStore';
import { useSettingsStore } from '../stores/settingsStore';
import { trackEvent } from '../utils/analytics';

interface GTFSModeProps {
  config: GTFSModeConfig;
}

export function GTFSMode({ config }: GTFSModeProps) {
  const { t } = useTranslation();
  // Modal states
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [nearbyStopsListExpanded, setNearbyStopsListExpanded] = useState(false);

  const setNearbyPanelOpen = useCallback((open: boolean) => {
    setNearbyOpen(open);
    if (!open) {
      setNearbyStopsListExpanded(false);
    }
  }, []);

  const realtimePanelRef = useRef<RealtimeStatusPanelHandle>(null);
  /** Close Legend and "tehnički detalji" when user performs other actions (stop click, location, etc.) */
  const closeLegendAndDetails = useCallback(() => {
    realtimePanelRef.current?.closeLegends();
  }, []);

  // URL-backed selection state (route, stop, direction)
  const {
    clearRoute,
    clearStop,
    directionFilter,
    selectedRouteId,
    selectedStopId,
    selectRoute,
    selectStop,
  } = useSelectionParams();

  const mapZoom = useSettingsStore((s) => s.mapZoom);
  const sandboxVisible = useSettingsStore((s) => s.sandboxVisible);
  const { addRecentRoute, addRecentStop } = useSettingsStore();

  const showCongestionHeatmap = false; // useSettingsStore((s) => s.showCongestionHeatmap);

  // Load initial data from the mode's data directory
  const {
    calendar,
    error: initialError,
    loading: initialLoading,
    routes,
    routesById,
    stops,
    stopsById,
  } = useInitialData({ dataDir: config.dataDir });

  // Separate parent stations and platform stops for zoom-based rendering
  const parentStations = stops.filter((stop) => stop.locationType === 1);
  const platformStops = stops.filter((stop) => stop.locationType === 0);

  const parentChildCounts = new Map<string, number>();
  parentStations.forEach((parent) => {
    parentChildCounts.set(
      parent.id,
      platformStops.filter((s) => s.parentStation === parent.id).length
    );
  });

  const {
    handleSelectStop,
    handleSelectStopFromNearby,
    handleStopClickFromMap,
    handleZoomComplete,
    parentStationZoomTarget,
    setParentStationZoomTarget,
  } = useMapPanTarget({
    addRecentStop,
    closeLegendAndDetails,
    config,
    selectStop,
    setNearbyOpen: setNearbyPanelOpen,
    stops,
    stopsById,
  });

  const serviceId = useCurrentService(calendar);

  // Load route-specific data
  const {
    activeTripsData,
    loading: routeLoading,
    orderedStops,
    routeStops,
    shapes,
  } = useRouteData(selectedRouteId, { dataDir: config.dataDir });

  // Load per-trip stop sequence + times for the "next stops" feature
  const routeTimetable = useRouteTimetable(selectedRouteId, config.dataDir);

  // Scheduled vehicle positions (transit only; null activeTripsData yields [])
  const vehicles = useVehiclePositions(config.hasRealtime ? activeTripsData : null, serviceId);

  // Realtime GTFS-RT polling (no-op when disabled)
  const {
    error: _realtimeError,
    loading: realtimeLoading,
    nextPollAtMs,
    stats: realtimeStats,
  } = useRealtimeData(config.hasRealtime);
  const gtfsRtAlerts = useRealtimeStore((s) => s.serviceAlerts);
  const lastUpdate = useRealtimeStore((s) => s.lastUpdate);
  const workerTimestamp = useRealtimeStore((s) => s.workerTimestamp);
  const cacheStatus = useRealtimeStore((s) => s.cacheStatus);
  const cacheAgeSeconds = useRealtimeStore((s) => s.cacheAgeSeconds);
  const fetchLatencyMs = useRealtimeStore((s) => s.fetchLatencyMs);
  const vehiclePositions = useRealtimeStore((s) => s.vehiclePositions);
  const tripUpdates = useRealtimeStore((s) => s.tripUpdates);

  const { feedAgeStr, timeAgoStr } = useRealtimeFreshness(
    config,
    lastUpdate,
    realtimeStats ?? null
  );

  const {
    followedTripUpdate,
    followedVehicleParsedPos,
    followedVehiclePos,
    followedVehicleTripId,
    handleBackToRouteOverview,
    handleFollowDisengage,
    handleFollowStart,
    handleUnfollow,
    handleVehicleSelect,
    lastClickedVehicle,
    setLastClickedVehicle,
  } = useVehicleFollow(selectedRouteId, vehiclePositions, tripUpdates);

  // RSS-parsed ZET service alerts (polled by GitHub Actions cron every 30 min)
  const rssAlerts = useRssServiceAlerts(routesById);
  const serviceAlerts = [...rssAlerts, ...gtfsRtAlerts];

  // Congestion heatmap (tram-only, transit mode only)
  const { congestionPoints } = useCongestionData({
    enabled: config.hasRealtime && showCongestionHeatmap,
    routesById,
    stopsById,
  });

  // All-vehicles overlay (transit only)
  const { vehicles: allVehicles } = useAllVehiclePositions(
    config.hasRealtime,
    serviceId,
    routesById
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
      setNearbyStopsListExpanded(false);
    },
    [clearStop, closeLegendAndDetails]
  );
  useRegisterGeolocationFirstFix(onLocateSuccess);
  const { locateError, userLocation } = useGeolocation();

  const triggerLocate = useNavigationStore((s) => s.triggerLocate);
  const prevNearbyListExpandedRef = useRef(false);

  /** After expanding the nearby list on mobile, re-fly so the user marker clears the sheet. */
  useEffect(() => {
    if (!nearbyOpen || !userLocation) {
      prevNearbyListExpandedRef.current = nearbyStopsListExpanded;
      return;
    }
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    if (!isMobile) {
      prevNearbyListExpandedRef.current = nearbyStopsListExpanded;
      return;
    }
    if (nearbyStopsListExpanded && !prevNearbyListExpandedRef.current) {
      triggerLocate();
    }
    prevNearbyListExpandedRef.current = nearbyStopsListExpanded;
  }, [nearbyOpen, nearbyStopsListExpanded, userLocation, triggerLocate]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectRoute = (
    routeId: string,
    _routeType: number,
    df?: 'all' | DirectionFilter,
    tripId?: string
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
      const childPlatform = stops.find((s) => s.parentStation === stopId && s.locationType === 0);
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
    [selectedRouteId, routeStops]
  );

  const selectedRoute = selectedRouteId ? routesById.get(selectedRouteId) : null;
  const selectedStop = selectedStopId ? stopsById.get(selectedStopId) : null;

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (initialLoading) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg" />
          <div className="mt-4">{t(`gtfs.${config.loadingI18nKey}`)}</div>
        </div>
      </div>
    );
  }

  if (initialError) {
    return (
      <div className="min-h-svh flex items-center justify-center p-4">
        <div className="alert alert-error max-w-md">
          <span>{t('gtfs.initialError', { message: initialError.message })}</span>
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
          allVehicles={
            selectedRouteId ? allVehicles.filter((v) => v.routeId !== selectedRouteId) : allVehicles
          }
          congestionPoints={congestionPoints}
          followedVehiclePos={followedVehiclePos}
          highlightStopIds={activeHighlightStopIds}
          locationPanOffsetY={
            nearbyOpen &&
            nearbyStopsListExpanded &&
            typeof window !== 'undefined' &&
            window.innerWidth < 640
              ? -Math.round(window.innerHeight / 4)
              : 0
          }
          onFlyToStop={
            selectedStop
              ? () =>
                  setParentStationZoomTarget({
                    lat: selectedStop.lat,
                    lon: selectedStop.lon,
                    panOffsetY:
                      typeof window !== 'undefined' && window.innerWidth < 640
                        ? -Math.round(window.innerHeight / 4)
                        : 0,
                    zoom: config.stopZoom,
                  })
              : undefined
          }
          onFollowDisengage={handleFollowDisengage}
          onStopClick={handleStopClickFromMap}
          onVehicleClick={(routeId, routeType, tripId) =>
            handleSelectRoute(routeId, routeType, undefined, tripId)
          }
          onVehicleSelect={handleVehicleSelect}
          onZoomComplete={handleZoomComplete}
          orderedStops={orderedStops}
          parentChildCounts={parentChildCounts}
          parentStations={parentStations}
          parentStationZoomTarget={parentStationZoomTarget}
          platformStops={platformStops}
          routesById={routesById}
          routeShapes={shapes}
          routeShortName={selectedRoute?.shortName}
          routeStops={routeStops}
          routeType={selectedRouteType}
          selectedRouteId={selectedRouteId}
          selectedStop={selectedStop && !stopModalOpen ? selectedStop : null}
          selectedStopId={selectedStopId}
          serviceId={serviceId}
          showCongestionHeatmap={config.hasRealtime && showCongestionHeatmap}
          userLocation={userLocation}
          vehicles={vehicles}
        />

        {/* Route loading indicator */}
        {routeLoading && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000]">
            <div className="alert alert-info py-2 px-4 shadow-lg">
              <span className="loading loading-spinner loading-sm" />
              <span>{t('gtfs.loadingRoute')}</span>
            </div>
          </div>
        )}

        {/* Realtime status badges + ZET app link (transit only); z above Leaflet bottom chrome */}
        {config.id === 'transit' && (
          <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[1100] flex items-center justify-end gap-2">
            {config.hasRealtime && realtimeStats && (
              <RealtimeStatusPanel
                alerts={serviceAlerts}
                cacheAgeSeconds={cacheAgeSeconds}
                cacheStatus={cacheStatus}
                feedAgeStr={feedAgeStr}
                fetchLatencyMs={fetchLatencyMs}
                lastUpdate={lastUpdate}
                nextPollAtMs={nextPollAtMs}
                onRouteClick={(routeId, routeType) => handleSelectRoute(routeId, routeType)}
                realtimeLoading={realtimeLoading}
                realtimeStats={realtimeStats}
                ref={realtimePanelRef}
                routesById={routesById}
                selectedRouteId={selectedRouteId}
                timeAgoStr={timeAgoStr}
                workerTimestamp={workerTimestamp}
              />
            )}
            <ZetAppLogoLink
              className="btn btn-circle btn-sm min-h-8 min-w-8 size-8 shrink-0 border-none bg-base-100 p-0 shadow transition-[box-shadow,transform,filter] duration-200 ring-1 ring-base-300/60 hover:ring-primary/55 hover:brightness-110 active:scale-95"
              imgClassName="size-full rounded-full object-cover"
            />
          </div>
        )}

        {/* Low-zoom hint when vehicles and stops are hidden (transit only) */}
        {config.hasRealtime && mapZoom <= MAP_ZOOM_TRANSIT_STOPS_HINT_THRESHOLD && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000]">
            <div className="badge badge-neutral gap-2 shadow text-xs sm:text-sm opacity-90 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-base-content/60" />
              {t('gtfs.zoomForStopsAndVehicles')}
            </div>
          </div>
        )}

        {/* No-realtime notice (train mode) */}
        {!config.hasRealtime && (
          <div className="absolute bottom-6 right-4 z-[1000]">
            <div className="badge badge-neutral gap-1.5 shadow text-[11px] opacity-80">
              <Train className="w-3 h-3" />
              {t('gtfs.trainNoLiveTracking')}
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

        {/* Route Info Bar */}
        {selectedRoute &&
          !routeModalOpen &&
          !stopModalOpen &&
          !selectedStopId &&
          (() => {
            const isFollowing = !!followedVehicleTripId;
            const clickedTripId =
              lastClickedVehicle?.routeId === selectedRouteId ? lastClickedVehicle.tripId : null;
            // When following, surface the followed vehicle's data; otherwise the clicked vehicle's
            const activeTripId = isFollowing ? followedVehicleTripId : clickedTripId;
            const activeVehicle = activeTripId
              ? (vehicles.find((v) => v.tripId === activeTripId) ?? null)
              : null;
            const activeVehiclePos = isFollowing
              ? followedVehicleParsedPos
              : clickedTripId
                ? (vehiclePositions.get(clickedTripId) ?? null)
                : null;
            const activeTripUpdate = isFollowing
              ? followedTripUpdate
              : clickedTripId
                ? (tripUpdates.get(clickedTripId) ?? null)
                : null;
            return (
              <RouteInfoBar
                clickedTripUpdate={activeTripUpdate}
                clickedVehicle={activeVehicle}
                clickedVehiclePos={activeVehiclePos}
                followCandidateTripId={isFollowing ? null : clickedTripId}
                followedVehiclePos={followedVehicleParsedPos}
                isFollowing={isFollowing}
                onBackToRouteOverview={handleBackToRouteOverview}
                onClose={handleClearRoute}
                onExpand={handleExpandRoute}
                onFollowStart={handleFollowStart}
                onUnfollow={handleUnfollow}
                onVehicleSelect={handleVehicleSelect}
                orderedStops={orderedStops}
                route={selectedRoute}
                routeTimetable={routeTimetable}
                stopsById={stopsById}
                tripUpdates={tripUpdates}
                vehiclePositions={vehiclePositions}
                vehicles={vehicles}
              />
            );
          })()}

        {/* Stop Info Bar */}
        {selectedStop && !stopModalOpen && (
          <StopInfoBar
            onClose={handleCloseStopInfo}
            onExpand={handleExpandStop}
            onStopSelect={handleSelectStop}
            routesById={routesById}
            stackBelow={false}
            stop={selectedStop}
            stopsById={stopsById}
          />
        )}

        {/* Floating search bar */}
        <div className="absolute top-2 left-2 right-32 sm:left-4 sm:right-auto sm:top-4 z-[1000]">
          <div className="w-full sm:w-80 flex items-center gap-2 bg-base-100 rounded-xl px-4 py-3 shadow-lg">
            <button
              className="flex-1 flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
              onClick={() => {
                trackEvent('search_opened');
                setSearchModalOpen(true);
              }}
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
                  {config.id === 'train'
                    ? t('search.barPlaceholderTrains')
                    : t('search.barPlaceholderLines')}
                </span>
              )}
            </button>
            {selectedRoute && routeModalOpen && (
              <button
                aria-label={t('search.clearSelectionAria')}
                className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
                onClick={handleClearRoute}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Locate error toast */}
        {locateError && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1300]">
            <div className="alert alert-error py-2 px-4 shadow-lg text-xs max-w-72 text-center">
              <span>{locateError}</span>
            </div>
          </div>
        )}

        {/* Debug panel (transit only, requires sandbox mode enabled in Settings) */}
        {config.hasRealtime && sandboxVisible && (
          <DebugPanel
            routesById={routesById}
            selectedStopId={selectedStopId}
            stopsById={stopsById}
          />
        )}

        {/* Search Modal */}
        <SearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          onSelectRoute={handleSelectRoute}
          onSelectStop={handleSelectStop}
          routes={routes}
          stops={stops}
          stopsById={stopsById}
        />

        {/* Route Modal */}
        {selectedRoute && (
          <RouteModal
            initialDirectionFilter={directionFilter}
            isOpen={routeModalOpen}
            onClose={handleCloseRoute}
            onStopClick={handleStopClickFromRoute}
            orderedStops={orderedStops}
            route={selectedRoute}
            routeStops={routeStops}
            stopsById={stopsById}
            vehicles={vehicles}
          />
        )}

        {/* Stop Modal */}
        {selectedStop && (
          <StopModal
            isOpen={stopModalOpen}
            onClose={handleCloseStop}
            onRouteClick={handleRouteClickFromStop}
            onStopSelect={handleSelectStop}
            routesById={routesById}
            stop={selectedStop}
            stopsById={stopsById}
          />
        )}

        {/* Nearby Stops Modal */}
        {userLocation && (
          <NearbyStopsModal
            isOpen={nearbyOpen}
            listExpanded={nearbyStopsListExpanded}
            onClose={() => setNearbyPanelOpen(false)}
            onListExpandedChange={setNearbyStopsListExpanded}
            onSelectStop={handleSelectStopFromNearby}
            stops={platformStops}
            userLat={userLocation.lat}
            userLon={userLocation.lon}
          />
        )}

        {/* Onboarding Wizard */}
        <OnboardingWizard variant={config.onboardingVariant} />
      </div>
    </GTFSModeProvider>
  );
}
