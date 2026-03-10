/**
 * Unified GTFS transit page, shared between Public-Transport (bus/tram) and
 * Train modes.  All mode-specific behaviour is controlled by the
 * GTFSModeConfig that is injected via props and published on GTFSModeContext
 * so that leaf components (StopInfoBar, StopModal) can read dataDir without
 * prop-drilling.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
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
import { ServiceAlerts } from '../components/common/ServiceAlerts';
import { useInitialData } from '../hooks/useInitialData';
import { useCurrentService } from '../hooks/useCurrentService';
import { useRouteData } from '../hooks/useRouteData';
import { useSettingsStore } from '../stores/settingsStore';
import { useRealtimeStore } from '../stores/realtimeStore';
import { useAllVehiclePositions } from '../hooks/useAllVehiclePositions';
import { useVehiclePositions } from '../hooks/useVehiclePositions';
import { useRealtimeData } from '../hooks/useRealtimeData';
import { useGeolocation } from '../hooks/useGeolocation';
import { findNearestStops } from '../utils/gtfs';
import { GTFSModeProvider } from '../contexts/GTFSModeContext';
import { useRssServiceAlerts } from '../hooks/useRssServiceAlerts';
import type { GTFSModeConfig } from '../config/modes';

/** Vertical pixel offset to shift a stop marker below the top StopInfoBar overlay on mobile. */
function stopSelectPanOffsetY(): number {
  if (typeof window === 'undefined' || window.innerWidth >= 640) return 0;
  return -Math.round(window.innerHeight / 4);
}

interface GTFSModeProps {
  config: GTFSModeConfig;
}

