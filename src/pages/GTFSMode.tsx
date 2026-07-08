/**
 * Unified GTFS transit page, shared between Public-Transport (bus/tram) and
 * Train modes.  All mode-specific behaviour is controlled by the
 * GTFSModeConfig that is injected via props and published on GTFSModeContext
 * so that leaf components (StopInfoBar, StopModal) can read dataDir without
 * prop-drilling.
 */

import { ArrowLeftRight, Search, Train, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { RealtimeStatusPanelHandle } from '../components/common/RealtimeStatusPanel';
import type { GTFSModeConfig } from '../config/modes';
import type { DirectionFilter } from '../hooks/useSelectionParams';

import { DebugPanel } from '../components/common/DebugPanel';
import { DirectionsModal } from '../components/common/DirectionsModal';
import { NearbyStopsModal } from '../components/common/NearbyStopsModal';
import { OnboardingWizard } from '../components/common/OnboardingWizard';
import { RealtimeStatusPanel } from '../components/common/RealtimeStatusPanel';
import { RouteViewLarge } from '../components/common/RouteViewLarge';
import { RouteViewSmall } from '../components/common/RouteViewSmall';
import { SearchModal } from '../components/common/SearchModal';
import { ServiceAlerts } from '../components/common/ServiceAlerts';
import { StopInfoBar } from '../components/common/StopInfoBar';
import { StopModal } from '../components/common/StopModal';
import { VehicleViewSmall } from '../components/common/VehicleViewSmall';
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
import { routeTypeColor } from '../utils/routeStyle';

interface GTFSModeProps {
  config: GTFSModeConfig;
}

export function GTFSMode({ config }: GTFSModeProps) {
  const { t } = useTranslation();
  // Modal states
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [directionsModalOpen, setDirectionsModalOpen] = useState(false);
  const [routeViewLargeOpen, setRouteViewLargeOpen] = useState(false);
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [nearbyStopsListExpanded, setNearbyStopsListExpanded] = useState(false);
  const [journeyContext, setJourneyContext] = useState<null | {
    fromParentId: string;
    toParentId: string;
  }>(null);

  const setNearbyPanelOpen = useCallback((open: boolean) => {
    setNearbyOpen(open);
    if (!open) {
      setNearbyStopsListExpanded(false);
    }
  }, []);

  const realtimePanelRef = useRef<RealtimeStatusPanelHandle>(null);

  /** Close the "tehnički detalji" popover when user performs other actions (stop click, location, etc.) */
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
  const { data: routeTimetable, loading: timetableLoading } = useRouteTimetable(
    selectedRouteId,
    config.dataDir
  );

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
    handleBackToRouteOverview,
    handleFollowDisengage,
    handleFollowStart,
    handleUnfollow,
    handleVehicleSelect,
    vehicleFocus,
    zoomToRouteTrigger,
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
    tripId?: null | string,
    fromParentId?: null | string,
    toParentId?: null | string,
    viewMode: 'full' | 'preview' = 'preview'
  ) => {
    let dir: DirectionFilter = df === 'A' || df === 'B' ? df : 'A';

    if (!df && tripId) {
      const vehicle =
        vehicles.find((v) => v.tripId === tripId) || allVehicles.find((v) => v.tripId === tripId);
      if (vehicle) {
        dir = vehicle.direction === 1 ? 'B' : 'A';
      }
    }

    if (tripId) {
      trackEvent('vehicle_clicked', { route_id: routeId, trip_id: tripId });
    }
    selectRoute(routeId, { dir });
    setSearchModalOpen(false);
    closeLegendAndDetails();
    addRecentRoute(routeId);
    if (tripId) handleVehicleSelect(tripId, viewMode, routeId);
    setRouteViewLargeOpen(false);
    setStopModalOpen(false);
    if (fromParentId && toParentId) {
      setJourneyContext({ fromParentId, toParentId });
    } else {
      setJourneyContext(null);
    }
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
    setRouteViewLargeOpen(false);
  };

  const handleRouteClickFromStop = (
    routeId: string,
    routeType: number,
    tripId?: string,
    lat?: null | number,
    lon?: null | number
  ) => {
    if (tripId) {
      handleSelectRoute(routeId, routeType, undefined, tripId);
    } else {
      selectRoute(routeId);
      setStopModalOpen(false);
      setRouteViewLargeOpen(false);
    }
    if (lat != null && lon != null) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
      setParentStationZoomTarget({
        lat,
        lon,
        panOffsetY: isMobile ? -Math.round(window.innerHeight / 4) : 0,
        zoom: 16,
      });
    }
  };

  const handleExpandRoute = () => setRouteViewLargeOpen(true);
  const handleCloseRoute = () => setRouteViewLargeOpen(false);
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
          allVehicles={selectedRouteId ? [] : allVehicles}
          autoZoomToRoute={
            !!selectedRouteId &&
            !vehicleFocus?.isFollowing &&
            !(vehicleFocus?.routeId === selectedRouteId && !!vehicleFocus.tripId)
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
          onVehicleClick={(routeId, routeType, tripId) => {
            handleSelectRoute(routeId, routeType, undefined, tripId, undefined, undefined, 'full');
          }}
          onVehicleSelect={handleVehicleSelect}
          onZoomComplete={handleZoomComplete}
          orderedStops={orderedStops}
          parentChildCounts={parentChildCounts}
          parentStations={parentStations}
          parentStationZoomTarget={parentStationZoomTarget}
          platformStops={platformStops}
          previewVehiclePos={
            vehicleFocus?.routeId === selectedRouteId &&
            vehicleFocus.viewMode === 'preview' &&
            !vehicleFocus.isFollowing &&
            vehicleFocus.tripId &&
            vehiclePositions.get(vehicleFocus.tripId)
              ? {
                  lat: vehiclePositions.get(vehicleFocus.tripId)!.latitude,
                  lon: vehiclePositions.get(vehicleFocus.tripId)!.longitude,
                }
              : null
          }
          previewVehicleTripId={
            vehicleFocus?.routeId === selectedRouteId &&
            vehicleFocus.viewMode === 'preview' &&
            !vehicleFocus.isFollowing
              ? vehicleFocus.tripId
              : null
          }
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
          vehicleFollowOffsetY={
            !!vehicleFocus?.isFollowing && typeof window !== 'undefined' && window.innerWidth < 640
              ? -Math.round(window.innerHeight / 4)
              : 0
          }
          vehicles={vehicles}
          zoomTrigger={zoomToRouteTrigger}
        />

        {/* Route loading indicator — only when the small route bar isn't already visible */}
        {routeLoading &&
          (!selectedRoute || routeViewLargeOpen || stopModalOpen || !!selectedStopId) && (
            <div className="absolute top-[calc(4rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[1000]">
              <div className="alert alert-info py-2 px-4 shadow-lg">
                <span className="loading loading-spinner loading-sm" />
                <span>{t('gtfs.loadingRoute')}</span>
              </div>
            </div>
          )}

        {/* Service alerts (always visible) + realtime technical details (debug only); z above Leaflet bottom chrome */}
        {config.id === 'transit' && (
          <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[1100] flex items-center justify-end gap-2">
            <ServiceAlerts
              alerts={serviceAlerts}
              onRouteClick={(routeId, routeType) => handleSelectRoute(routeId, routeType)}
              routesById={routesById}
              selectedRouteId={selectedRouteId}
            />
            {config.hasRealtime && realtimeStats && sandboxVisible && (
              <RealtimeStatusPanel
                cacheAgeSeconds={cacheAgeSeconds}
                cacheStatus={cacheStatus}
                feedAgeStr={feedAgeStr}
                fetchLatencyMs={fetchLatencyMs}
                lastUpdate={lastUpdate}
                nextPollAtMs={nextPollAtMs}
                realtimeLoading={realtimeLoading}
                realtimeStats={realtimeStats}
                ref={realtimePanelRef}
                timeAgoStr={timeAgoStr}
                workerTimestamp={workerTimestamp}
              />
            )}
          </div>
        )}

        {/* Low-zoom hint when vehicles and stops are hidden (transit only) */}
        {config.hasRealtime && mapZoom <= MAP_ZOOM_TRANSIT_STOPS_HINT_THRESHOLD && (
          <div className="absolute top-[calc(5rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[1000]">
            <div className="badge badge-neutral gap-2 shadow text-xs sm:text-sm opacity-90 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber-50 animate-ping" />
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
          !routeViewLargeOpen &&
          !stopModalOpen &&
          !selectedStopId &&
          (() => {
            const isFollowing = vehicleFocus?.isFollowing ?? false;
            const activeTripId = vehicleFocus?.tripId ?? null;
            const activeVehicle = activeTripId
              ? (vehicles.find((v) => v.tripId === activeTripId) ?? null)
              : null;
            const activeVehiclePos = isFollowing
              ? followedVehicleParsedPos
              : activeTripId
                ? (vehiclePositions.get(activeTripId) ?? null)
                : null;
            const activeTripUpdate = isFollowing
              ? followedTripUpdate
              : activeTripId
                ? (tripUpdates.get(activeTripId) ?? null)
                : null;
            const journeyDirectionKey = journeyContext
              ? directionFilter === 'B'
                ? '1'
                : '0'
              : null;
            const viewMode =
              vehicleFocus?.routeId === selectedRouteId ? vehicleFocus.viewMode : undefined;
            const isFullVehicleView = !!activeTripId && viewMode === 'full';

            if (isFullVehicleView) {
              return (
                <VehicleViewSmall
                  activeTripId={activeTripId!}
                  clickedTripUpdate={activeTripUpdate}
                  clickedVehicle={activeVehicle}
                  clickedVehiclePos={activeVehiclePos}
                  isFollowing={isFollowing}
                  onBackToRouteOverview={() => {
                    if (activeVehicle && selectedRouteId) {
                      const dir = activeVehicle.direction === 1 ? 'B' : 'A';
                      if (directionFilter !== dir) {
                        selectRoute(selectedRouteId, { dir });
                      }
                    }
                    handleBackToRouteOverview();
                  }}
                  onClose={handleClearRoute}
                  onExpand={handleExpandRoute}
                  onFollowStart={handleFollowStart}
                  onUnfollow={handleUnfollow}
                  route={selectedRoute}
                  routeTimetable={routeTimetable}
                  stopsById={stopsById}
                  timetableLoading={timetableLoading}
                />
              );
            }

            return (
              <RouteViewSmall
                activeTripId={activeTripId}
                clickedTripUpdate={activeTripUpdate}
                clickedVehicle={activeVehicle}
                clickedVehiclePos={activeVehiclePos}
                followCandidateTripId={isFollowing ? null : activeTripId}
                journeyDirectionKey={journeyDirectionKey}
                journeyFromParentId={journeyContext?.fromParentId ?? null}
                journeyToParentId={journeyContext?.toParentId ?? null}
                loading={routeLoading}
                onClose={handleClearRoute}
                onExpand={handleExpandRoute}
                onFollowStart={handleFollowStart}
                onVehicleSelect={handleVehicleSelect}
                orderedStops={orderedStops}
                route={selectedRoute}
                routeTimetable={routeTimetable}
                stopsById={stopsById}
                vehicles={vehicles}
              />
            );
          })()}

        {/* Stop Info Bar */}
        {selectedStop && !stopModalOpen && (
          <StopInfoBar
            onClose={handleCloseStopInfo}
            onExpand={handleExpandStop}
            onRouteClick={handleRouteClickFromStop}
            onStopSelect={handleSelectStop}
            routesById={routesById}
            stackBelow={false}
            stop={selectedStop}
            stopsById={stopsById}
          />
        )}

        {/* Floating search: circular icon (same footprint as locate) until route is shown in-bar */}
        <div className="absolute top-[max(0.5rem,env(safe-area-inset-top))] left-[max(0.5rem,env(safe-area-inset-left))] right-32 sm:left-[max(1rem,env(safe-area-inset-left))] sm:right-auto sm:top-[max(1rem,env(safe-area-inset-top))] z-[1000]">
          {selectedRoute && routeViewLargeOpen ? (
            <div className="w-full sm:w-80 flex items-center gap-2 bg-base-100 rounded-xl px-4 py-3 shadow-lg">
              <button
                className="flex-1 flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                onClick={() => {
                  trackEvent('search_opened');
                  setSearchModalOpen(true);
                }}
                type="button"
              >
                <Search className="w-5 h-5 text-base-content/50 shrink-0" />
                <span className="text-sm flex-1">
                  <span
                    className="badge font-bold mr-2 text-white"
                    style={{ backgroundColor: routeTypeColor(selectedRoute.type) }}
                  >
                    {selectedRoute.shortName}
                  </span>
                  <span className="text-base-content/70">{selectedRoute.longName}</span>
                </span>
              </button>
              <button
                aria-label={t('search.clearSelectionAria')}
                className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
                onClick={handleClearRoute}
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              aria-label={
                config.id === 'train'
                  ? t('search.barPlaceholderTrains')
                  : t('search.barPlaceholderLines')
              }
              className="btn btn-circle btn-gps-inactive p-0 min-h-0 w-10 h-10 min-h-10 sm:w-14 sm:h-14 sm:min-h-14 shadow-2xl transition-all duration-300 ring-2 ring-white/5"
              onClick={() => {
                trackEvent('search_opened');
                setSearchModalOpen(true);
              }}
              type="button"
            >
              <Search className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}
        </div>

        {/* Floating plan journey button */}
        <div className="absolute top-[max(0.5rem,env(safe-area-inset-top))] left-[calc(3.5rem+env(safe-area-inset-left))] sm:top-[max(1rem,env(safe-area-inset-top))] sm:left-[calc(5rem+env(safe-area-inset-left))] z-[1000]">
          <button
            aria-label={t('search.planJourney')}
            className="btn btn-circle btn-gps-inactive p-0 min-h-0 w-10 h-10 min-h-10 sm:w-14 sm:h-14 sm:min-h-14 shadow-2xl transition-all duration-300 ring-2 ring-white/5"
            onClick={() => {
              trackEvent('directions_opened');
              setDirectionsModalOpen(true);
            }}
            type="button"
          >
            <ArrowLeftRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Locate error toast */}
        {locateError && (
          <div className="absolute top-[calc(4rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[1300]">
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

        {/* Directions Modal */}
        <DirectionsModal
          isOpen={directionsModalOpen}
          onClose={() => setDirectionsModalOpen(false)}
          onSelectRoute={handleSelectRoute}
          routes={routes}
          stops={stops}
          stopsById={stopsById}
          vehicles={allVehicles}
        />

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
          <RouteViewLarge
            initialDirectionFilter={directionFilter}
            isOpen={routeViewLargeOpen}
            journeyFromParentId={journeyContext?.fromParentId ?? null}
            journeyToParentId={journeyContext?.toParentId ?? null}
            onClose={handleCloseRoute}
            onStopClick={handleStopClickFromRoute}
            orderedStops={orderedStops}
            route={selectedRoute}
            routeStops={routeStops}
            routeTimetable={routeTimetable}
            serviceId={serviceId}
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
