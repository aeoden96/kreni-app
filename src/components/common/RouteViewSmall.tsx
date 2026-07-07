/**
 * Fixed route info bar — compact "small view" for a selected route.
 * Mirrors the StopInfoBar pattern: appears below the search bar,
 * can be expanded into the full RouteModal via the Maximize2 button.
 *
 * Three visual states:
 *  1. No vehicle selected  — scrollable vehicle list (next stop) or direction counts if none
 *  2. Vehicle clicked       — headsign + upcoming stops + delay (no vehicle list)
 *  3. Following (isFollowing) — same as #2 but with colored border, distance, pulse icon
 */

import type { TFunction } from 'i18next';

import {
  ArrowRight,
  Bus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Maximize2,
  Navigation,
  Star,
  Train,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Route, RouteTimetable, Stop } from '../../utils/gtfs';
import type { ParsedTripUpdate, ParsedVehiclePosition } from '../../utils/realtime';
import type { VehiclePosition } from '../../utils/vehicles';

import { useSettingsStore } from '../../stores/settingsStore';
import { VehicleStopStatus } from '../../utils/realtime';
import { routeTypeColor } from '../../utils/routeStyle';
import { computeVehicleStopProgress, getRouteVehicleStopPreview } from '../../utils/vehicles';
import { getDirectionColor } from '../Map/directionColors';
import { RouteMiniTrack } from './RouteMiniTrack';

interface RouteViewSmallProps {
  /** The ID of the currently selected/followed trip (even if vehicle object is missing) */
  activeTripId?: null | string;
  /** Trip update for the clicked/followed vehicle (stop time updates, delay) */
  clickedTripUpdate?: null | ParsedTripUpdate;
  /** Full VehiclePosition of the clicked/followed vehicle (headsign, delay, etc.) */
  clickedVehicle?: null | VehiclePosition;
  /** Raw realtime position of the clicked/followed vehicle (current stop, status) */
  clickedVehiclePos?: null | ParsedVehiclePosition;
  /** tripId of the last-clicked vehicle — enables the follow button */
  followCandidateTripId?: null | string;
  /** Direction key ('0' or '1') to pre-select and lock when coming from Plan Journey. */
  journeyDirectionKey?: null | string;
  /** Parent station ID of the journey origin stop (from Plan Journey). */
  journeyFromParentId?: null | string;
  /** Parent station ID of the journey destination stop (from Plan Journey). */
  journeyToParentId?: null | string;
  /** Route data is still loading — show a skeleton instead of "no active vehicles" */
  loading?: boolean;
  onClose: () => void;
  onExpand: () => void;
  /** Called with the tripId to activate follow mode */
  onFollowStart?: (tripId: string) => void;
  /** Select a vehicle from the compact list (same as map marker tap) */
  onVehicleSelect?: (tripId: string) => void;
  orderedStops?: Record<string, string[]>;
  route: Route;
  /** Route timetable for showing next N stops from static schedule */
  routeTimetable?: null | RouteTimetable;
  stopsById?: Map<string, Stop>;
  vehicles: VehiclePosition[];
}

