/**
 * Fixed overlay shown when the user is actively following a specific vehicle.
 * Replaces RouteInfoBar while follow mode is active.
 *
 * Shows:
 *  - Route badge + vehicle headsign
 *  - Current stop status (at / approaching / heading to)
 *  - Next stop (when in transit)
 *  - Delay badge
 *  - Unfollow (X) button and expand-to-route-modal button
 */

import { X, Maximize2, Navigation, MapPin, ArrowRight } from 'lucide-react';
import type { Route, Stop } from '../../utils/gtfs';
import type { ParsedVehiclePosition, ParsedTripUpdate } from '../../utils/realtime';
import { VehicleStopStatus } from '../../utils/realtime';

const TRAM_COLOR = '#2563eb';
const BUS_COLOR = '#d97706'; // amber-600

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

interface VehicleFollowBarProps {
  route: Route;
  vehiclePos: ParsedVehiclePosition | null;
  tripUpdate: ParsedTripUpdate | null;
  stopsById: Map<string, Stop>;
  onUnfollow: () => void;
  onExpand: () => void;
}

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

export function VehicleFollowBar({
  route,
  vehiclePos,
  tripUpdate,
  stopsById,
  onUnfollow,
  onExpand,
}: VehicleFollowBarProps) {
  const color = route.type === 0 ? TRAM_COLOR : BUS_COLOR;

  // ── Current stop ──────────────────────────────────────────────────────────
  const currentStopId = vehiclePos?.currentStopId;
  const status = vehiclePos?.status;
  const currentStop = currentStopId ? stopsById.get(currentStopId) : null;

  // Fallback: when the feed doesn't send currentStopId, use the first
  // remaining entry in stopTimeUpdates as the next stop.
  const stopUpdates = tripUpdate?.stopTimeUpdates ?? [];
  const derivedNextStopId = !currentStop && stopUpdates.length > 0
    ? stopUpdates[0].stopId
    : null;
  const derivedNextStop = derivedNextStopId ? stopsById.get(derivedNextStopId) ?? null : null;

  let stopLabel = '';
  let stopDetail = '';
  if (currentStop) {
    if (status === VehicleStopStatus.STOPPED_AT) {
      stopLabel = 'Na postaji';
      stopDetail = currentStop.name;
    } else if (status === VehicleStopStatus.INCOMING_AT) {
      stopLabel = 'Dolazi na';
      stopDetail = currentStop.name;
    } else {
      // IN_TRANSIT_TO or undefined
      stopLabel = 'Sljedeća postaja';
      stopDetail = currentStop.name;
    }
  } else if (derivedNextStop) {
    stopLabel = 'Sljedeća postaja';
    stopDetail = derivedNextStop.name;
  }

  // ── Next stop ─────────────────────────────────────────────────────────────
  let nextStop: Stop | null = null;
  if (currentStop && vehiclePos?.currentStopSequence !== undefined && stopUpdates.length > 0) {
    const currentSeq = vehiclePos.currentStopSequence;
    const nextUpdate = stopUpdates.find(
      (stu) => stu.stopSequence !== undefined && stu.stopSequence > currentSeq,
    );
    if (nextUpdate?.stopId) {
      nextStop = stopsById.get(nextUpdate.stopId) ?? null;
    }
  } else if (derivedNextStop && stopUpdates.length > 1) {
    // We used stopUpdates[0] as current; show stopUpdates[1] as next
    nextStop = stopsById.get(stopUpdates[1].stopId) ?? null;
  }

  // ── Delay ─────────────────────────────────────────────────────────────────
  const delaySeconds = tripUpdate?.delay ?? null;
  const delayInfo = delaySeconds !== null ? formatDelay(delaySeconds) : null;

  // ── Distance to the displayed stop ────────────────────────────────────────
  // When "Na postaji" the vehicle is already there — aim at nextStop.
  // Otherwise aim at the stop currently shown in stopDetail.
  const distanceTargetStop =
    status === VehicleStopStatus.STOPPED_AT && nextStop
      ? nextStop
      : (currentStop ?? derivedNextStop);
  const distanceMeters =
    vehiclePos && distanceTargetStop
      ? Math.round(haversineMeters(vehiclePos.latitude, vehiclePos.longitude, distanceTargetStop.lat, distanceTargetStop.lon))
      : null;

  return (
    <div
      className="fixed top-16 sm:top-20 left-2 right-2 sm:left-4 sm:right-auto sm:max-w-md z-[1050] bg-base-100 rounded-xl shadow-2xl border-2"
      style={{ animation: 'modal-fade-in 0.2s ease-out', borderColor: color }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-1 min-w-0 items-center gap-2">
            {/* Follow indicator */}
            <Navigation className="w-4 h-4 shrink-0 animate-pulse" style={{ color }} />
            {/* Route badge */}
            <span
              className="badge font-bold text-white shrink-0 min-w-[2.5rem] justify-center"
              style={{ backgroundColor: color, borderColor: color }}
            >
              {route.shortName}
            </span>
            {/* Route name */}
            <h3 className="font-bold text-base leading-tight text-base-content truncate">
              {route.longName}
            </h3>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onExpand}
              className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
              title="Prikaži detalje rute"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onUnfollow}
              className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
              title="Prestani pratiti vozilo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stop info */}
        {stopDetail ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 shrink-0 text-base-content/50" />
              <span className="text-base-content/60 text-xs">{stopLabel}:</span>
              <span className="font-semibold text-base-content truncate">{stopDetail}</span>
              {distanceMeters !== null && (
                <span className="text-xs text-base-content/50 shrink-0 ml-auto">
                  {formatDistance(distanceMeters)}
                </span>
              )}
            </div>

            {nextStop && (
              <div className="flex items-center gap-2 text-xs text-base-content/60 pl-6">
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                <span>Nakon: {nextStop.name}</span>
              </div>
            )}

            {delayInfo && (
              <div className={`text-xs pl-6 font-medium ${delayInfo.positive ? 'text-success' : 'text-error'}`}>
                {delayInfo.text}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-base-content/50 pl-0">
            {vehiclePos ? (
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
      </div>
    </div>
  );
}
