/**
 * Fixed stop info bar at the top — tabbed view with "Vozila" (live GPS) and "Red vožnje" (timetable).
 */

import type { TFunction } from 'i18next';

import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
  Maximize2,
  Navigation2,
  Star,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Route, Stop } from '../../utils/gtfs';

import { useGTFSMode } from '../../contexts/GTFSModeContext';
import { useApproachingVehicles } from '../../hooks/useApproachingVehicles';
import { useSiblingPlatformRoutes } from '../../hooks/useSiblingPlatformRoutes';
import { useStopRoutes } from '../../hooks/useStopRoutes';
import { useStopTermini } from '../../hooks/useStopTermini';
import { useTimetableDepartures } from '../../hooks/useTimetableDepartures';
import { useSettingsStore } from '../../stores/settingsStore';
import { bearingToCompassKey } from '../../utils/gtfs';
import { compassLabelForBearing } from '../../utils/localizedCompass';
import { type StopTab, StopTabSelector } from './StopTabSelector';
import { TimetableDepartureCard } from './TimetableDepartureCard';

interface StopInfoBarProps {
  onClose: () => void;
  onExpand: (stopId: string) => void;
  onStopSelect?: (stopId: string) => void;
  routesById: Map<string, Route>;
  /** When true, shifts the bar down so it sits below the RouteInfoBar */
  stackBelow?: boolean;
  stop: Stop;
  stopsById: Map<string, Stop>;
}

