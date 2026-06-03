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

import { ArrowRight, Bus, MapPin, Maximize2, Navigation, Star, Train, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Route, RouteTimetable, Stop } from '../../utils/gtfs';
import type { ParsedTripUpdate, ParsedVehiclePosition } from '../../utils/realtime';
import type { VehiclePosition } from '../../utils/vehicles';

import { useSettingsStore } from '../../stores/settingsStore';
import { VehicleStopStatus } from '../../utils/realtime';
import { getRouteVehicleStopPreview } from '../../utils/vehicles';
import { getDirectionColor } from '../Map/directionColors';

interface RouteInfoBarProps {
  /** Trip update for the clicked/followed vehicle (stop time updates, delay) */
  clickedTripUpdate?: null | ParsedTripUpdate;
  /** Full VehiclePosition of the clicked/followed vehicle (headsign, delay, etc.) */
  clickedVehicle?: null | VehiclePosition;
  /** Raw realtime position of the clicked/followed vehicle (current stop, status) */
  clickedVehiclePos?: null | ParsedVehiclePosition;
  /** tripId of the last-clicked vehicle — enables the follow button */
  followCandidateTripId?: null | string;
  /** Raw realtime position of the followed vehicle — used for distance calculation */
  followedVehiclePos?: null | ParsedVehiclePosition;
  /** When true the user is actively following — shows border + distance + pulse icon */
  isFollowing?: boolean;
  /** Direction key ('0' or '1') to pre-select and lock when coming from Plan Journey. */
  journeyDirectionKey?: null | string;
  onBackToRouteOverview?: () => void;
  onClose: () => void;
  onExpand: () => void;
  /** Called with the tripId to activate follow mode */
  onFollowStart?: (tripId: string) => void;
  /** Called to exit follow mode */
  onUnfollow?: () => void;
  /** Select a vehicle from the compact list (same as map marker tap) */
  onVehicleSelect?: (tripId: string) => void;
  orderedStops?: Record<string, string[]>;
  route: Route;
  /** Route timetable for showing next N stops from static schedule */
  routeTimetable?: null | RouteTimetable;
  stopsById?: Map<string, Stop>;
  tripUpdates?: Map<string, ParsedTripUpdate>;
  vehiclePositions?: Map<string, ParsedVehiclePosition>;
  vehicles: VehiclePosition[];
}

const TRAM_COLOR = '#2563eb'; // blue-600
const BUS_COLOR = '#d97706'; // amber-600

