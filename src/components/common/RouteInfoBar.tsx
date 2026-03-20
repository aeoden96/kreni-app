/**
 * Fixed route info bar — compact "small view" for a selected route.
 * Mirrors the StopInfoBar pattern: appears below the search bar,
 * can be expanded into the full RouteModal via the Maximize2 button.
 *
 * Three visual states:
 *  1. No vehicle selected  — route name + direction counts
 *  2. Vehicle clicked       — headsign + upcoming stops + delay (no direction counts)
 *  3. Following (isFollowing) — same as #2 but with colored border, distance, pulse icon
 */

import { Maximize2, X, Train, Bus, Star, Navigation, MapPin } from 'lucide-react';
import type { Route, Stop, RouteTimetable } from '../../utils/gtfs';
import type { VehiclePosition } from '../../utils/vehicles';
import { computeVehicleStopProgress } from '../../utils/vehicles';
import type { ParsedVehiclePosition, ParsedTripUpdate } from '../../utils/realtime';
import { VehicleStopStatus } from '../../utils/realtime';
import { getDirectionColor } from '../Map/directionColors';
import { useSettingsStore } from '../../stores/settingsStore';

interface RouteInfoBarProps {
  route: Route;
  vehicles: VehiclePosition[];
  onExpand: () => void;
  onClose: () => void;
  orderedStops?: Record<string, string[]>;
  stopsById?: Map<string, Stop>;
  /** tripId of the last-clicked vehicle — enables the follow button */
  followCandidateTripId?: string | null;
  /** Called with the tripId to activate follow mode */
  onFollowStart?: (tripId: string) => void;
  /** Full VehiclePosition of the clicked/followed vehicle (headsign, delay, etc.) */
  clickedVehicle?: VehiclePosition | null;
  /** Raw realtime position of the clicked/followed vehicle (current stop, status) */
  clickedVehiclePos?: ParsedVehiclePosition | null;
  /** Trip update for the clicked/followed vehicle (stop time updates, delay) */
  clickedTripUpdate?: ParsedTripUpdate | null;
  /** When true the user is actively following — shows border + distance + pulse icon */
  isFollowing?: boolean;
  /** Called to exit follow mode */
  onUnfollow?: () => void;
  /** Raw realtime position of the followed vehicle — used for distance calculation */
  followedVehiclePos?: ParsedVehiclePosition | null;
  /** Route timetable for showing next N stops from static schedule */
  routeTimetable?: RouteTimetable | null;
}

const TRAM_COLOR = '#2563eb'; // blue-600
const BUS_COLOR = '#d97706';  // amber-600

