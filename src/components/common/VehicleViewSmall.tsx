import type { TFunction } from 'i18next';

import { ArrowLeft, ArrowRight, Maximize2, Navigation, Star, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Route, RouteTimetable, Stop } from '../../utils/gtfs';
import type { ParsedTripUpdate, ParsedVehiclePosition } from '../../utils/realtime';
import type { VehiclePosition } from '../../utils/vehicles';

import { useSettingsStore } from '../../stores/settingsStore';
import { VehicleStopStatus } from '../../utils/realtime';
import { routeTypeColor } from '../../utils/routeStyle';
import { getRouteVehicleStopPreview } from '../../utils/vehicles';

interface VehicleViewSmallProps {
  activeTripId: string;
  clickedTripUpdate?: null | ParsedTripUpdate;
  clickedVehicle?: null | VehiclePosition;
  clickedVehiclePos?: null | ParsedVehiclePosition;
  isFollowing?: boolean;
  onBackToRouteOverview?: () => void;
  onClose: () => void;
  onExpand: () => void;
  onFollowStart?: (tripId: string) => void;
  onUnfollow?: () => void;
  route: Route;
  routeTimetable?: null | RouteTimetable;
  stopsById?: Map<string, Stop>;
  timetableLoading?: boolean;
}

export function VehicleViewSmall({
  activeTripId,
  clickedTripUpdate,
  clickedVehicle,
  clickedVehiclePos,
  isFollowing = false,
  onBackToRouteOverview,
  onClose,
  onExpand,
  onFollowStart,
  onUnfollow,
  route,
  routeTimetable,
  stopsById,
  timetableLoading = false,
}: VehicleViewSmallProps) {
  const { t } = useTranslation();
  const color = routeTypeColor(route.type);
  const { favouriteRouteIds, toggleFavouriteRoute } = useSettingsStore();
  const isFav = favouriteRouteIds.includes(route.id);

  const previewLat = clickedVehiclePos?.latitude ?? clickedVehicle?.lat ?? 0;
  const previewLon = clickedVehiclePos?.longitude ?? clickedVehicle?.lon ?? 0;

  const vehiclePreview = stopsById
    ? getRouteVehicleStopPreview({
        routeTimetable: routeTimetable ?? undefined,
        stopsById,
        tripId: activeTripId,
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
    if (!stopsById) return { primaryStopTime: null, upcomingStops: [] };

    if (vehiclePreview?.tripStops && vehiclePreview.primaryIdx !== -1) {
      const { primaryIdx, tripStops } = vehiclePreview;
      const timeStr = formatMinutes(tripStops[primaryIdx][2], delaySeconds ?? 0);
      const upcoming = tripStops
        .slice(primaryIdx + 1, primaryIdx + 5)
        .map(([stopId, , timeMinutes]) => ({
          name: stopsById.get(stopId)?.name ?? stopId,
          time: formatMinutes(timeMinutes, delaySeconds ?? 0),
        }))
        .filter((s) => s.name);
      return { primaryStopTime: timeStr, upcomingStops: upcoming };
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

      const upcoming = updates
        .slice(startIndex + 1, startIndex + 5)
        .map((u) => ({
          name: stopsById.get(u.stopId)?.name ?? u.stopId,
          time: formatPosix(u.arrivalTime || u.departureTime),
        }))
        .filter((s) => s.name);

      return { primaryStopTime: primaryTime === '—' ? null : primaryTime, upcomingStops: upcoming };
    }

    return { primaryStopTime: null, upcomingStops: [] };
  })();

  const delayInfo = delaySeconds !== null ? formatDelay(delaySeconds, t) : null;

  const distanceTargetStop: null | Stop = (() => {
    if (!stopsById || !vehiclePreview) return null;
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
    distanceTargetStop && previewLat && previewLon
      ? Math.round(
          haversineMeters(previewLat, previewLon, distanceTargetStop.lat, distanceTargetStop.lon)
        )
      : null;

  const showHeadsignInsteadOfRouteName =
    !!clickedVehicle?.headsign && clickedVehicle.headsign !== route.longName;

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
            {isFollowing && (
              <Navigation className="w-4 h-4 shrink-0 animate-pulse" style={{ color }} />
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
            {/* Follow button shown if we are in full view but map was dragged (unfollowed) */}
            {!isFollowing && onFollowStart && (
              <button
                className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
                onClick={() => onFollowStart(activeTripId)}
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

        {onBackToRouteOverview ? (
          <button
            className="btn btn-sm w-full mb-2 gap-1.5 bg-base-200 hover:bg-base-300 border-0 text-base-content/70 font-medium"
            onClick={onBackToRouteOverview}
            type="button"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('routeBar.backToRouteOverview')}
          </button>
        ) : null}

        {stopDetail ? (
          <>
            <div className="relative mb-3 mt-1">
              {(upcomingStops.length > 0 || timetableLoading) && (
                <div className="absolute left-[7px] top-[10px] bottom-1 w-[2px] bg-base-content/20 rounded-full" />
              )}

              <div
                className={`relative flex items-start ${upcomingStops.length > 0 || timetableLoading ? 'pb-3.5' : ''}`}
              >
                <div
                  className="absolute left-0 top-[2px] w-4 h-4 rounded-full bg-base-100 border-[4.5px] z-10"
                  style={{ borderColor: color }}
                />

                <div className="ml-8 min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2 min-w-0">
                    <span className="font-semibold text-sm leading-snug text-base-content truncate">
                      {stopDetail}
                    </span>
                    {primaryStopTime && (
                      <span className="text-xs font-medium tabular-nums text-base-content/70 shrink-0">
                        {primaryStopTime}
                      </span>
                    )}
                  </div>
                  {stopLabel && (
                    <div className="mt-0.5 text-xs text-base-content/50">{stopLabel}</div>
                  )}

                  {(delayInfo || distanceMeters !== null) && (
                    <div className="flex items-center gap-2 mt-2 px-2.5 py-1.5 w-fit rounded-md bg-base-200/70 border border-base-300/60 shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
                      <div className="flex flex-wrap items-center gap-x-2 text-xs">
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
                    </div>
                  )}
                </div>
              </div>

              {upcomingStops.length > 0 ? (
                <div className="space-y-3.5">
                  {upcomingStops.map((s, i) => (
                    <div
                      className="relative flex items-center text-xs text-base-content/70"
                      key={i}
                    >
                      <div className="absolute left-[3px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-base-100 border-[2.5px] border-base-content/40 z-10" />
                      <span className="ml-8 truncate font-medium">{s.name}</span>
                      <span className="ml-auto shrink-0 tabular-nums text-base-content/50">
                        {s.time}
                      </span>
                    </div>
                  ))}
                </div>
              ) : timetableLoading ? (
                <div className="space-y-3.5">
                  {[1, 2, 3].map((i) => (
                    <div className="relative flex items-center text-xs" key={i}>
                      <div className="absolute left-[3px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-base-100 border-[2.5px] border-base-content/20 z-10" />
                      <div className="ml-8 skeleton h-3 w-32" />
                      <div className="skeleton h-3 w-8 ml-auto" />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        ) : (
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