export function GTFSMode({ config }: GTFSModeProps) {
  // Modal states
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [timeAgoStr, setTimeAgoStr] = useState<string>('');
  const [parentStationZoomTarget, setParentStationZoomTarget] = useState<{ lat: number; lon: number; zoom?: number; panOffsetY?: number } | null>(null);
  /** Last vehicle the user clicked — carries both routeId and tripId so the follow button
   *  can be gated by matching routeId without being wiped by the route-change effect. */
  const [lastClickedVehicle, setLastClickedVehicle] = useState<{ routeId: string; tripId: string } | null>(null);
  /** tripId of the vehicle currently being followed (auto-centers map) */
  const [followedVehicleTripId, setFollowedVehicleTripId] = useState<string | null>(null);

  const handleZoomComplete = useCallback(() => setParentStationZoomTarget(null), []);

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
  const { addRecentRoute, addRecentStop } = useSettingsStore();

  // In train mode there is no "hide all vehicles" toggle — stops are always visible.
  const showAllVehicles = config.hasRealtime ? showAllVehiclesFromStore : true;
  const showRoadClosures = config.hasRealtime && showRoadClosuresFromStore;

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
  const { error: realtimeError, stats: realtimeStats } = useRealtimeData(
    config.hasRealtime && showAllVehicles,
  );
  const gtfsRtAlerts = useRealtimeStore((s) => s.serviceAlerts);
  const lastUpdate = useRealtimeStore((s) => s.lastUpdate);
  const vehiclePositions = useRealtimeStore((s) => s.vehiclePositions);
  const tripUpdates = useRealtimeStore((s) => s.tripUpdates);

  // RSS-parsed ZET service alerts (polled by GitHub Actions cron every 30 min)
  const rssAlerts = useRssServiceAlerts(routesById);
  const serviceAlerts = [...rssAlerts, ...gtfsRtAlerts];

  // All-vehicles overlay (transit only)
  const { vehicles: allVehicles, loading: allVehiclesLoading } =
    useAllVehiclePositions(
      config.hasRealtime && showAllVehicles,
      serviceId,
      routesById,
    );

  const selectedRouteType = selectedRouteId
    ? (routesById.get(selectedRouteId)?.type ?? null)
    : null;

  // Realtime freshness timer (transit only)
  useEffect(() => {
    if (!config.hasRealtime || !lastUpdate) {
      setTimeAgoStr('');
      return;
    }
    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - lastUpdate) / 1000);
      setTimeAgoStr(
        seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`,
      );
    };
    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    return () => clearInterval(interval);
  }, [config.hasRealtime, lastUpdate]);

  // Clear follow mode when route changes.
  // lastClickedVehicle is intentionally NOT cleared here — it's already gated
  // by routeId === selectedRouteId in the render, and clearing it here creates
  // a race condition that wipes it before the RouteInfoBar can display the follow button.
  useEffect(() => {
    setFollowedVehicleTripId(null);
  }, [selectedRouteId]);

  // Derive followed vehicle GPS position from realtime store
  const followedRawPos = followedVehicleTripId
    ? vehiclePositions.get(followedVehicleTripId) ?? null
    : null;
  const followedVehiclePos = followedRawPos
    ? { lat: followedRawPos.latitude, lon: followedRawPos.longitude }
    : null;
  const followedVehicleParsedPos = followedVehicleTripId
    ? vehiclePositions.get(followedVehicleTripId) ?? null
    : null;
  const followedTripUpdate = followedVehicleTripId
    ? tripUpdates.get(followedVehicleTripId) ?? null
    : null;

  // Geolocation
  const onLocateSuccess = useCallback(
    (_lat: number, _lon: number) => {
      clearStop();
      setNearbyOpen(true);
    },
    [clearStop],
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
    addRecentRoute(routeId);
    if (tripId) setLastClickedVehicle({ routeId, tripId });
    setRouteModalOpen(false);
    setStopModalOpen(false);
  };

  const handleStopClickFromMap = (stopId: string) => {
    if (stopId.startsWith('group-')) {
      const group = (groupedParentStations || []).find((g) => g.id === stopId);
      if (group) {
        setParentStationZoomTarget({ lat: group.lat, lon: group.lon, zoom: 15, panOffsetY: stopSelectPanOffsetY() });
        const firstParentId = group.childIds[0];
        const childPlatform = stops.find(
          (s) => s.parentStation === firstParentId && s.locationType === 0,
        );
        selectStop(childPlatform ? childPlatform.id : firstParentId);
      }
      return;
    }
    const stop = stopsById.get(stopId);
    if (stop && stop.locationType === 1) {
      setParentStationZoomTarget({ lat: stop.lat, lon: stop.lon, zoom: config.stopZoom, panOffsetY: stopSelectPanOffsetY() });
      const childPlatform = stops.find(
        (s) => s.parentStation === stopId && s.locationType === 0,
      );
      selectStop(childPlatform ? childPlatform.id : stopId);
    } else {
      selectStop(stopId);
      addRecentStop(stopId);
    }
  };

  const handleExpandStop = (stopId: string) => {
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

  const handleVehicleSelect = useCallback((tripId: string) => {
    if (selectedRouteId) setLastClickedVehicle({ routeId: selectedRouteId, tripId });
  }, [selectedRouteId]);

  const handleFollowStart = useCallback((tripId: string) => {
    setFollowedVehicleTripId(tripId);
  }, []);

  const handleFollowDisengage = useCallback(() => {
    setFollowedVehicleTripId(null);
  }, []);

  const handleUnfollow = useCallback(() => {
    setFollowedVehicleTripId(null);
  }, []);

  const handleCloseStop = () => {
    setStopModalOpen(false);
  };

  const handleCloseStopInfo = () => clearStop();

  const handleSelectStop = useCallback(
    (stopId: string) => {
      setNearbyOpen(false);
      const stop = stopsById.get(stopId);
      selectStop(stopId);
      addRecentStop(stopId);
      if (stop)
        setParentStationZoomTarget({ lat: stop.lat, lon: stop.lon, zoom: config.stopZoom, panOffsetY: stopSelectPanOffsetY() });
    },
    [selectStop, stopsById, addRecentStop, config.stopZoom],
  );

  /** Same as handleSelectStop but offsets the map so the stop lands in the
   *  bottom-half centre on mobile (where the top-half is occupied by the
   *  nearby-stops list). */
  const handleSelectStopFromNearby = useCallback(
    (stopId: string) => {
      setNearbyOpen(false);
      const stop = stopsById.get(stopId);
      selectStop(stopId);
      addRecentStop(stopId);
      if (stop) {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
        const panOffsetY = isMobile ? -Math.round(window.innerHeight / 4) : 0;
        setParentStationZoomTarget({ lat: stop.lat, lon: stop.lon, zoom: config.stopZoom, panOffsetY });
      }
    },
    [selectStop, stopsById, addRecentStop, config.stopZoom],
  );

  // ── Derived ───────────────────────────────────────────────────────────────

  const nearbyHighlightedStops = useMemo(() => {
    if (!nearbyOpen || !userLocation) return [];
    const nearby = findNearestStops(platformStops, userLocation.lat, userLocation.lon, 15);
    const seen = new Set<string>();
    return nearby
      .filter((s) => {
        if (seen.has(s.name)) return false;
        seen.add(s.name);
        return true;
      })
      .slice(0, 6)
      .map((s) => s.id);
  }, [nearbyOpen, userLocation, platformStops]);

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
                  panOffsetY: stopSelectPanOffsetY(),
                })
              : undefined
          }
          highlightStopIds={activeHighlightStopIds}
          nearbyStopIds={nearbyHighlightedStops}
          onVehicleSelect={handleVehicleSelect}
          followedVehiclePos={followedVehiclePos}
          onFollowDisengage={handleFollowDisengage}
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

        {/* All-vehicles loading indicator (transit only) */}
        {config.hasRealtime && allVehiclesLoading && (
          <div className="absolute bottom-6 left-4 z-[1000] flex items-center gap-2 bg-base-100/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md text-xs text-base-content/70 pointer-events-none">
            <span className="loading loading-spinner loading-xs"></span>
            <span>Učitavanje vozila...</span>
          </div>
        )}

        {/* Realtime status badges (transit only) */}
        {config.hasRealtime && realtimeError && (
          <div className="absolute bottom-6 right-4 z-[1000]">
            <div className="badge badge-error gap-1 shadow text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              GPS uživo: {realtimeError.message}
            </div>
          </div>
        )}

        {config.hasRealtime && showAllVehicles && realtimeStats && !realtimeError && (
          <div className="absolute bottom-6 right-4 z-[1000] flex flex-col items-end gap-2">
            <ServiceAlerts
              alerts={serviceAlerts}
              routesById={routesById}
              selectedRouteId={selectedRouteId}
              onRouteClick={(routeId, routeType) => handleSelectRoute(routeId, routeType)}
            />

            {legendOpen && (
              <div className="bg-base-100 rounded-xl shadow-xl border border-base-200 p-3 w-52 text-xs space-y-2">
                <p className="font-semibold text-base-content mb-1">Legenda</p>

                {/* Tram */}
                <div className="flex items-center gap-2">
                  <div style={{ position: 'relative', width: 22, height: 22, flexShrink: 0 }}>
                    <svg style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(0deg)', transformOrigin: '11px 11px' }} width="22" height="22" viewBox="0 0 22 22">
                      <polygon points="11,1 8,6 14,6" fill="#2337ff" stroke="white" strokeWidth="1" strokeLinejoin="round" />
                    </svg>
                    <svg style={{ position: 'absolute', top: 0, left: 0 }} width="22" height="22" viewBox="0 0 22 22">
                      <circle cx="11" cy="11" r="7" fill="#2337ff" fillOpacity="0.95" stroke="white" strokeWidth="2" />
                      <text x="11" y="14" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white" fontFamily="system-ui,sans-serif">T1</text>
                    </svg>
                  </div>
                  <span className="text-base-content/80">Tramvaj (GPS, smjer poznat)</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="7" fill="#2337ff" fillOpacity="0.85" stroke="white" strokeWidth="2" />
                    <text x="10" y="13" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white" fontFamily="system-ui,sans-serif">T1</text>
                  </svg>
                  <span className="text-base-content/80">Tramvaj (u mirovanju)</span>
                </div>

                <div className="divider my-0.5" />

                {/* Bus */}
                <div className="flex items-center gap-2">
                  <div style={{ position: 'relative', width: 22, height: 22, flexShrink: 0 }}>
                    <svg style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(45deg)', transformOrigin: '11px 11px' }} width="22" height="22" viewBox="0 0 22 22">
                      <polygon points="11,1 8,6 14,6" fill="#d97706" stroke="white" strokeWidth="1" strokeLinejoin="round" />
                    </svg>
                    <svg style={{ position: 'absolute', top: 0, left: 0 }} width="22" height="22" viewBox="0 0 22 22">
                      <circle cx="11" cy="11" r="7" fill="#d97706" fillOpacity="0.95" stroke="white" strokeWidth="2" />
                      <text x="11" y="14" textAnchor="middle" fontSize="6" fontWeight="bold" fill="white" fontFamily="system-ui,sans-serif">109</text>
                    </svg>
                  </div>
                  <span className="text-base-content/80">Autobus (GPS, smjer poznat)</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="7" fill="#d97706" fillOpacity="0.85" stroke="white" strokeWidth="2" />
                    <text x="10" y="13" textAnchor="middle" fontSize="6" fontWeight="bold" fill="white" fontFamily="system-ui,sans-serif">109</text>
                  </svg>
                  <span className="text-base-content/80">Autobus (u mirovanju)</span>
                </div>

                <div className="divider my-0.5" />

                {/* Stops */}
                <div className="flex items-center gap-2">
                  <div style={{ position: 'relative', width: 18, height: 18, flexShrink: 0 }}>
                    <svg style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(45deg)', transformOrigin: '9px 9px' }} width="18" height="18" viewBox="0 0 18 18">
                      <polygon points="9,1 6,4 12,4" fill="#2563eb" stroke="white" strokeWidth="1" strokeLinejoin="round" />
                    </svg>
                    <svg style={{ position: 'absolute', top: 0, left: 0 }} width="18" height="18" viewBox="0 0 18 18">
                      <circle cx="9" cy="9" r="5" fill="#2563eb" fillOpacity="0.9" stroke="white" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <span className="text-base-content/80">Tramvajska stanica</span>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ position: 'relative', width: 18, height: 18, flexShrink: 0 }}>
                    <svg style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(0deg)', transformOrigin: '9px 9px' }} width="18" height="18" viewBox="0 0 18 18">
                      <polygon points="9,1 6,4 12,4" fill="#d97706" stroke="white" strokeWidth="1" strokeLinejoin="round" />
                    </svg>
                    <svg style={{ position: 'absolute', top: 0, left: 0 }} width="18" height="18" viewBox="0 0 18 18">
                      <circle cx="9" cy="9" r="5" fill="#d97706" fillOpacity="0.9" stroke="white" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <span className="text-base-content/80">Autobusna stanica</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <circle cx="9" cy="9" r="5" fill="#475569" fillOpacity="0.9" stroke="white" strokeWidth="1.5" />
                  </svg>
                  <span className="text-base-content/80">Mješovita stanica</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <circle cx="9" cy="9" r="7" fill="#ff6b6b" fillOpacity="1" stroke="white" strokeWidth="2" />
                  </svg>
                  <span className="text-base-content/80">Odabrana stanica</span>
                </div>
              </div>
            )}

            <button
              className="badge badge-success gap-1 shadow cursor-pointer hover:badge-outline transition-all"
              onClick={() => setLegendOpen((o) => !o)}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              ZET podaci stari {timeAgoStr || '...'}
            </button>
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
