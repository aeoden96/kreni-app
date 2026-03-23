/**
 * ListApp — "App Mode" without the map.
 *
 * Bottom tab navigation with:
 *   ⭐ Favourites  — favourite stops with live data, favourite routes, recents
 *   🚌 Routes      — browse/search all tram & bus routes
 *   📍 Nearby      — geolocation nearest stops
 *   ⚠️  Alerts      — GTFS-RT service alerts
 *
 * Tapping a stop opens StopModal (reused as-is).
 * Tapping a route opens RouteModal (reused as-is).
 */

import { AlertTriangle, MapPin, Route as RouteIcon, Star } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentService } from '../../hooks/useCurrentService';
import { useInitialData } from '../../hooks/useInitialData';
import { useRealtimeData } from '../../hooks/useRealtimeData';
import { useRouteData } from '../../hooks/useRouteData';
import { useVehiclePositions } from '../../hooks/useVehiclePositions';
import { useRealtimeStore } from '../../stores/realtimeStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { DebugPanel } from '../common/DebugPanel';
import { OnboardingWizard } from '../common/OnboardingWizard';
import { RouteModal } from '../common/RouteModal';
import { StopModal } from '../common/StopModal';
import { AlertsTab } from './AlertsTab';
import { FavouritesTab } from './FavouritesTab';
import { NearbyTab } from './NearbyTab';
import { RoutesTab } from './RoutesTab';

type DirectionFilter = 'A' | 'B';
type Tab = 'alerts' | 'favourites' | 'nearby' | 'routes';

export function ListApp() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('favourites');

  // Modal / selection state
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<null | string>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<null | string>(null);
  const [, setSelectedRouteType] = useState<null | number>(null);
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('A');
  const { addRecentRoute, addRecentStop } = useSettingsStore();

  // Data hooks
  const {
    calendar,
    error: initialError,
    loading: initialLoading,
    routes,
    routesById,
    stops,
    stopsById,
  } = useInitialData();

  const serviceId = useCurrentService(calendar);
  const { activeTripsData, orderedStops, routeStops } = useRouteData(selectedRouteId);
  const vehicles = useVehiclePositions(activeTripsData, serviceId);
  const { error: realtimeError, stats: realtimeStats } = useRealtimeData();
  const serviceAlerts = useRealtimeStore((s) => s.serviceAlerts);

  // Handlers
  const handleSelectStop = useCallback(
    (stopId: string) => {
      setSelectedStopId(stopId);
      addRecentStop(stopId);
      setStopModalOpen(true);
    },
    [addRecentStop]
  );

  const handleSelectRoute = useCallback(
    (routeId: string, routeType: number) => {
      setSelectedRouteId(routeId);
      setSelectedRouteType(routeType);
      setDirectionFilter('A');
      addRecentRoute(routeId);
      setRouteModalOpen(true);
    },
    [addRecentRoute]
  );

  const handleRouteClickFromStop = (routeId: string, routeType: number) => {
    setSelectedRouteId(routeId);
    setSelectedRouteType(routeType);
    setStopModalOpen(false);
    setSelectedStopId(null);
    setRouteModalOpen(true);
  };

  const handleStopClickFromRoute = (stopId: string) => {
    setSelectedStopId(stopId);
    setRouteModalOpen(false);
    addRecentStop(stopId);
    setStopModalOpen(true);
  };

  const handleCloseStop = () => {
    setStopModalOpen(false);
    setSelectedStopId(null);
  };

  const handleCloseRoute = () => {
    setRouteModalOpen(false);
  };

  // Loading state
  if (initialLoading) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg" />
          <div className="mt-4">{t('gtfs.loadingTransit')}</div>
        </div>
      </div>
    );
  }

  // Error state
  if (initialError) {
    return (
      <div className="min-h-svh flex items-center justify-center p-4">
        <div className="alert alert-error max-w-md">
          <span>{t('gtfs.initialError', { message: initialError.message })}</span>
        </div>
      </div>
    );
  }

  const selectedStop = selectedStopId ? stopsById.get(selectedStopId) : null;
  const selectedRoute = selectedRouteId ? routesById.get(selectedRouteId) : null;

  const tabs: { badge?: number; icon: typeof Star; id: Tab; label: string }[] = [
    { icon: Star, id: 'favourites', label: t('listApp.tabFavourites') },
    { icon: RouteIcon, id: 'routes', label: t('listApp.tabRoutes') },
    { icon: MapPin, id: 'nearby', label: t('listApp.tabNearby') },
    {
      badge: serviceAlerts.length || undefined,
      icon: AlertTriangle,
      id: 'alerts',
      label: t('listApp.tabAlerts'),
    },
  ];

  return (
    <div className="h-svh flex flex-col bg-base-200">
      {/* Header */}
      <header className="relative z-50 bg-base-100 border-b border-base-300 pl-4 pr-14 sm:pr-20 py-3 flex items-center gap-3 shrink-0">
        <h1 className="text-lg font-bold flex-1">Kreni</h1>

        {/* Realtime status */}
        {realtimeStats && !realtimeError && (
          <span className="badge badge-success badge-sm gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {t('listApp.liveVehicles', { count: realtimeStats.vehiclePositions })}
          </span>
        )}
        {realtimeError && (
          <span className="badge badge-error badge-sm gap-1">{t('listApp.gpsError')}</span>
        )}
      </header>

      {/* Tab content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        {activeTab === 'favourites' && (
          <FavouritesTab
            onSelectRoute={handleSelectRoute}
            onSelectStop={handleSelectStop}
            routesById={routesById}
            stopsById={stopsById}
          />
        )}
        {activeTab === 'routes' && <RoutesTab onSelectRoute={handleSelectRoute} routes={routes} />}
        {activeTab === 'nearby' && (
          <NearbyTab
            onSelectStop={handleSelectStop}
            routesById={routesById}
            stops={stops}
            stopsById={stopsById}
          />
        )}
        {activeTab === 'alerts' && (
          <AlertsTab
            alerts={serviceAlerts}
            onRouteClick={handleSelectRoute}
            routesById={routesById}
          />
        )}
      </main>

      {/* Bottom tab bar */}
      <nav className="relative z-[2100] bg-base-100 border-t border-base-300 shrink-0 safe-area-bottom">
        <div className="flex">
          {tabs.map(({ badge, icon: Icon, id, label }) => {
            const isActive = activeTab === id;
            return (
              <button
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 transition-colors relative ${
                  isActive ? 'text-primary' : 'text-base-content/50 hover:text-base-content/70'
                }`}
                key={id}
                onClick={() => setActiveTab(id)}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {badge && badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 badge badge-error badge-xs text-[10px] px-1 min-w-4">
                      {badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals (reused from map mode) */}
      {selectedStop && (
        <StopModal
          isOpen={stopModalOpen}
          onClose={handleCloseStop}
          onRouteClick={handleRouteClickFromStop}
          routesById={routesById}
          stop={selectedStop}
          stopsById={stopsById}
        />
      )}

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

      <DebugPanel />
      {/* Onboarding Wizard */}
      <OnboardingWizard variant="list" />
    </div>
  );
}