export function StopInfoBar({
  onClose,
  onExpand,
  onStopSelect,
  routesById,
  stackBelow = false,
  stop,
  stopsById,
}: StopInfoBarProps) {
  const { t } = useTranslation();
  const { dataDir, hasRealtime, timetableLookaheadMinutes } = useGTFSMode();
  const { dismissedGpsTip, favouriteStopIds, setDismissedGpsTip, toggleFavouriteStop } =
    useSettingsStore();
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

  const {
    isAllTerminus,
    loading: vehiclesLoading,
    vehicles: allVehicles,
  } = useApproachingVehicles(stop.id, stopsById, routesById, nowMs, { dataDir });

  // Sibling platforms — stops at the same parent station, or (fallback) same-named stops
  // when no parent station is set (common for bus stop pairs without GTFS grouping).
  // Parent-station siblings: deduplicated by code (each platform code is unique).
  // Same-name fallback siblings: deduplicated by bearing direction (typically 2 opposite platforms).
  const siblingPlatforms: Stop[] = (() => {
    if (stop.parentStation !== null) {
      return Array.from(stopsById.values()).filter(
        (s) => s.locationType === 0 && s.parentStation === stop.parentStation && s.id !== stop.id
      );
    }
    const raw = Array.from(stopsById.values()).filter(
      (s) =>
        s.locationType === 0 &&
        s.id !== stop.id &&
        s.name === stop.name &&
        (stop.routeType === undefined ||
          s.routeType === undefined ||
          s.routeType === stop.routeType)
    );
    const seen = new Set<string>();
    return raw.filter((s) => {
      const key = s.bearing !== undefined ? bearingToCompassKey(s.bearing) : (s.code ?? s.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  // Fetch routes for each sibling platform so we can show route badges
  const { routeMap: siblingRouteMap, terminusSet: siblingTerminusSet } = useSiblingPlatformRoutes(
    siblingPlatforms.map((s) => s.id),
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
  const departingSiblings = siblingPlatforms.filter((s) => {
    const routes = siblingRouteMap.get(s.id);
    return routes && routes.length > 0;
  });

  const terminusBanner = isAllTerminus ? (
    <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 mt-1">
      <p className="text-xs font-semibold text-warning mb-1">{t('stopView.terminusTitle')}</p>
      <p className="text-xs text-base-content/70 mb-2">
        {t('stopView.terminusBody')}
        {departingSiblings.length > 0 && ` ${t('stopView.terminusPickPlatform')}`}
      </p>
      {departingSiblings.map((s) => {
        const routes = siblingRouteMap.get(s.id) ?? [];
        const maxBadges = 6;
        return (
          <button
            className="btn btn-xs btn-warning w-full gap-1.5 mt-1 flex-wrap justify-start"
            key={s.id}
            onClick={() => onStopSelect?.(s.id)}
            type="button"
          >
            <ArrowRight className="w-3 h-3 shrink-0" />
            <span>{t('stopView.terminalButton')}</span>
            {routes.length > 0 && (
              <span className="flex flex-wrap gap-0.5 ml-1">
                {routes.slice(0, maxBadges).map((r) => (
                  <span className="badge badge-xs font-bold badge-ghost opacity-80" key={r.id}>
                    {r.shortName}
                  </span>
                ))}
                {routes.length > maxBadges && (
                  <span className="text-xs opacity-60">+{routes.length - maxBadges}</span>
                )}
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
    stopsById,
    nowMs,
    { dataDir, lookaheadMinutes: timetableLookaheadMinutes }
  );
  const topDepartures = timetableDepartures.slice(0, 4);

  const { routes: stopRoutes } = useStopRoutes(stop.id, routesById, { dataDir });
  const { termini } = useStopTermini(stop.id, stopsById, routesById, { dataDir });

  return (
    <div
      className={`fixed left-2 right-2 sm:left-4 sm:right-auto sm:max-w-md z-[1050] bg-base-100 rounded-xl shadow-2xl ${
        stackBelow ? 'top-44 sm:top-44' : 'top-16 sm:top-20'
      }`}
      data-testid="stop-info-panel"
      style={{ animation: 'modal-fade-in 0.2s ease-out' }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="mb-2">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 flex-1 min-w-0">
              <h3 className="font-bold text-base leading-tight text-base-content">{stop.name}</h3>
              {stopRoutes.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  {(routesExpanded ? stopRoutes : stopRoutes.slice(0, ROUTES_COLLAPSED_MAX)).map(
                    (route) => (
                      <span
                        className="badge badge-sm font-bold text-white"
                        key={route.id}
                        style={{ backgroundColor: route.type === 0 ? '#2563eb' : '#d97706' }}
                      >
                        {route.shortName}
                      </span>
                    )
                  )}
                  {!routesExpanded && stopRoutes.length > ROUTES_COLLAPSED_MAX && (
                    <button
                      className="badge badge-sm badge-ghost font-semibold cursor-pointer hover:badge-neutral"
                      onClick={() => setRoutesExpanded(true)}
                      type="button"
                    >
                      +{stopRoutes.length - ROUTES_COLLAPSED_MAX}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                className="btn btn-ghost btn-circle btn-xs"
                onClick={() => toggleFavouriteStop(stop.id)}
                title={isFav ? t('search.favouriteRemove') : t('search.favouriteAdd')}
              >
                <Star
                  className="w-4 h-4"
                  color={isFav ? '#f59e0b' : 'currentColor'}
                  fill={isFav ? '#f59e0b' : 'none'}
                />
              </button>
              <button
                className="btn btn-ghost btn-circle btn-xs"
                onClick={() => onExpand(stop.id)}
                title={t('common.showDetails')}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                className="btn btn-ghost btn-circle btn-xs"
                onClick={onClose}
                title={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {!isAllTerminus && (stop.bearing !== undefined || stop.code) && (
            <div className="text-xs text-base-content/60 flex items-center gap-1">
              <span>
                {stop.bearing !== undefined
                  ? termini.length > 0
                    ? t('search.headingTowards', { place: termini.join(', ') })
                    : t('search.headingTowards', { place: compassLabelForBearing(stop.bearing, t) })
                  : t('search.headingCode', { code: stop.code ?? '' })}
              </span>
            </div>
          )}
          {siblingPlatforms.length > 0 && !isAllTerminus && (
            <div className="mt-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-[10px] uppercase tracking-wide text-base-content/40">
                  {t('stopView.otherPlatforms')}
                </p>
                {siblingPlatforms.length > 1 && (
                  <button
                    aria-expanded={platformsExpanded}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-base-content/70 bg-base-200 border border-base-300 hover:bg-base-300 hover:border-base-content/20 active:scale-[0.98] transition-colors"
                    onClick={() => setPlatformsExpanded((e) => !e)}
                    type="button"
                  >
                    {platformsExpanded
                      ? t('common.hide')
                      : t('common.showAllCount', { count: siblingPlatforms.length })}
                    {platformsExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>

              {(platformsExpanded || siblingPlatforms.length === 1) && (
                <div className="flex flex-col gap-1">
                  {sortedSiblingPlatforms.map((s) => {
                    const routes = siblingRouteMap.get(s.id) ?? [];
                    const isTerminus = siblingTerminusSet.has(s.id);
                    const label =
                      s.bearing !== undefined
                        ? t('search.headingTowards', {
                            place: compassLabelForBearing(s.bearing, t),
                          })
                        : undefined;
                    return (
                      <button
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] text-base-content/70 transition-colors ${
                          isTerminus
                            ? 'bg-warning/10 border-warning/40 hover:bg-warning/20 active:bg-warning/30'
                            : 'bg-base-200/60 border-base-300 hover:bg-base-200 active:bg-base-300'
                        }`}
                        key={s.id}
                        onClick={() => onStopSelect?.(s.id)}
                        title={`${t('stopView.switchToStop', { name: s.name })}${
                          s.bearing !== undefined
                            ? t('stopView.bearingInTitle', {
                                direction: compassLabelForBearing(s.bearing, t),
                              })
                            : ''
                        }${isTerminus ? t('stopView.terminusInTitle') : ''}`}
                        type="button"
                      >
                        <Navigation2
                          className="w-2.5 h-2.5 shrink-0"
                          style={
                            s.bearing !== undefined
                              ? { transform: `rotate(${s.bearing}deg)` }
                              : undefined
                          }
                        />
                        {label && <span>{label}</span>}
                        {isTerminus && (
                          <span className="badge-xs text-warning font-semibold">
                            {t('stopView.terminusBadgeLong')}
                          </span>
                        )}
                        {routes.length > 0 && (
                          <span className="flex gap-0.5 ml-auto">
                            {routes.slice(0, 3).map((r) => (
                              <span
                                className="badge badge-xs font-bold text-white"
                                key={r.id}
                                style={{ backgroundColor: r.type === 0 ? '#2563eb' : '#d97706' }}
                              >
                                {r.shortName}
                              </span>
                            ))}
                            {routes.length > 3 && (
                              <span className="text-[10px] opacity-50">+{routes.length - 3}</span>
                            )}
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
            compact
            hideVehicles={!hasRealtime}
            liveVehicleCount={liveCount}
            onTabChange={setActiveTab}
          />
        </div>

        {/* GPS tip banner */}
        {activeTab === 'vehicles' && !vehiclesLoading && !dismissedGpsTip && (
          <div className="mt-2 mb-3 p-4 rounded-xl bg-info/10 border border-info/30 flex gap-3 items-start">
            <Info className="w-5 h-5 text-info shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-base-content/90 mb-1">
                {t('stopView.gpsTipTitle')}
              </p>
              <p className="text-sm text-base-content/70 leading-snug mb-1.5">
                {t('stopView.gpsTipBodyBar')}
              </p>
              <p className="text-sm text-base-content/50 leading-snug">
                {t('stopView.gpsTipFootnoteBar')}
              </p>
            </div>
            <button
              className="btn btn-ghost btn-circle btn-sm shrink-0"
              onClick={() => setDismissedGpsTip(true)}
              title={t('stopView.gpsTipDismiss')}
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* Vehicles tab */}
        {activeTab === 'vehicles' &&
          (vehiclesLoading ? (
            <div className="flex items-center gap-2 py-2">
              <span className="loading loading-spinner loading-sm" />
              <span className="text-sm text-base-content/60">
                {t('stopView.searchingVehicles')}
              </span>
            </div>
          ) : topVehicles.length === 0 ? (
            (terminusBanner ?? (
              <div className="text-sm text-base-content/50 py-2 text-center">
                {t('stopView.noGpsVehiclesNearby')}
              </div>
            ))
          ) : (
            <div className="space-y-2">
              {topVehicles.map((vehicle) => {
                const d = vehicle.distanceMeters;
                const isAtStop = d !== null && d < 15;

                // Primary: distance
                let primaryText: string;
                let primaryColor: string;
                if (vehicle.passedStop) {
                  primaryText = d !== null ? `${formatDist(d, t)} ↑` : t('vehicleCard.passed');
                  primaryColor = 'text-base-content/40';
                } else if (isAtStop) {
                  primaryText = t('vehicleCard.atStop');
                  primaryColor = 'text-success font-bold';
                } else if (d !== null) {
                  primaryText = formatDist(d, t);
                  primaryColor = d < 100 ? 'text-success' : 'text-base-content';
                } else {
                  const secs = Math.round(vehicle.arrivingInSeconds);
                  primaryText =
                    secs <= 0
                      ? t('timetableCard.departsNow')
                      : secs < 120
                        ? t('vehicleCard.inSeconds', { secs })
                        : t('vehicleCard.inMinutes', { mins: Math.round(secs / 60) });
                  primaryColor = secs <= 0 ? 'text-success' : 'text-base-content';
                }

                // Secondary: GPS time estimate
                let secondaryText: null | string = null;
                if (!vehicle.passedStop && !isAtStop && d !== null) {
                  const gpsSecs = vehicle.etaFromGpsSeconds;
                  if (gpsSecs !== null) {
                    secondaryText =
                      gpsSecs < 30
                        ? t('vehicleCard.arriving')
                        : gpsSecs < 120
                          ? t('vehicleCard.secondsTilde', { secs: Math.round(gpsSecs) })
                          : t('vehicleCard.minutesTilde', { mins: Math.round(gpsSecs / 60) });
                  } else {
                    const secs = Math.round(vehicle.arrivingInSeconds);
                    secondaryText =
                      secs < 120
                        ? t('vehicleCard.secondsTilde', { secs })
                        : t('vehicleCard.minutesTilde', { mins: Math.round(secs / 60) });
                  }
                }

                return (
                  <div
                    className={`flex items-center gap-2 rounded-lg px-1.5 py-1 -mx-1.5 transition-colors ${
                      vehicle.passedStop
                        ? 'opacity-50'
                        : isAtStop
                          ? 'bg-success/10 ring-1 ring-success/60'
                          : d !== null && d < 100
                            ? 'bg-success/5 ring-1 ring-success/30'
                            : ''
                    }`}
                    key={vehicle.tripId}
                  >
                    <span
                      className="badge badge-sm font-bold min-w-[2.5rem] justify-center shrink-0 text-white"
                      style={{
                        backgroundColor: vehicle.routeType === 0 ? '#2563eb' : '#d97706',
                        ...(isAtStop
                          ? { animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }
                          : {}),
                      }}
                    >
                      {vehicle.routeShortName}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-base-content/80 truncate">
                        {vehicle.tripDestinationName}
                      </div>
                      <div className="text-[11px] text-base-content/45 leading-tight flex items-center gap-1">
                        {vehicle.passedStop ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0 animate-pulse" />
                        )}
                        <span>
                          {vehicle.passedStop
                            ? t('vehicleCard.passedStop')
                            : vehicle.stopsAway !== null && vehicle.stopsAway > 1
                              ? t('vehicleCard.stopsAway', { count: vehicle.stopsAway - 1 })
                              : t('vehicleCard.nextStop')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`font-bold text-sm tabular-nums whitespace-nowrap ${primaryColor}`}
                      >
                        {primaryText}
                      </div>
                      {secondaryText && (
                        <div className="text-xs text-base-content/50 tabular-nums">
                          {secondaryText}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

        {/* Timetable tab */}
        {activeTab === 'timetable' &&
          (timetableLoading ? (
            <div className="flex items-center gap-2 py-2">
              <span className="loading loading-spinner loading-sm" />
              <span className="text-sm text-base-content/60">{t('stopView.loadingTimetable')}</span>
            </div>
          ) : topDepartures.length === 0 ? (
            (terminusBanner ?? (
              <div className="text-sm text-base-content/50 py-2 text-center">
                {t('stopView.noDeparturesInMins', { minutes: timetableLookaheadMinutes })}
              </div>
            ))
          ) : (
            <div className="space-y-2">
              {topDepartures.map((dep) => (
                <TimetableDepartureCard compact departure={dep} key={dep.tripId} />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

/** Format distance: metres below 1000, km above */
function formatDist(meters: number, t: TFunction): string {
  if (meters < 1000) return t('common.metresShort', { metres: meters });
  return t('common.kilometres', { km: (meters / 1000).toFixed(1) });
}
