/**
 * Full-screen stop modal — tabbed view with "Vozila" (live GPS) and "Red vožnje" (timetable).
 * Opened from the map popup expand button.
 */

import { useState, useEffect, memo } from 'react';
import { X, Clock, Star, ArrowRight, Navigation2, Info } from 'lucide-react';
import type { Stop, Route } from '../../utils/gtfs';
import { minutesToTime, bearingToDirection } from '../../utils/gtfs';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import { useApproachingVehicles } from '../../hooks/useApproachingVehicles';
import { useTimetableDepartures } from '../../hooks/useTimetableDepartures';
import { useStopRoutes } from '../../hooks/useStopRoutes';
import { useStopTermini } from '../../hooks/useStopTermini';
import { useSiblingPlatformRoutes } from '../../hooks/useSiblingPlatformRoutes';
import { ApproachingVehicleCard } from './ApproachingVehicleCard';
import { TimetableDepartureCard } from './TimetableDepartureCard';
import { StopTabSelector, type StopTab } from './StopTabSelector';
import { useSettingsStore } from '../../stores/settingsStore';
import { useGTFSMode } from '../../contexts/GTFSModeContext';

interface StopModalProps {
  isOpen: boolean;
  stop: Stop;
  routesById: Map<string, Route>;
  stopsById: Map<string, Stop>;
  onClose: () => void;
  onRouteClick: (routeId: string, routeType: number) => void;
  onStopSelect?: (stopId: string) => void;
}

