/**
 * Unified route + vehicle panel (the fixed top-left card in GTFS mode).
 *
 * A single reactive card whose content is a pure function of two facts passed in:
 *  - `activeTripId` — is a vehicle focused?
 *  - `isFollowing`  — is the map locked to it?
 *
 * States:
 *  1. Browse (no `activeTripId`)          — direction toggle + mini-track + counts
 *  2. Focused (`activeTripId`, follow off) — as above + the vehicle's itinerary & switch
 *  3. Following (`activeTripId` + follow)  — colored border, mini-track collapsed, itinerary
 */

import {
  ArrowRight,
  Bus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  MapPin,
  Maximize2,
  Navigation,
  Star,
  Train,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Route, RouteTimetable, Stop } from '../../../utils/gtfs';
import type { ParsedTripUpdate, ParsedVehiclePosition } from '../../../utils/realtime';
import type { VehiclePosition } from '../../../utils/vehicles';
import type { DirectionLabel } from './RouteDirectionToggle';

import { useGTFSMode } from '../../../contexts/GTFSModeContext';
import { useStopDepartures } from '../../../hooks/useStopDepartures';
import { useSettingsStore } from '../../../stores/settingsStore';
import { routeTypeColor } from '../../../utils/routeStyle';
import { computeVehicleStopProgress } from '../../../utils/vehicles';
import { getDirectionColor } from '../../Map/directionColors';
import { DepartureCard } from '../DepartureCard';
import { RouteMiniTrack } from '../RouteMiniTrack';
import { FocusedVehicleCard } from './FocusedVehicleCard';
import { RouteDirectionToggle } from './RouteDirectionToggle';

interface RouteVehiclePanelProps {
  activeTripId: null | string;
  clickedTripUpdate?: null | ParsedTripUpdate;
  clickedVehicle?: null | VehiclePosition;
  clickedVehiclePos?: null | ParsedVehiclePosition;
  isFollowing: boolean;
  /** Direction key ('0'/'1') to pre-select and lock when coming from Plan Journey. */
  journeyDirectionKey?: null | string;
  journeyFromParentId?: null | string;
  journeyToParentId?: null | string;
  loading?: boolean;
  /** Return to the Plan Journey results this route was opened from. */
  onBackToJourney?: () => void;
  onClose: () => void;
  onExpand: () => void;
  onFollowStart: (tripId: string) => void;
  onStopFollowing: () => void;
  /** Focus a vehicle from the mini-track (starts following). */
  onVehicleFocus: (tripId: string) => void;
  /** Switch the focused vehicle via prev/next (preserves follow state). */
  onVehicleSwitch: (tripId: string) => void;
  orderedStops?: Record<string, string[]>;
  route: Route;
  routesById?: Map<string, Route>;
  routeTimetable?: null | RouteTimetable;
  stopsById?: Map<string, Stop>;
  timetableLoading?: boolean;
  vehicles: VehiclePosition[];
}

