/**
 * Fixed stop info bar at the top — tabbed view with "Vozila" (live GPS) and "Red vožnje" (timetable).
 */

import { useState, useEffect } from 'react';
import { Maximize2, X, Star, ArrowRight, Navigation2, Info } from 'lucide-react';
import type { Stop, Route } from '../../utils/gtfs';
import { bearingToDirection } from '../../utils/gtfs';
import { useApproachingVehicles } from '../../hooks/useApproachingVehicles';
import { useTimetableDepartures } from '../../hooks/useTimetableDepartures';
import { useStopRoutes } from '../../hooks/useStopRoutes';
import { useStopTermini } from '../../hooks/useStopTermini';
import { useSiblingPlatformRoutes } from '../../hooks/useSiblingPlatformRoutes';
import { useSettingsStore } from '../../stores/settingsStore';
import { useGTFSMode } from '../../contexts/GTFSModeContext';
import { StopTabSelector, type StopTab } from './StopTabSelector';
import { TimetableDepartureCard } from './TimetableDepartureCard';

/** Format distance: metres below 1000, km above */
function formatDist(meters: number): string {
  if (meters < 1000) return `${meters} metara`;
  return `${(meters / 1000).toFixed(1)} km`;
}

interface StopInfoBarProps {
  stop: Stop;
  routesById: Map<string, Route>;
  stopsById: Map<string, Stop>;
  onExpand: (stopId: string) => void;
  onClose: () => void;
  onStopSelect?: (stopId: string) => void;
  /** When true, shifts the bar down so it sits below the RouteInfoBar */
  stackBelow?: boolean;
}