export function RouteViewSmall({
  activeTripId,
  clickedTripUpdate,
  clickedVehicle,
  clickedVehiclePos,
  followCandidateTripId,
  journeyDirectionKey,
  journeyFromParentId,
  journeyToParentId,
  loading = false,
  onClose,
  onExpand,
  onFollowStart,
  onVehicleSelect,
  orderedStops,
  route,
  routeTimetable,
  stopsById,
  vehicles,
}: RouteViewSmallProps) {
  const { t } = useTranslation();
  const color = routeTypeColor(route.type);
  const RouteIcon = route.type === 3 ? Bus : Train;
  const { favouriteRouteIds, toggleFavouriteRoute } = useSettingsStore();
  const isFav = favouriteRouteIds.includes(route.id);

  // Group vehicles by direction (used only when no vehicle selected)
  const vehiclesByDirection: Record<string, VehiclePosition[]> = {};
  if (orderedStops) {
    Object.keys(orderedStops).forEach((dir) => {
      vehiclesByDirection[dir] = vehicles.filter((v) => String(v.direction) === dir);
    });
  }

  const directionKeysSorted = useMemo(
    () => (orderedStops ? Object.keys(orderedStops).sort((a, b) => Number(a) - Number(b)) : []),
    [orderedStops]
  );

  const directionLabels = useMemo(() => {
    if (!orderedStops || !stopsById) return [];
    return directionKeysSorted.map((key, idx) => {
      const ids = orderedStops[key] || [];
      const endId = ids[ids.length - 1] || ids[0] || null;
      const stopName = endId ? stopsById.get(endId)?.name || endId : key;
      return {
        color: getDirectionColor(route.type, idx),
        key,
        label: stopName,
      };
    });
  }, [directionKeysSorted, orderedStops, route.type, stopsById]);

  const [compactListDirectionKey, setCompactListDirectionKey] = useState('');
  const [miniTrackExpanded, setMiniTrackExpanded] = useState(false);

  useEffect(() => {
    if (directionKeysSorted.length === 0) return;
    setCompactListDirectionKey(() => {
      if (journeyDirectionKey && directionKeysSorted.includes(journeyDirectionKey)) {
        return journeyDirectionKey;
      }
      return directionKeysSorted[0];
    });
  }, [directionKeysSorted, journeyDirectionKey, route.id]);

  /** Same rule as RouteModal: filter by direction index; if none match, show all. Then sort by route progress. */
  const vehiclesForCompactList = useMemo(() => {
    if (vehicles.length === 0) return [];
    if (!orderedStops || directionKeysSorted.length === 0 || !stopsById) return vehicles;
    const directionIndex =
      compactListDirectionKey && directionKeysSorted.includes(compactListDirectionKey)
        ? directionKeysSorted.indexOf(compactListDirectionKey)
        : 0;
    const dirVehicles = vehicles.filter((v) => v.direction === directionIndex);
    const toSort = dirVehicles.length > 0 ? dirVehicles : vehicles;

    // Resolve stops to calculate progress
    const activeKey = compactListDirectionKey || directionKeysSorted[0] || '';
    const ids = orderedStops[activeKey] ?? [];
    const resolvedStops = ids.map((id) => {
      const s = stopsById.get(id);
      return s ? { lat: s.lat, lon: s.lon } : { lat: 0, lon: 0 };
    });

    return [...toSort].sort((a, b) => {
      const pa = computeVehicleStopProgress(a.lat, a.lon, resolvedStops);
      const pb = computeVehicleStopProgress(b.lat, b.lon, resolvedStops);
      return pb - pa;
    });
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

  // ── Vehicle preview: stop info (shared resolver: vehicles.ts) ──────────────
  const hasVehiclePreview = !!activeTripId;

  const previewLat = clickedVehiclePos?.latitude ?? clickedVehicle?.lat ?? 0;
  const previewLon = clickedVehiclePos?.longitude ?? clickedVehicle?.lon ?? 0;
  const previewTripId = clickedVehicle?.tripId ?? activeTripId;

  const vehiclePreview =
    hasVehiclePreview && previewTripId && stopsById
      ? getRouteVehicleStopPreview({
          routeTimetable: routeTimetable ?? undefined,
          stopsById,
          tripId: previewTripId,
          tripUpdate: clickedTripUpdate ?? undefined,
          vehicleLat: previewLat,
          vehicleLon: previewLon,
          vehiclePos: clickedVehiclePos ?? undefined,
        })
      : null;

  const delaySeconds = clickedTripUpdate?.delay ?? clickedVehicle?.delay ?? null;

  const stopLabel =
    vehiclePreview?.labelKind != null ? t(`routeBar.${vehiclePreview.labelKind}`) : '';
  const stopDetail = vehiclePreview?.stopDetail ?? '';

  const { primaryStopTime } = (() => {
    if (!stopsById) return { primaryStopTime: null };

    if (vehiclePreview?.tripStops && vehiclePreview.primaryIdx !== -1) {
      const { primaryIdx, tripStops } = vehiclePreview;
      const timeStr = formatMinutes(tripStops[primaryIdx][2], delaySeconds ?? 0);
      return { primaryStopTime: timeStr };
    }

    if (clickedTripUpdate?.stopTimeUpdates && clickedTripUpdate.stopTimeUpdates.length > 0) {
      const updates = clickedTripUpdate.stopTimeUpdates;
      const currentStopId = vehiclePreview?.currentStopId || vehiclePreview?.derivedNextStopId;
      let startIndex = 0;
      if (currentStopId) {
        const idx = updates.findIndex((u) => u.stopId === currentStopId);
        if (idx !== -1) startIndex = idx;
      }

      const formatPosix = (posix?: number) => {
        if (!posix) return '—';
        const d = new Date(posix * 1000);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      };

      const primaryUpdate = updates[startIndex];
      const primaryTime = primaryUpdate
        ? formatPosix(primaryUpdate.arrivalTime || primaryUpdate.departureTime)
        : null;

      return { primaryStopTime: primaryTime === '—' ? null : primaryTime };
    }

    return { primaryStopTime: null };
  })();

  // ── Delay ─────────────────────────────────────────────────────────────────
  const delayInfo = delaySeconds !== null ? formatDelay(delaySeconds, t) : null;

  // ── Distance to next stop ────────────────────────────────────────────────
  const distanceTargetStop: null | Stop = (() => {
    if (!stopsById || !vehiclePreview) return null;
    const { currentStop, currentStopId, derivedNextStop, gpsNextStop, stopStatus, tripStops } =
      vehiclePreview;
    if (gpsNextStop) return gpsNextStop;
    if (stopStatus === VehicleStopStatus.STOPPED_AT) {
      if (tripStops && currentStopId) {
        const idx = tripStops.findIndex(([id]) => id === currentStopId);
        if (idx !== -1 && idx + 1 < tripStops.length) {
          return stopsById.get(tripStops[idx + 1][0]) ?? null;
        }
      }
    }
    return currentStop ?? derivedNextStop;
  })();

  const distanceMeters =
    distanceTargetStop && previewLat && previewLon
      ? Math.round(
          haversineMeters(previewLat, previewLon, distanceTargetStop.lat, distanceTargetStop.lon)
        )
      : null;

  // ── Header: route name, or vehicle headsign with a vector arrow (avoid U+2192 — poor mobile font alignment)
  const showHeadsignInsteadOfRouteName =
    !!activeTripId && !!clickedVehicle?.headsign && clickedVehicle.headsign !== route.longName;

  const handlePrevVehicle = () => {
    if (!activeTripId || !onVehicleSelect) return;
    const idx = vehiclesForCompactList.findIndex((v) => v.tripId === activeTripId);
    if (idx !== -1) {
      const nextIdx = (idx + 1) % vehiclesForCompactList.length;
      onVehicleSelect(vehiclesForCompactList[nextIdx].tripId);
    }
  };

  const handleNextVehicle = () => {
    if (!activeTripId || !onVehicleSelect) return;
    const idx = vehiclesForCompactList.findIndex((v) => v.tripId === activeTripId);
    if (idx !== -1) {
      const prevIdx = (idx - 1 + vehiclesForCompactList.length) % vehiclesForCompactList.length;
      onVehicleSelect(vehiclesForCompactList[prevIdx].tripId);
    }
  };

  return (
    <div
      className="fixed top-16 sm:top-20 left-2 right-2 sm:left-4 sm:right-auto sm:max-w-md z-[1050] bg-base-100 rounded-xl shadow-2xl"
      style={{
        animation: 'modal-fade-in 0.2s ease-out',
      }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {/* Route badge */}
            <span
              className="badge font-bold text-white shrink-0 min-w-[2.5rem] justify-center"
              style={{ backgroundColor: color, borderColor: color }}
            >
              {route.shortName}
            </span>
            {/* Route name or vehicle headsign */}
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

          {/* Actions */}
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
            {/* Follow button — only shown when a vehicle is clicked but not yet followed */}
            {followCandidateTripId && onFollowStart && (
              <button
                className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
                onClick={() => onFollowStart(followCandidateTripId)}
                title={t('common.followVehicle')}
              >
                <Navigation className="w-4 h-4" />
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
              onClick={() => {
                onClose();
              }}
              title={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mini track diagram — no vehicle selected, route stop data available */}
        {orderedStops && stopsById && directionKeysSorted.length > 0 ? (
          <div className="space-y-2">
            {directionLabels.length > 0 && !journeyDirectionKey ? (
              <div className="flex rounded-lg overflow-hidden border border-base-300 w-full">
                {directionLabels.map((dir, idx) => {
                  const dirCount = vehicles.filter((v) => v.direction === idx).length;
                  const isActive = compactListDirectionKey === dir.key;
                  const ToggleVehicleIcon = RouteIcon;
                  return (
                    <button
                      className={[
                        'flex-1 flex items-center justify-between gap-1.5 px-2 py-1.5 text-xs font-semibold transition-colors min-w-0',
                        isActive
                          ? 'text-white'
                          : 'bg-base-100 text-base-content/60 hover:bg-base-200',
                      ].join(' ')}
                      key={dir.key}
                      onClick={() => setCompactListDirectionKey(dir.key)}
                      style={isActive ? { backgroundColor: dir.color } : undefined}
                      type="button"
                    >
                      <span className="truncate text-left">{dir.label}</span>
                      <span
                        className={[
                          'flex items-center gap-0.5 shrink-0 font-bold tabular-nums',
                          isActive ? 'text-white/90' : dirCount > 0 ? 'text-success' : 'opacity-30',
                        ].join(' ')}
                      >
                        {dirCount > 0 && (
                          <span
                            className={[
                              'w-1.5 h-1.5 rounded-full animate-pulse',
                              isActive ? 'bg-white/80' : 'bg-success',
                            ].join(' ')}
                          />
                        )}
                        <ToggleVehicleIcon className="w-3 h-3" />
                        {dirCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
            {(() => {
              const activeKey = compactListDirectionKey || directionKeysSorted[0] || '';
              const miniTrackIds = orderedStops[activeKey] ?? [];
              return (
                <>
                  {miniTrackSegment && (
                    <div className="flex flex-col gap-1 px-3 py-2 rounded-lg border border-primary/25 bg-primary/5">
                      <div className="flex items-center gap-2">
                        <Navigation className="w-3.5 h-3.5 shrink-0 text-primary/70" />
                        <span className="text-xs text-base-content/70">
                          {t('routeBar.journeySegmentLabel', {
                            from: stopsById.get(miniTrackIds[miniTrackSegment.fromIdx])?.name ?? '',
                            to: stopsById.get(miniTrackIds[miniTrackSegment.toIdx])?.name ?? '',
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
                  </div>
                  <RouteMiniTrack
                    activeTripId={activeTripId}
                    expanded={miniTrackExpanded}
                    journeySegment={miniTrackSegment}
                    onVehicleClick={onVehicleSelect}
                    orderedStopIds={miniTrackIds}
                    routeType={route.type}
                    stopsById={stopsById}
                    vehicles={vehiclesForCompactList}
                  />
                  {activeTripId && (
                    <div className="mt-3 bg-base-200/50 rounded-xl p-3 border border-base-300 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="flex flex-col gap-1.5 mb-3">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <span className="font-semibold text-[13px] leading-tight text-base-content truncate">
                            {stopDetail}
                          </span>
                          {primaryStopTime && (
                            <span className="text-xs font-medium tabular-nums text-base-content/70 shrink-0">
                              {primaryStopTime}
                            </span>
                          )}
                        </div>
                        {stopLabel && (
                          <div className="text-[11px] text-base-content/50">{stopLabel}</div>
                        )}
                        {(delayInfo || distanceMeters !== null) && (
                          <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
                            {delayInfo && (
                              <span
                                className={`font-medium ${delayInfo.positive ? 'text-success' : 'text-error'}`}
                              >
                                {delayInfo.text}
                              </span>
                            )}
                            {delayInfo && distanceMeters !== null && (
                              <span aria-hidden className="text-base-content/20">
                                |
                              </span>
                            )}
                            {distanceMeters !== null && (
                              <span className="font-medium text-base-content/60 tabular-nums">
                                {formatDistance(distanceMeters)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          className="btn btn-sm btn-circle btn-ghost bg-base-100 border border-base-300 shadow-sm shrink-0"
                          disabled={vehiclesForCompactList.length <= 1}
                          onClick={handlePrevVehicle}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          className="btn btn-sm flex-1 font-bold rounded-full shadow-sm text-white"
                          onClick={() => onFollowStart?.(activeTripId)}
                          style={{ backgroundColor: color, borderColor: color }}
                        >
                          {t('common.followVehicle')}
                        </button>
                        <button
                          className="btn btn-sm btn-circle btn-ghost bg-base-100 border border-base-300 shadow-sm shrink-0"
                          disabled={vehiclesForCompactList.length <= 1}
                          onClick={handleNextVehicle}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  {!activeTripId && vehiclesForCompactList.length > 0 && (
                    <p className="text-[10px] text-base-content/35 text-center mt-0.5">
                      {t('routeBar.tapVehiclesHint')}
                    </p>
                  )}
                  {vehiclesForCompactList.length === 0 && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-warning/30 bg-warning/10">
                      <RouteIcon className="w-4 h-4 shrink-0 text-warning" />
                      <span className="text-xs font-medium text-base-content/70">
                        {t('routeBar.noActiveVehiclesBanner')}
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : !hasVehiclePreview && orderedStops && stopsById ? (
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <RouteIcon className="w-3.5 h-3.5 shrink-0 text-base-content/50" />
            {directionKeysSorted.map((dir, idx) => {
              const count = vehiclesByDirection[dir]?.length || 0;
              const ids = orderedStops[dir] || [];
              const endId = ids[ids.length - 1] || ids[0] || null;
              const stopName = endId ? stopsById.get(endId)?.name || endId : '—';
              const active = count > 0;
              return (
                <span className="flex items-center gap-1" key={dir}>
                  <span
                    style={{
                      background: getDirectionColor(route.type, idx),
                      borderRadius: 2,
                      display: 'inline-block',
                      flexShrink: 0,
                      height: 10,
                      width: 10,
                    }}
                  />
                  <span className="text-base-content/70 truncate max-w-[110px]">{stopName}</span>
                  <span className={active ? 'font-semibold text-success' : 'text-base-content/40'}>
                    {count}
                  </span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
                </span>
              );
            })}
          </div>
        ) : !hasVehiclePreview && loading ? (
          <div className="space-y-2">
            <div className="skeleton h-3 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        ) : !hasVehiclePreview ? (
          <div className="flex items-center gap-1.5 text-xs text-base-content/60">
            <RouteIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{t('routeBar.noActiveVehicles')}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatDelay(seconds: number, t: TFunction): { positive: boolean; text: string } {
  const abs = Math.abs(seconds);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  const time = mins > 0 ? `${mins} min ${secs} s` : `${secs} s`;
  return seconds > 30
    ? { positive: false, text: t('routeBar.delayLate', { time }) }
    : seconds < -30
      ? { positive: true, text: t('routeBar.delayEarly', { time }) }
      : { positive: true, text: t('routeBar.onTime') };
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Format minutes-from-midnight (with optional delay in seconds) as HH:MM. */
function formatMinutes(minutesFromMidnight: number, delaySeconds: number = 0): string {
  const total = minutesFromMidnight + Math.round(delaySeconds / 60);
  const wrapped = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