export function RouteInfoBar({
  clickedTripUpdate,
  clickedVehicle,
  clickedVehiclePos,
  followCandidateTripId,
  followedVehiclePos,
  isFollowing = false,
  journeyDirectionKey,
  onBackToRouteOverview,
  onClose,
  onExpand,
  onFollowStart,
  onUnfollow,
  onVehicleSelect,
  orderedStops,
  route,
  routeTimetable,
  stopsById,
  tripUpdates,
  vehiclePositions,
  vehicles,
}: RouteInfoBarProps) {
  const { t } = useTranslation();
  const color = route.type === 0 ? TRAM_COLOR : BUS_COLOR;
  const isTram = route.type === 0;
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

  useEffect(() => {
    if (directionKeysSorted.length === 0) return;
    setCompactListDirectionKey(() => {
      if (journeyDirectionKey && directionKeysSorted.includes(journeyDirectionKey)) {
        return journeyDirectionKey;
      }
      return directionKeysSorted[0];
    });
  }, [directionKeysSorted, journeyDirectionKey, route.id]);

  /** Same rule as RouteModal: filter by direction index; if none match, show all. */
  const vehiclesForCompactList = useMemo(() => {
    if (vehicles.length === 0) return [];
    if (!orderedStops || directionKeysSorted.length === 0) return vehicles;
    const directionIndex =
      compactListDirectionKey && directionKeysSorted.includes(compactListDirectionKey)
        ? directionKeysSorted.indexOf(compactListDirectionKey)
        : 0;
    const dirVehicles = vehicles.filter((v) => v.direction === directionIndex);
    return dirVehicles.length > 0 ? dirVehicles : vehicles;
  }, [compactListDirectionKey, directionKeysSorted, orderedStops, vehicles]);

  const compactListSelectedDirectionIndex = useMemo(() => {
    if (
      !orderedStops ||
      !compactListDirectionKey ||
      !directionKeysSorted.includes(compactListDirectionKey)
    ) {
      return -1;
    }
    return directionKeysSorted.indexOf(compactListDirectionKey);
  }, [compactListDirectionKey, directionKeysSorted, orderedStops]);

  const sortedCompactVehicleRows = useMemo(() => {
    if (!stopsById || vehiclesForCompactList.length === 0) return [];

    const keys = orderedStops
      ? Object.keys(orderedStops).sort((a, b) => Number(a) - Number(b))
      : [];
    const dirRank = (d: number) => {
      const i = keys.indexOf(String(d));
      return i === -1 ? 999 : i;
    };

    const rows = vehiclesForCompactList.map((v) => {
      const pos = vehiclePositions?.get(v.tripId) ?? null;
      const lat = pos?.latitude ?? v.lat;
      const lon = pos?.longitude ?? v.lon;
      const tu = tripUpdates?.get(v.tripId) ?? null;
      const orderedIds = orderedStops?.[String(v.direction)] ?? [];
      const preview = getRouteVehicleStopPreview({
        orderedStopIdsForSort: orderedIds.length > 0 ? orderedIds : undefined,
        routeTimetable: routeTimetable ?? undefined,
        stopsById,
        tripId: v.tripId,
        tripUpdate: tu ?? undefined,
        vehicleLat: lat,
        vehicleLon: lon,
        vehiclePos: pos ?? undefined,
      });
      return { preview, vehicle: v };
    });

    rows.sort((a, b) => {
      const ra = dirRank(a.vehicle.direction);
      const rb = dirRank(b.vehicle.direction);
      if (ra !== rb) return ra - rb;
      if (a.preview.directionSortProgress !== b.preview.directionSortProgress) {
        return a.preview.directionSortProgress - b.preview.directionSortProgress;
      }
      return a.vehicle.tripId.localeCompare(b.vehicle.tripId);
    });
    return rows;
  }, [
    orderedStops,
    routeTimetable,
    stopsById,
    tripUpdates,
    vehiclePositions,
    vehiclesForCompactList,
  ]);

  // ── Vehicle preview: stop info (shared resolver: vehicles.ts) ──────────────
  const hasVehiclePreview = !!clickedVehicle;

  const previewLat = clickedVehiclePos?.latitude ?? clickedVehicle?.lat ?? 0;
  const previewLon = clickedVehiclePos?.longitude ?? clickedVehicle?.lon ?? 0;

  const vehiclePreview =
    hasVehiclePreview && clickedVehicle && stopsById
      ? getRouteVehicleStopPreview({
          routeTimetable: routeTimetable ?? undefined,
          stopsById,
          tripId: clickedVehicle.tripId,
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

  const { primaryStopTime, upcomingStops } = (() => {
    if (!vehiclePreview?.tripStops || !stopsById)
      return { primaryStopTime: null, upcomingStops: [] };

    const { primaryIdx, tripStops } = vehiclePreview;
    if (primaryIdx === -1) return { primaryStopTime: null, upcomingStops: [] };

    const primaryStopTime = formatMinutes(tripStops[primaryIdx][2], delaySeconds ?? 0);

    const upcoming = tripStops
      .slice(primaryIdx + 1, primaryIdx + 5)
      .map(([stopId, , timeMinutes]) => ({
        name: stopsById.get(stopId)?.name ?? stopId,
        time: formatMinutes(timeMinutes, delaySeconds ?? 0),
      }))
      .filter((s) => s.name);

    return { primaryStopTime, upcomingStops: upcoming };
  })();

  // ── Delay ─────────────────────────────────────────────────────────────────
  const delayInfo = delaySeconds !== null ? formatDelay(delaySeconds, t) : null;

  // ── Distance to next stop (follow mode only) ───────────────────────────────
  const distanceTargetStop: null | Stop = (() => {
    if (!isFollowing || !stopsById || !vehiclePreview) return null;
    const { currentStop, currentStopId, derivedNextStop, gpsNextStop, stopStatus, tripStops } =
      vehiclePreview;
    if (gpsNextStop) return gpsNextStop;
    if (stopStatus === VehicleStopStatus.STOPPED_AT && upcomingStops.length > 0) {
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
    isFollowing && followedVehiclePos && distanceTargetStop
      ? Math.round(
          haversineMeters(
            followedVehiclePos.latitude,
            followedVehiclePos.longitude,
            distanceTargetStop.lat,
            distanceTargetStop.lon
          )
        )
      : null;

  // ── Header: route name, or vehicle headsign with a vector arrow (avoid U+2192 — poor mobile font alignment)
  const showHeadsignInsteadOfRouteName =
    hasVehiclePreview && !!clickedVehicle!.headsign && clickedVehicle!.headsign !== route.longName;

  const CompactVehicleListIcon = isTram ? Train : Bus;

  return (
    <div
      className={`fixed top-16 sm:top-20 left-2 right-2 sm:left-4 sm:right-auto sm:max-w-md z-[1050] bg-base-100 rounded-xl shadow-2xl${isFollowing ? ' border-2' : ''}`}
      style={{
        animation: 'modal-fade-in 0.2s ease-out',
        ...(isFollowing ? { borderColor: color } : {}),
      }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {/* Follow indicator — pulsing nav icon when following */}
            {isFollowing && (
              <Navigation className="w-4 h-4 shrink-0 animate-pulse" style={{ color }} />
            )}
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
                  <span className="truncate">{clickedVehicle!.headsign}</span>
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
            {!isFollowing && followCandidateTripId && onFollowStart && (
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
                onUnfollow?.();
                onClose();
              }}
              title={isFollowing ? t('common.stopFollowingVehicle') : t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {hasVehiclePreview && onBackToRouteOverview ? (
          <button
            className="btn btn-outline btn-xs w-full min-h-8 h-8 px-3 mb-2 text-xs font-normal border-base-300/70"
            onClick={onBackToRouteOverview}
            type="button"
          >
            {t('routeBar.backToRouteOverview')}
          </button>
        ) : null}

        {/* Vehicle preview: stop + upcoming stops + delay */}
        {hasVehiclePreview && (
          <>
            {stopDetail ? (
              <div className="space-y-1 mb-3">
                {/* Current / approaching stop: title row (label + delay/time), then stop name */}
                <div className="flex gap-2 text-sm">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-base-content/50 mt-0.5" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {(stopLabel || delayInfo || primaryStopTime) && (
                      <div className="flex min-w-0 items-baseline justify-between gap-2">
                        {stopLabel ? (
                          <span className="min-w-0 flex-1 truncate text-xs leading-snug text-base-content/60">
                            {stopLabel}:
                          </span>
                        ) : (
                          <span className="min-w-0 flex-1" />
                        )}
                        {(delayInfo || primaryStopTime) && (
                          <span className="flex shrink-0 items-center gap-2">
                            {delayInfo && (
                              <span
                                className={`text-xs font-medium ${delayInfo.positive ? 'text-success' : 'text-error'}`}
                              >
                                {delayInfo.text}
                              </span>
                            )}
                            {primaryStopTime && (
                              <span className="text-xs font-medium tabular-nums text-base-content/70">
                                {primaryStopTime}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="font-semibold leading-snug break-words text-base-content">
                      {stopDetail}
                    </div>
                    {distanceMeters !== null && (
                      <div className="text-xs tabular-nums text-base-content/50">
                        {formatDistance(distanceMeters)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Upcoming stops from static timetable */}
                {upcomingStops.map((s, i) => (
                  <div
                    className="flex items-center gap-2 text-xs text-base-content/60 pl-5"
                    key={i}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-base-content/30 shrink-0" />
                    <span className="truncate">{s.name}</span>
                    <span className="ml-auto shrink-0 tabular-nums text-base-content/50">
                      {s.time}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback when no stop data is available yet */
              <div className="flex items-center gap-2 text-xs text-base-content/50 mb-3">
                {clickedVehiclePos ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
                    <span>{t('routeBar.gpsActiveNoStop')}</span>
                  </>
                ) : (
                  <>
                    <span className="loading loading-dots loading-xs" />
                    <span>{t('routeBar.waitingGpsSignal')}</span>
                  </>
                )}
              </div>
            )}
            <div className="border-t border-base-200 mb-3" />
          </>
        )}

        {/* Compact vehicle list or direction counts — no vehicle selected */}
        {!hasVehiclePreview &&
        vehicles.length > 0 &&
        stopsById &&
        onVehicleSelect &&
        sortedCompactVehicleRows.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-base-content/70 tracking-wide">
              {t('routeBar.liveVehiclesOnRoute')}
            </h4>
            {directionLabels.length > 0 && !journeyDirectionKey ? (
              <div className="flex rounded-lg overflow-hidden border border-base-300 w-full">
                {directionLabels.map((dir, idx) => {
                  const dirCount = vehicles.filter((v) => v.direction === idx).length;
                  const isActive = compactListDirectionKey === dir.key;
                  const ToggleVehicleIcon = isTram ? Train : Bus;
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
            <div className="max-h-[11rem] overflow-y-auto -mx-1 px-1 space-y-1">
              {sortedCompactVehicleRows.map(({ preview, vehicle }) => {
                const dirIdx = directionKeysSorted.indexOf(String(vehicle.direction));
                const dirColorIdx = dirIdx === -1 ? 0 : dirIdx;
                const directionIconColor = getDirectionColor(route.type, dirColorIdx);
                const delaySeconds =
                  tripUpdates?.get(vehicle.tripId)?.delay ?? vehicle.delay ?? null;
                const delayInfo = delaySeconds !== null ? formatDelay(delaySeconds, t) : null;
                const primaryTitle = preview.stopDetail ?? t('routeBar.positionUnknown');
                const stopName = preview.stopDetail;
                /** Dumb check: primary line is literally the other direction’s toggle label (e.g. “Dubrava” while Ljubljanica is selected). */
                const atOppositeTerminus =
                  stopName != null &&
                  compactListSelectedDirectionIndex >= 0 &&
                  directionLabels.length > 1 &&
                  directionLabels.some(
                    (d, i) => i !== compactListSelectedDirectionIndex && d.label === stopName
                  );

                return (
                  <button
                    className={[
                      'btn btn-ghost btn-sm w-full h-auto min-h-10 py-2 px-2 font-normal rounded-lg flex flex-row items-start gap-2 justify-start',
                      atOppositeTerminus
                        ? 'border border-warning/50 bg-warning/10 hover:border-warning/60'
                        : 'border border-base-200 hover:border-base-300',
                    ].join(' ')}
                    key={vehicle.tripId}
                    onClick={() => onVehicleSelect(vehicle.tripId)}
                    type="button"
                  >
                    <CompactVehicleListIcon
                      aria-hidden
                      className="w-4 h-4 shrink-0 self-start mt-0.5"
                      style={{ color: directionIconColor }}
                    />
                    <div className="flex min-w-0 flex-1 flex-row items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 text-left">
                        <span className="block font-semibold text-sm text-base-content truncate">
                          {primaryTitle}
                        </span>
                        {preview.labelKind ? (
                          <span className="block text-xs text-base-content/60 truncate">
                            {t(`routeBar.${preview.labelKind}`)}
                          </span>
                        ) : null}
                        {atOppositeTerminus ? (
                          <span className="mt-1 block text-[11px] font-medium leading-snug text-warning">
                            {t('routeBar.oppositeTerminusNote')}
                          </span>
                        ) : null}
                      </div>
                      {delayInfo ? (
                        <span
                          className={`shrink-0 text-xs font-medium tabular-nums ${
                            delayInfo.positive ? 'text-success' : 'text-error'
                          }`}
                        >
                          {delayInfo.text}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : !hasVehiclePreview && orderedStops && stopsById ? (
          <div className="flex items-center gap-3 text-xs flex-wrap">
            {isTram ? (
              <Train className="w-3.5 h-3.5 shrink-0 text-base-content/50" />
            ) : (
              <Bus className="w-3.5 h-3.5 shrink-0 text-base-content/50" />
            )}
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
        ) : !hasVehiclePreview ? (
          <div className="flex items-center gap-1.5 text-xs text-base-content/60">
            {isTram ? (
              <Train className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Bus className="w-3.5 h-3.5 shrink-0" />
            )}
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