export const StopModal = memo(function StopModal({
  isOpen,
  stop,
  routesById,
  stopsById,
  onClose,
  onRouteClick,
  onStopSelect,
}: StopModalProps) {
  const { dataDir, hasRealtime } = useGTFSMode();
  const currentTime = useCurrentTime();
  const { favouriteStopIds, toggleFavouriteStop, dismissedGpsTip, setDismissedGpsTip } = useSettingsStore();
  const isFav = favouriteStopIds.includes(stop.id);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<StopTab>(hasRealtime ? 'vehicles' : 'timetable');
  const [routesExpanded, setRoutesExpanded] = useState(false);
  const [platformsExpanded, setPlatformsExpanded] = useState(false);

  const ROUTES_COLLAPSED_MAX = 6;
  const PLATFORMS_COLLAPSED_MAX = 3;

  // 1-second tick for live countdown
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Approaching vehicles (GPS) — only active when modal is open
  const { vehicles: allVehicles, loading: vehiclesLoading, isAllTerminus } = useApproachingVehicles(
    isOpen ? stop.id : null,
    stopsById,
    routesById,
    nowMs,
    { dataDir }
  );

  // Sibling platforms — stops at the same parent station, or (fallback) same-named stops
  // when no parent station is set (common for bus stop pairs without GTFS grouping).
  // Parent-station siblings: deduplicated by code (each platform code is unique).
  // Same-name fallback siblings: deduplicated by bearing direction (typically 2 opposite platforms).
  const siblingPlatforms: Stop[] = (() => {
    if (stop.parentStation !== null) {
      return Array.from(stopsById.values()).filter(
        s => s.locationType === 0 && s.parentStation === stop.parentStation && s.id !== stop.id,
      );
    }
    const raw = Array.from(stopsById.values()).filter(
      s =>
        s.locationType === 0 &&
        s.id !== stop.id &&
        s.name === stop.name &&
        (stop.routeType === undefined || s.routeType === undefined || s.routeType === stop.routeType),
    );
    const seen = new Set<string>();
    return raw.filter(s => {
      const key = s.bearing !== undefined ? bearingToDirection(s.bearing) : (s.code ?? s.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  // Fetch routes for each sibling platform so we can show route badges
  const { routeMap: siblingRouteMap, terminusSet: siblingTerminusSet } = useSiblingPlatformRoutes(
    siblingPlatforms.map(s => s.id),
    routesById,
    { dataDir }
  );

  // Terminus stops sorted last
  const sortedSiblingPlatforms = siblingPlatforms.slice().sort((a, b) => {
    const aT = siblingTerminusSet.has(a.id) ? 1 : 0;
    const bT = siblingTerminusSet.has(b.id) ? 1 : 0;
    return aT - bT;
  });

  // Filter sibling platforms that actually have departures (for terminus banner)
  const departingSiblings = siblingPlatforms.filter(s => {
    const routes = siblingRouteMap.get(s.id);
    return routes && routes.length > 0;
  });

  const terminusBanner = isAllTerminus ? (
    <div className="rounded-xl bg-warning/10 border border-warning/30 p-4 m-4">
      <p className="text-sm font-semibold text-warning mb-1">Ovo je odredišna platforma</p>
      <p className="text-sm text-base-content/70 mb-3">
        Vozila ovdje završavaju vožnju — nema polazaka.
        {departingSiblings.length > 0 && ' Odaberite platformu za polazak:'}
      </p>
      {departingSiblings.map(s => {
        const routes = siblingRouteMap.get(s.id) ?? [];
        const label = s.bearing !== undefined
          ? `Smjer prema ${bearingToDirection(s.bearing)}`
          : undefined;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onStopSelect?.(s.id)}
            className="btn btn-sm btn-warning w-full gap-2 mb-1 flex-wrap justify-start"
          >
            <ArrowRight className="w-4 h-4 shrink-0" />
            {label && <span>{label}</span>}
            {routes.length > 0 && (
              <span className="flex flex-wrap gap-0.5 ml-1">
                {routes.slice(0, 5).map(r => (
                  <span key={r.id} className="badge badge-xs font-bold badge-ghost opacity-80">{r.shortName}</span>
                ))}
                {routes.length > 5 && <span className="text-xs opacity-60">+{routes.length - 5}</span>}
              </span>
            )}
          </button>
        );
      })}
    </div>
  ) : null;
  const liveVehicles = allVehicles
    .filter((v) => v.confidence === 'realtime')
    .sort((a, b) => {
      if (a.passedStop !== b.passedStop) return a.passedStop ? -1 : 1;
      if (a.passedStop && b.passedStop) return (b.distanceMeters ?? 0) - (a.distanceMeters ?? 0);
      return (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity);
    });
  const liveCount = liveVehicles.filter((v) => !v.passedStop).length;

  // Timetable departures — 60-min window, only active when modal is open
  const { departures: timetableDepartures, loading: timetableLoading } = useTimetableDepartures(
    isOpen ? stop.id : null,
    routesById,
    nowMs,
    { dataDir }
  );

  const { routes: stopRoutes } = useStopRoutes(isOpen ? stop.id : null, routesById, { dataDir });
  const { termini } = useStopTermini(isOpen ? stop.id : null, stopsById, routesById, { dataDir });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-start justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" style={{ animation: 'backdrop-fade-in 0.15s ease-out' }} onClick={onClose} />

      {/* Modal - full screen on mobile, centered card on desktop */}
      <div className="relative w-full h-full sm:w-full sm:max-w-lg sm:mx-2 sm:mt-8 sm:max-h-[90vh] sm:h-auto bg-base-100 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ animation: 'modal-fade-in 0.2s ease-out' }}>
        {/* Header */}
        <div className="p-4 border-b border-base-300">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold flex-1">{stop.name}</h2>
            <button
              onClick={() => toggleFavouriteStop(stop.id)}
              className="btn btn-ghost btn-circle btn-sm"
              title={isFav ? 'Ukloni iz favorita' : 'Dodaj u favorite'}
            >
              <Star
                className="w-5 h-5"
                fill={isFav ? 'currentColor' : 'none'}
                color={isFav ? '#f59e0b' : 'currentColor'}
              />
            </button>
            <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-base-content/60">
              {(stop.bearing !== undefined || stop.code) && (
                <span>
                  {stop.bearing !== undefined
                    ? termini.length > 0
                      ? `Smjer prema ${termini.join(', ')}`
                      : `Smjer prema ${bearingToDirection(stop.bearing)}`
                    : `Smjer ${stop.code}`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-base-content/70">
              <Clock className="w-4 h-4" />
              <span>{minutesToTime(currentTime)}</span>
            </div>
          </div>
          {/* Tab selector */}
          {stopRoutes.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {(routesExpanded ? stopRoutes : stopRoutes.slice(0, ROUTES_COLLAPSED_MAX)).map((route) => (
                <span
                  key={route.id}
                  className="badge badge-sm font-bold text-white"
                  style={{ backgroundColor: route.type === 0 ? '#2563eb' : '#d97706' }}
                >
                  {route.shortName}
                </span>
              ))}
              {!routesExpanded && stopRoutes.length > ROUTES_COLLAPSED_MAX && (
                <button
                  type="button"
                  onClick={() => setRoutesExpanded(true)}
                  className="badge badge-sm badge-ghost font-semibold cursor-pointer hover:badge-neutral"
                >
                  +{stopRoutes.length - ROUTES_COLLAPSED_MAX}
                </button>
              )}
            </div>
          )}
          {siblingPlatforms.length > 0 && !isAllTerminus && (
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-wide text-base-content/40 mb-1.5">Ostale platforme</p>
              <div className="flex flex-wrap gap-1.5">
                {(platformsExpanded ? sortedSiblingPlatforms : sortedSiblingPlatforms.slice(0, PLATFORMS_COLLAPSED_MAX)).map((s) => {
                  const routes = siblingRouteMap.get(s.id) ?? [];
                  const isTerminus = siblingTerminusSet.has(s.id);
                  const label = s.bearing !== undefined
                    ? `Smjer prema ${bearingToDirection(s.bearing)}`
                    : undefined;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onStopSelect?.(s.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs text-base-content/70 transition-colors ${isTerminus
                          ? 'bg-warning/10 border-warning/40 hover:bg-warning/20 active:bg-warning/30'
                          : 'bg-base-200/60 border-base-300 hover:bg-base-200 active:bg-base-300'
                        }`}
                      title={`Prebaci na: ${s.name}${s.bearing !== undefined ? ` (${bearingToDirection(s.bearing)})` : ''
                        }${isTerminus ? ' · odredišna' : ''}`}
                    >
                      <Navigation2
                        className="w-3.5 h-3.5 shrink-0"
                        style={s.bearing !== undefined ? { transform: `rotate(${s.bearing}deg)` } : undefined}
                      />
                      {label && <span>{label}</span>}
                      {isTerminus && <span className="badge badge-xs bg-warning/20 text-warning border-warning/30 font-semibold">odredišna</span>}
                      {routes.length > 0 && (
                        <span className="flex gap-0.5 ml-0.5">
                          {routes.slice(0, 3).map(r => (
                            <span key={r.id} className="badge badge-xs font-bold text-white" style={{ backgroundColor: r.type === 0 ? '#2563eb' : '#d97706' }}>{r.shortName}</span>
                          ))}
                          {routes.length > 3 && <span className="text-[10px] opacity-50">+{routes.length - 3}</span>}
                        </span>
                      )}
                    </button>
                  );
                })}
                {!platformsExpanded && siblingPlatforms.length > PLATFORMS_COLLAPSED_MAX && (
                  <button
                    type="button"
                    onClick={() => setPlatformsExpanded(true)}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-base-200/60 border border-base-300 hover:bg-base-200 active:bg-base-300 text-xs text-base-content/50 transition-colors"
                  >
                    +{siblingPlatforms.length - PLATFORMS_COLLAPSED_MAX}
                  </button>
                )}
              </div>
            </div>
          )}
          {/* Tab selector */}
          <StopTabSelector
            activeTab={activeTab}
            onTabChange={setActiveTab}
            liveVehicleCount={liveCount}
            hideVehicles={!hasRealtime}
            compact
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* GPS tip banner */}
          {activeTab === 'vehicles' && !vehiclesLoading && !dismissedGpsTip && (
            <div className="mx-4 mt-4 mb-3 p-4 rounded-xl bg-info/10 border border-info/30 flex gap-3 items-start">
              <Info className="w-5 h-5 text-info shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-base-content/90 mb-1">GPS prikaz vozila</p>
                <p className="text-sm text-base-content/70 leading-snug mb-1.5">
                  Ovdje možeš vidjeti <strong>vozila koja se stvarno približavaju</strong> ovom stajalištu — udaljenost i smjer u stvarnom vremenu.
                </p>
                <p className="text-sm text-base-content/50 leading-snug">
                  Prikaz se temelji na GPS signalu, neovisno o voznom redu, pa može odstupati od taba &ldquo;Red vožnje&rdquo;.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDismissedGpsTip(true)}
                className="btn btn-ghost btn-circle btn-sm shrink-0"
                title="Ne prikazuj više"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {/* Vehicles tab */}
          {activeTab === 'vehicles' && (
            vehiclesLoading ? (
              <div className="flex items-center justify-center gap-3 p-8 text-base-content/50">
                <span className="loading loading-spinner loading-sm" />
                <span>Tražim vozila...</span>
              </div>
            ) : liveVehicles.length === 0 ? (
              terminusBanner ?? (
                <div className="p-8 text-center text-base-content/50">
                  Nema GPS vozila u blizini
                </div>
              )
            ) : (
              <div className="px-4 pb-4 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold">Nadolazeća vozila</h3>
                  <span className="text-xs text-base-content/40">GPS uživo</span>
                </div>
                {liveVehicles.map((vehicle) => (
                  <ApproachingVehicleCard
                    key={vehicle.tripId}
                    vehicle={vehicle}
                    onRouteClick={(routeId, routeType) => {
                      onRouteClick(routeId, routeType);
                      onClose();
                    }}
                  />
                ))}
              </div>
            )
          )}

          {/* Timetable tab */}
          {activeTab === 'timetable' && (
            timetableLoading ? (
              <div className="flex items-center justify-center gap-3 p-8 text-base-content/50">
                <span className="loading loading-spinner loading-sm" />
                <span>Učitavam red vožnje...</span>
              </div>
            ) : timetableDepartures.length === 0 ? (
              terminusBanner ?? (
                <div className="p-8 text-center text-base-content/50">
                  Nema polazaka u sljedećih 60 min
                </div>
              )
            ) : (
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold">Red vožnje</h3>
                  <span className="text-xs text-base-content/40">slj. 60 min</span>
                </div>
                {timetableDepartures.map((dep) => (
                  <TimetableDepartureCard
                    key={dep.tripId}
                    departure={dep}
                    onRouteClick={(routeId, routeType) => {
                      onRouteClick(routeId, routeType);
                      onClose();
                    }}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
});