export function RouteVehiclePanel({
  activeTripId,
  clickedTripUpdate,
  clickedVehicle,
  clickedVehiclePos,
  isFollowing,
  journeyDirectionKey,
  journeyFromParentId,
  journeyToParentId,
  loading = false,
  onBackToJourney,
  onClose,
  onExpand,
  onFollowStart,
  onStopFollowing,
  onVehicleFocus,
  onVehicleSwitch,
  orderedStops,
  route,
  routesById,
  routeTimetable,
  stopsById,
  timetableLoading = false,
  vehicles,
}: RouteVehiclePanelProps) {
  const { t } = useTranslation();
  const { dataDir } = useGTFSMode();
  const color = routeTypeColor(route.type);
  const RouteIcon = route.type === 3 ? Bus : Train;
  const { favouriteRouteIds, toggleFavouriteRoute } = useSettingsStore();
  const isFav = favouriteRouteIds.includes(route.id);

  const [compactListDirectionKey, setCompactListDirectionKey] = useState('');
  const [miniTrackExpanded, setMiniTrackExpanded] = useState(false);
  const [showOriginDepartures, setShowOriginDepartures] = useState(false);

  const directionKeysSorted = useMemo(
    () => (orderedStops ? Object.keys(orderedStops).sort((a, b) => Number(a) - Number(b)) : []),
    [orderedStops]
  );

  const directionLabels = useMemo<DirectionLabel[]>(() => {
    if (!orderedStops || !stopsById) return [];
    return directionKeysSorted.map((key, idx) => {
      const ids = orderedStops[key] || [];
      const endId = ids[ids.length - 1] || ids[0] || null;
      const stopName = endId ? stopsById.get(endId)?.name || endId : key;
      return { color: getDirectionColor(route.type, idx), key, label: stopName };
    });
  }, [directionKeysSorted, orderedStops, route.type, stopsById]);

  useEffect(() => {
    if (directionKeysSorted.length === 0) return;
    setCompactListDirectionKey(() => {
      if (journeyDirectionKey && directionKeysSorted.includes(journeyDirectionKey)) {
        return journeyDirectionKey;
      }
      return directionKeysSorted[0];
    });
  }, [directionKeysSorted, journeyDirectionKey, route.id]);

  /** Filter by direction index; if none match, show all. Then sort by route progress. */
  const vehiclesForCompactList = useMemo(() => {
    if (vehicles.length === 0) return [];
    if (!orderedStops || directionKeysSorted.length === 0 || !stopsById) return vehicles;
    const directionIndex =
      compactListDirectionKey && directionKeysSorted.includes(compactListDirectionKey)
        ? directionKeysSorted.indexOf(compactListDirectionKey)
        : 0;
    const dirVehicles = vehicles.filter((v) => v.direction === directionIndex);
    const toSort = dirVehicles.length > 0 ? dirVehicles : vehicles;

    const activeKey = compactListDirectionKey || directionKeysSorted[0] || '';
    const ids = orderedStops[activeKey] ?? [];
    const resolvedStops = ids.map((id) => {
      const s = stopsById.get(id);
      return s ? { lat: s.lat, lon: s.lon } : { lat: 0, lon: 0 };
    });

    return [...toSort].sort(
      (a, b) =>
        computeVehicleStopProgress(b.lat, b.lon, resolvedStops) -
        computeVehicleStopProgress(a.lat, a.lon, resolvedStops)
    );
  }, [compactListDirectionKey, directionKeysSorted, orderedStops, vehicles, stopsById]);

  const miniTrackSegment = useMemo(() => {
    if (!journeyFromParentId || !journeyToParentId || !stopsById) return null;
    const ids = orderedStops?.[compactListDirectionKey] ?? [];
    const fromIdx = ids.findIndex((id) => stopsById.get(id)?.parentStation === journeyFromParentId);
    let toIdx = -1;
    for (let i = ids.length - 1; i >= 0; i--) {
      if (stopsById.get(ids[i])?.parentStation === journeyToParentId) {
        toIdx = i;
        break;
      }
    }
    if (fromIdx === -1 || toIdx === -1 || toIdx <= fromIdx) return null;
    return { fromIdx, toIdx };
  }, [journeyFromParentId, journeyToParentId, compactListDirectionKey, orderedStops, stopsById]);

  const switchToOffset = (offset: number) => {
    if (!activeTripId || vehiclesForCompactList.length === 0) return;
    const idx = vehiclesForCompactList.findIndex((v) => v.tripId === activeTripId);
    if (idx === -1) return;
    const len = vehiclesForCompactList.length;
    const nextIdx = (idx + offset + len) % len;
    onVehicleSwitch(vehiclesForCompactList[nextIdx].tripId);
  };

  const showHeadsignInsteadOfRouteName =
    !!activeTripId && !!clickedVehicle?.headsign && clickedVehicle.headsign !== route.longName;

  const activeKey = compactListDirectionKey || directionKeysSorted[0] || '';
  const miniTrackIds = orderedStops?.[activeKey] ?? [];
  const hasDirections = !!orderedStops && !!stopsById && directionKeysSorted.length > 0;

  // Boarding stop of the journey — its departures can be expanded inline for
  // schedule context, especially when no live vehicles are tracked.
  const originStopId =
    miniTrackSegment && routesById ? (miniTrackIds[miniTrackSegment.fromIdx] ?? null) : null;
  const originStopName = originStopId ? stopsById?.get(originStopId)?.name : undefined;

  return (
    <div
      className="fixed top-16 sm:top-20 left-2 right-2 sm:left-4 sm:right-auto sm:max-w-md z-[1050] bg-base-100 rounded-xl shadow-2xl"
      style={{ animation: 'modal-fade-in 0.2s ease-out' }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {onBackToJourney && (
              <button
                className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px] shrink-0"
                onClick={onBackToJourney}
                title={t('routeBar.backToResults')}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <span
              className="badge font-bold text-white shrink-0 min-w-[2.5rem] justify-center"
              style={{ backgroundColor: color, borderColor: color }}
            >
              {route.shortName}
            </span>
            <h3 className="font-bold text-base leading-tight text-base-content truncate flex items-center gap-1 min-w-0">
              {showHeadsignInsteadOfRouteName ? (
                <>
                  <ArrowRight
                    aria-hidden
                    className="w-4 h-4 shrink-0 text-base-content/60 self-center"
                    strokeWidth={2.5}
                  />
                  <span className="truncate">{clickedVehicle?.headsign}</span>
                </>
              ) : (
                route.longName
              )}
            </h3>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
              onClick={() => toggleFavouriteRoute(route.id)}
              title={isFav ? t('search.favouriteRemove') : t('search.favouriteAdd')}
            >
              <Star
                className="w-4 h-4"
                color={isFav ? '#f59e0b' : 'currentColor'}
                fill={isFav ? '#f59e0b' : 'none'}
              />
            </button>
            {activeTripId && (
              <button
                className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
                onClick={() => (isFollowing ? onStopFollowing() : onFollowStart(activeTripId))}
                title={isFollowing ? t('common.stopFollowingVehicle') : t('common.followVehicle')}
              >
                <Navigation className={`w-4 h-4${isFollowing ? ' text-info' : ''}`} />
              </button>
            )}
            <button
              className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
              onClick={onExpand}
              title={t('common.showRouteDetails')}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
              onClick={onClose}
              title={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {hasDirections ? (
          <div className="space-y-2">
            {directionLabels.length > 0 && !journeyDirectionKey ? (
              <RouteDirectionToggle
                activeKey={compactListDirectionKey}
                directions={directionLabels}
                onSelect={setCompactListDirectionKey}
                routeType={route.type}
                vehicles={vehicles}
              />
            ) : null}

            {miniTrackSegment && (
              <div className="flex flex-col gap-1 px-3 py-2 rounded-lg border border-primary/25 bg-primary/5">
                <div className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 shrink-0 text-primary/70" />
                  <span className="text-xs text-base-content/70">
                    {t('routeBar.journeySegmentLabel', {
                      from: stopsById?.get(miniTrackIds[miniTrackSegment.fromIdx])?.name ?? '',
                      to: stopsById?.get(miniTrackIds[miniTrackSegment.toIdx])?.name ?? '',
                    })}
                  </span>
                </div>
                {vehiclesForCompactList.length > 0 && (
                  <span className="text-[10px] text-base-content/50 pl-[22px]">
                    {t('routeBar.catchableVehiclesHint')}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between px-0.5 mb-1">
              <span className="text-[10px] text-base-content/40 uppercase tracking-wide">
                {t('routeBar.stationsLabel')}
              </span>
              {!isFollowing && (
                <button
                  className="btn btn-ghost btn-xs p-0 h-5 w-5 min-h-0 rounded"
                  onClick={() => setMiniTrackExpanded((v) => !v)}
                  type="button"
                >
                  {miniTrackExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              {activeTripId && (
                <button
                  className="btn btn-sm btn-circle btn-ghost bg-base-100 border border-base-300 shadow-sm shrink-0"
                  disabled={vehiclesForCompactList.length <= 1}
                  onClick={() => switchToOffset(1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <div className="flex-1 min-w-0">
                <RouteMiniTrack
                  activeTripId={activeTripId}
                  expanded={miniTrackExpanded && !isFollowing}
                  journeySegment={miniTrackSegment}
                  onVehicleClick={onVehicleFocus}
                  orderedStopIds={miniTrackIds}
                  routeType={route.type}
                  stopsById={stopsById!}
                  vehicles={vehiclesForCompactList}
                />
              </div>
              {activeTripId && (
                <button
                  className="btn btn-sm btn-circle btn-ghost bg-base-100 border border-base-300 shadow-sm shrink-0"
                  disabled={vehiclesForCompactList.length <= 1}
                  onClick={() => switchToOffset(-1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {activeTripId ? (
              <FocusedVehicleCard
                activeTripId={activeTripId}
                clickedTripUpdate={clickedTripUpdate}
                clickedVehicle={clickedVehicle}
                clickedVehiclePos={clickedVehiclePos}
                color={color}
                routeTimetable={routeTimetable}
                stopsById={stopsById}
                timetableLoading={timetableLoading}
              />
            ) : vehiclesForCompactList.length > 0 ? (
              <p className="text-[10px] text-base-content/35 text-center mt-0.5">
                {t('routeBar.tapVehiclesHint')}
              </p>
            ) : (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-warning/30 bg-warning/10">
                <RouteIcon className="w-4 h-4 shrink-0 text-warning" />
                <span className="text-xs font-medium text-base-content/70">
                  {t('routeBar.noActiveVehiclesBanner')}
                </span>
              </div>
            )}

            {originStopId && stopsById && routesById && (
              <div>
                <button
                  aria-expanded={showOriginDepartures}
                  className="btn btn-sm btn-block justify-start gap-2 border border-base-300 font-normal btn-ghost"
                  onClick={() => setShowOriginDepartures((v) => !v)}
                  type="button"
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 truncate text-left text-xs">
                    {t('routeBar.viewDeparturesHere', { stop: originStopName })}
                  </span>
                  {showOriginDepartures ? (
                    <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>
                {showOriginDepartures && (
                  <div className="mt-1.5">
                    <OriginDeparturesSection
                      dataDir={dataDir}
                      routesById={routesById}
                      stopId={originStopId}
                      stopsById={stopsById}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="space-y-2">
            <div className="skeleton h-3 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-base-content/60">
            <RouteIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{t('routeBar.noActiveVehicles')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Inline departures board for the journey's boarding stop, rendered *inside* the
 * route panel (no separate overlay). Isolated as its own component so the 1s
 * clock tick only re-renders this section, not the whole panel.
 */
function OriginDeparturesSection({
  dataDir,
  routesById,
  stopId,
  stopsById,
}: {
  dataDir: string;
  routesById: Map<string, Route>;
  stopId: string;
  stopsById: Map<string, Stop>;
}) {
  const { t } = useTranslation();
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { departures, loading } = useStopDepartures(stopId, routesById, stopsById, nowMs, {
    dataDir,
  });
  const top = departures.slice(0, 4);

  if (loading && departures.length === 0) {
    return (
      <p className="px-1 py-1 text-[11px] text-base-content/50">{t('stopView.loadingTimetable')}</p>
    );
  }
  if (top.length === 0) {
    return (
      <p className="px-1 py-1 text-[11px] text-base-content/50">
        {t('stopView.noDeparturesInMins', { minutes: 60 })}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {top.map((dep) => (
        <DepartureCard compact departure={dep} key={dep.tripId} />
      ))}
      {departures.length > top.length && (
        <span className="px-1 text-[11px] text-base-content/50">
          {t('stopView.seeAllCount', { count: departures.length })}
        </span>
      )}
    </div>
  );
}