export function StopInfoBar({
  stop,
  routesById,
  stopsById,
  onExpand,
  onClose,
  onStopSelect,
  stackBelow = false,
}: StopInfoBarProps) {
  const { dataDir, hasRealtime } = useGTFSMode();
  const { favouriteStopIds, toggleFavouriteStop, dismissedGpsTip, setDismissedGpsTip } = useSettingsStore();
  const isFav = favouriteStopIds.includes(stop.id);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<StopTab>(hasRealtime ? 'vehicles' : 'timetable');
  const [routesExpanded, setRoutesExpanded] = useState(false);
  const [platformsExpanded, setPlatformsExpanded] = useState(false);

  const ROUTES_COLLAPSED_MAX = 3;

  // 1-second tick for live countdown
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { vehicles: allVehicles, loading: vehiclesLoading, isAllTerminus } = useApproachingVehicles(
    stop.id,
    stopsById,
    routesById,
    nowMs
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
    <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 mt-1">
      <p className="text-xs font-semibold text-warning mb-1">Ovo je odredišna platforma</p>
      <p className="text-xs text-base-content/70 mb-2">
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
            className="btn btn-xs btn-warning w-full gap-1.5 mt-1 flex-wrap justify-start"
          >
            <ArrowRight className="w-3 h-3 shrink-0" />
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
  const topVehicles = liveVehicles.slice(0, 4);
  const liveCount = liveVehicles.filter((v) => !v.passedStop).length;

  const { departures: timetableDepartures, loading: timetableLoading } = useTimetableDepartures(
    stop.id,
    routesById,
    nowMs,
    { dataDir }
  );
  const topDepartures = timetableDepartures.slice(0, 4);

  const { routes: stopRoutes } = useStopRoutes(stop.id, routesById);
  const { termini } = useStopTermini(stop.id, stopsById);

  return (
    <div
      data-testid="stop-info-panel"
      className={`fixed left-2 right-2 sm:left-4 sm:right-auto sm:max-w-md z-[1050] bg-base-100 rounded-xl shadow-2xl ${stackBelow ? 'top-44 sm:top-44' : 'top-16 sm:top-20'
        }`}
      style={{ animation: 'modal-fade-in 0.2s ease-out' }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="mb-2">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 flex-1 min-w-0">
              <h3 className="font-bold text-base leading-tight text-base-content">
                {stop.name}
              </h3>
              {stopRoutes.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
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
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => toggleFavouriteStop(stop.id)}
                className="btn btn-ghost btn-circle btn-xs"
                title={isFav ? 'Ukloni iz favorita' : 'Dodaj u favorite'}
              >
                <Star
                  className="w-4 h-4"
                  fill={isFav ? '#f59e0b' : 'none'}
                  color={isFav ? '#f59e0b' : 'currentColor'}
                />
              </button>
              <button
                onClick={() => onExpand(stop.id)}
                className="btn btn-ghost btn-circle btn-xs"
                title="Prikaži detalje"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="btn btn-ghost btn-circle btn-xs"
                title="Zatvori"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {(stop.bearing !== undefined || stop.code) && (
            <div className="text-xs text-base-content/60 flex items-center gap-1">
              <span>
                {stop.bearing !== undefined
                  ? termini.length > 0
                    ? `Smjer prema ${termini.join(', ')}`
                    : `Smjer prema ${bearingToDirection(stop.bearing)}`
                  : `Smjer ${stop.code}`}
              </span>
            </div>
          )}
          {siblingPlatforms.length > 0 && !isAllTerminus && (
            <div className="mt-1.5">
              <div
                className={`flex items-center gap-1.5 mb-1 ${siblingPlatforms.length > 1 ? 'cursor-pointer hover:opacity-80' : ''}`}
                onClick={siblingPlatforms.length > 1 ? () => setPlatformsExpanded(e => !e) : undefined}
              >
                <p className="text-[10px] uppercase tracking-wide text-base-content/40">Ostale platforme</p>
                {siblingPlatforms.length > 1 && (
                  <span className="text-[10px] font-medium text-base-content/50 bg-base-200/80 px-1.5 rounded-full flex items-center gap-0.5">
                    {platformsExpanded ? 'Sakrij' : `Prikaži sve (${siblingPlatforms.length})`}
                  </span>
                )}
              </div>

              {(platformsExpanded || siblingPlatforms.length === 1) && (
                <div className="flex flex-col gap-1">
                  {sortedSiblingPlatforms.map((s) => {
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
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] text-base-content/70 transition-colors ${isTerminus
                          ? 'bg-warning/10 border-warning/40 hover:bg-warning/20 active:bg-warning/30'
                          : 'bg-base-200/60 border-base-300 hover:bg-base-200 active:bg-base-300'
                          }`}
                        title={`Prebaci na: ${s.name}${s.bearing !== undefined ? ` (${bearingToDirection(s.bearing)})` : ''
                          }${isTerminus ? ' · odredišna' : ''}`}
                      >
                        <Navigation2
                          className="w-2.5 h-2.5 shrink-0"
                          style={s.bearing !== undefined ? { transform: `rotate(${s.bearing}deg)` } : undefined}
                        />
                        {label && <span>{label}</span>}
                        {isTerminus && <span className="badge-xs text-warning font-semibold">Odredišna platforma</span>}
                        {routes.length > 0 && (
                          <span className="flex gap-0.5 ml-auto">
                            {routes.slice(0, 3).map(r => (
                              <span key={r.id} className="badge badge-xs font-bold text-white" style={{ backgroundColor: r.type === 0 ? '#2563eb' : '#d97706' }}>{r.shortName}</span>
                            ))}
                            {routes.length > 3 && <span className="text-[10px] opacity-50">+{routes.length - 3}</span>}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tab selector */}
        <div className="mb-2">
          <StopTabSelector
            activeTab={activeTab}
            onTabChange={setActiveTab}
            liveVehicleCount={liveCount}
            hideVehicles={!hasRealtime}
            compact
          />
        </div>

        {/* GPS tip banner */}
        {activeTab === 'vehicles' && !vehiclesLoading && !dismissedGpsTip && (
          <div className="mt-2 mb-3 p-4 rounded-xl bg-info/10 border border-info/30 flex gap-3 items-start">
            <Info className="w-5 h-5 text-info shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-base-content/90 mb-1">GPS prikaz vozila</p>
              <p className="text-sm text-base-content/70 leading-snug mb-1.5">
                Prikazuju se <strong>vozila koja se približavaju</strong> ovom stajalištu u stvarnom vremenu.
              </p>
              <p className="text-sm text-base-content/50 leading-snug">
                Temelji se na GPS signalu — može se razlikovati od &ldquo;Red vožnje&rdquo;.
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
            <div className="flex items-center gap-2 py-2">
              <span className="loading loading-spinner loading-sm" />
              <span className="text-sm text-base-content/60">Tražim vozila...</span>
            </div>
          ) : topVehicles.length === 0 ? (
            terminusBanner ?? (
              <div className="text-sm text-base-content/50 py-2 text-center">
                Nema GPS vozila u blizini
              </div>
            )
          ) : (
            <div className="space-y-2">
              {topVehicles.map((vehicle) => {
                const d = vehicle.distanceMeters;
                const isAtStop = d !== null && d < 15;

                // Primary: distance
                let primaryText: string;
                let primaryColor: string;
                if (vehicle.passedStop) {
                  primaryText = d !== null ? `${formatDist(d)} ↑` : 'Prošao';
                  primaryColor = 'text-base-content/40';
                } else if (isAtStop) {
                  primaryText = 'Na stajalištu';
                  primaryColor = 'text-success font-bold';
                } else if (d !== null) {
                  primaryText = formatDist(d);
                  primaryColor = d < 100 ? 'text-success' : 'text-base-content';
                } else {
                  const secs = Math.round(vehicle.arrivingInSeconds);
                  primaryText = secs <= 0 ? 'Sada' : secs < 120 ? `za ${secs} sek` : `za ${Math.round(secs / 60)} min`;
                  primaryColor = secs <= 0 ? 'text-success' : 'text-base-content';
                }

                // Secondary: GPS time estimate
                let secondaryText: string | null = null;
                if (!vehicle.passedStop && !isAtStop && d !== null) {
                  const gpsSecs = vehicle.etaFromGpsSeconds;
                  if (gpsSecs !== null) {
                    secondaryText = gpsSecs < 30 ? 'Dolazi' : gpsSecs < 120 ? `~${Math.round(gpsSecs)} sek` : `~${Math.round(gpsSecs / 60)} min`;
                  } else {
                    const secs = Math.round(vehicle.arrivingInSeconds);
                    secondaryText = secs < 120 ? `~${secs} sek` : `~${Math.round(secs / 60)} min`;
                  }
                }

                return (
                  <div
                    key={vehicle.tripId}
                    className={`flex items-center gap-2 rounded-lg px-1.5 py-1 -mx-1.5 transition-colors ${vehicle.passedStop ? 'opacity-50' :
                      isAtStop ? 'bg-success/10 ring-1 ring-success/60' :
                        (d !== null && d < 100) ? 'bg-success/5 ring-1 ring-success/30' :
                          ''
                      }`}
                  >
                    <span
                      className="badge badge-sm font-bold min-w-[2.5rem] justify-center shrink-0 text-white"
                      style={{
                        backgroundColor: vehicle.routeType === 0 ? '#2563eb' : '#d97706',
                        ...(isAtStop ? { animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' } : {})
                      }}
                    >
                      {vehicle.routeShortName}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-base-content/80 truncate">{vehicle.routeLongName}</div>
                      <div className="text-[11px] text-base-content/45 leading-tight flex items-center gap-1">
                        {vehicle.passedStop ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0 animate-pulse" />
                        )}
                        <span>
                          {vehicle.passedStop
                            ? 'Prošao stajalište'
                            : vehicle.stopsAway !== null && vehicle.stopsAway > 1
                              ? `${vehicle.stopsAway - 1} stajališta`
                              : 'iduće stajalište'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-bold text-sm tabular-nums whitespace-nowrap ${primaryColor}`}>
                        {primaryText}
                      </div>
                      {secondaryText && (
                        <div className="text-xs text-base-content/50 tabular-nums">{secondaryText}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Timetable tab */}
        {activeTab === 'timetable' && (
          timetableLoading ? (
            <div className="flex items-center gap-2 py-2">
              <span className="loading loading-spinner loading-sm" />
              <span className="text-sm text-base-content/60">Učitavam red vožnje...</span>
            </div>
          ) : topDepartures.length === 0 ? (
            terminusBanner ?? (
              <div className="text-sm text-base-content/50 py-2 text-center">
                Nema polazaka u sljedećih 60 min
              </div>
            )
          ) : (
            <div className="space-y-2">
              {topDepartures.map((dep) => (
                <TimetableDepartureCard key={dep.tripId} departure={dep} compact />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