function formatDelay(seconds: number): { text: string; positive: boolean } {
  const abs = Math.abs(seconds);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  const label = mins > 0 ? `${mins} min ${secs} s` : `${secs} s`;
  return seconds > 30
    ? { text: `+${label} kašnjenje`, positive: false }
    : seconds < -30
      ? { text: `${label} ispred`, positive: true }
      : { text: 'na vrijeme', positive: true };
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

export function RouteInfoBar({
  route,
  vehicles,
  onExpand,
  onClose,
  orderedStops,
  stopsById,
  followCandidateTripId,
  onFollowStart,
  clickedVehicle,
  clickedVehiclePos,
  clickedTripUpdate,
  isFollowing = false,
  onUnfollow,
  followedVehiclePos,
  routeTimetable,
}: RouteInfoBarProps) {
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

  // ── Vehicle preview: stop info ─────────────────────────────────────────────
  const hasVehiclePreview = !!clickedVehicle;

  const currentStopId = clickedVehiclePos?.currentStopId;
  const stopStatus = clickedVehiclePos?.status;
  const currentStop = currentStopId && stopsById ? stopsById.get(currentStopId) ?? null : null;

  const stopUpdates = clickedTripUpdate?.stopTimeUpdates ?? [];
  const derivedNextStopId = !currentStop && stopUpdates.length > 0 ? stopUpdates[0].stopId : null;
  const derivedNextStop =
    derivedNextStopId && stopsById ? stopsById.get(derivedNextStopId) ?? null : null;

  // ── GPS-based position in the trip's stop sequence ─────────────────────────
  // ZET's GTFS-RT trip updates only carry 2 upcoming stops and become stale
  // quickly. We use GPS geometry (same method as "Vozila u blizini") as the
  // primary anchor so the upcoming-stops list always reflects the vehicle's
  // actual real-time position.
  const delaySeconds = clickedTripUpdate?.delay ?? clickedVehicle?.delay ?? null;
  const tripId = clickedVehicle?.tripId;
  const tripStops = tripId ? routeTimetable?.[tripId] ?? null : null;

  const gpsPrimaryIdx = (() => {
    if (!clickedVehiclePos || !tripStops || !stopsById) return -1;
    const coords: Array<{ lat: number; lon: number }> = [];
    for (const [stopId] of tripStops) {
      const s = stopsById.get(stopId);
      if (!s) return -1; // abort if any stop is missing coords
      coords.push({ lat: s.lat, lon: s.lon });
    }
    if (coords.length < 2) return -1;
    const progress = computeVehicleStopProgress(
      clickedVehiclePos.latitude,
      clickedVehiclePos.longitude,
      coords,
    );
    // Math.ceil gives the next stop the vehicle hasn't reached yet.
    // Clamp to valid range so terminus vehicles don't overflow.
    return Math.min(Math.ceil(progress), tripStops.length - 1);
  })();

  // Resolve what stop name to display in the bold primary row.
  // Prefer GPS-derived next stop; fall back to GTFS-RT currentStop / derivedNextStop.
  const gpsNextStop =
    gpsPrimaryIdx !== -1 && tripStops && stopsById
      ? (stopsById.get(tripStops[gpsPrimaryIdx][0]) ?? null)
      : null;

  let stopLabel = '';
  let stopDetail = '';
  if (gpsNextStop) {
    stopLabel = 'Sljedeća postaja';
    stopDetail = gpsNextStop.name;
  } else if (currentStop) {
    if (stopStatus === VehicleStopStatus.STOPPED_AT) {
      stopLabel = 'Na postaji';
      stopDetail = currentStop.name;
    } else if (stopStatus === VehicleStopStatus.INCOMING_AT) {
      stopLabel = 'Dolazi na';
      stopDetail = currentStop.name;
    } else {
      stopLabel = 'Sljedeća postaja';
      stopDetail = currentStop.name;
    }
  } else if (derivedNextStop) {
    stopLabel = 'Sljedeća postaja';
    stopDetail = derivedNextStop.name;
  }

  // ── Upcoming stops from static timetable ──────────────────────────────────
  // primaryIdx is the GPS-based next stop (preferred) or the GTFS-RT anchor.
  // Upcoming starts from the stop AFTER that in the trip's static stop sequence.
  const { primaryStopTime, upcomingStops } = (() => {
    if (!tripStops || !stopsById) return { primaryStopTime: null, upcomingStops: [] };

    // GPS anchor (most accurate); fall back to GTFS-RT only when GPS fails.
    let primaryIdx = gpsPrimaryIdx;
    if (primaryIdx === -1) {
      const primaryId = currentStopId || derivedNextStopId;
      primaryIdx = primaryId ? tripStops.findIndex(([id]) => id === primaryId) : -1;
    }

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
  const delayInfo = delaySeconds !== null ? formatDelay(delaySeconds) : null;

  // ── Distance to next stop (follow mode only) ───────────────────────────────
  const distanceTargetStop: Stop | null = (() => {
    if (!isFollowing || !stopsById) return null;
    // Prefer GPS-derived next stop; fall back to GTFS-RT when GPS unavailable
    if (gpsNextStop) return gpsNextStop;
    // When stopped, aim at the first upcoming stop from the timetable
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
            distanceTargetStop.lon,
          ),
        )
      : null;

  // ── Header display name ────────────────────────────────────────────────────
  const displayName =
    hasVehiclePreview &&
    clickedVehicle!.headsign &&
    clickedVehicle!.headsign !== route.longName
      ? `→ ${clickedVehicle!.headsign}`
      : route.longName;

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
            <h3 className="font-bold text-base leading-tight text-base-content truncate">
              {displayName}
            </h3>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => toggleFavouriteRoute(route.id)}
              className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
              title={isFav ? 'Ukloni iz favorita' : 'Dodaj u favorite'}
            >
              <Star
                className="w-4 h-4"
                fill={isFav ? 'currentColor' : 'none'}
                color={isFav ? '#f59e0b' : 'currentColor'}
              />
            </button>
            {/* Follow button — only shown when a vehicle is clicked but not yet followed */}
            {!isFollowing && followCandidateTripId && onFollowStart && (
              <button
                onClick={() => onFollowStart(followCandidateTripId)}
                className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
                title="Prati ovo vozilo"
              >
                <Navigation className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onExpand}
              className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
              title="Prikaži detalje rute"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => { onUnfollow?.(); onClose(); }}
              className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
              title={isFollowing ? 'Prestani pratiti vozilo' : 'Zatvori'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Vehicle preview: stop + upcoming stops + delay */}
        {hasVehiclePreview && (
          <>
            {stopDetail ? (
              <div className="space-y-1 mb-3">
                {/* Current / approaching stop row */}
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-base-content/50" />
                  <span className="text-base-content/60 text-xs">{stopLabel}:</span>
                  <span className="font-semibold text-base-content truncate">{stopDetail}</span>
                  <span className="shrink-0 ml-auto flex items-center gap-2">
                    {distanceMeters !== null && (
                      <span className="text-xs text-base-content/50">
                        {formatDistance(distanceMeters)}
                      </span>
                    )}
                    {delayInfo && (
                      <span
                        className={`text-xs font-medium ${delayInfo.positive ? 'text-success' : 'text-error'}`}
                      >
                        {delayInfo.text}
                      </span>
                    )}
                    {primaryStopTime && (
                      <span className="text-xs tabular-nums text-base-content/70 font-medium">
                        {primaryStopTime}
                      </span>
                    )}
                    
                  </span>
                </div>

                {/* Upcoming stops from static timetable */}
                {upcomingStops.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs text-base-content/60 pl-5"
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
                    <span>GPS aktivan · nema podataka o postaji</span>
                  </>
                ) : (
                  <>
                    <span className="loading loading-dots loading-xs" />
                    <span>Čeka se GPS signal...</span>
                  </>
                )}
              </div>
            )}
            <div className="border-t border-base-200 mb-3" />
          </>
        )}

        {/* Direction counts — hidden when a specific vehicle is selected */}
        {!hasVehiclePreview && orderedStops && stopsById ? (
          <div className="flex items-center gap-3 text-xs flex-wrap">
            {isTram ? (
              <Train className="w-3.5 h-3.5 shrink-0 text-base-content/50" />
            ) : (
              <Bus className="w-3.5 h-3.5 shrink-0 text-base-content/50" />
            )}
            {Object.keys(orderedStops)
              .sort((a, b) => Number(a) - Number(b))
              .map((dir, idx) => {
                const count = vehiclesByDirection[dir]?.length || 0;
                const ids = orderedStops[dir] || [];
                const endId = ids[ids.length - 1] || ids[0] || null;
                const stopName = endId ? stopsById.get(endId)?.name || endId : '—';
                const active = count > 0;
                return (
                  <span key={dir} className="flex items-center gap-1">
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: getDirectionColor(route.type, idx),
                        flexShrink: 0,
                      }}
                    />
                    <span className="text-base-content/70 truncate max-w-[110px]">{stopName}</span>
                    <span className={active ? 'font-semibold text-success' : 'text-base-content/40'}>
                      {count}
                    </span>
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    )}
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
            <span>Nema aktivnih vozila</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
