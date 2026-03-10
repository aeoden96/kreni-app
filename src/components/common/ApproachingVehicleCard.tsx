/**
 * A single vehicle card in the "Vehicles" tab approaching-vehicles list.
 *
 * Distance is the primary indicator; GPS-derived time estimate is secondary.
 * Passed-stop vehicles are shown dimmed at the bottom.
 */

import { useEffect, useRef, useState } from 'react';
import type { ApproachingVehicle } from '../../hooks/useApproachingVehicles';
import { minutesToTime } from '../../utils/gtfs';

interface ApproachingVehicleCardProps {
  vehicle: ApproachingVehicle;
  onRouteClick?: (routeId: string, routeType: number) => void;
}

/** Reference window used for proportional bar width (30 min) */
const WINDOW_SECONDS = 30 * 60;

/** Format distance: metres below 1000, km above */
function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} metara`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Format GPS-derived ETA as a short string */
function formatGpsEta(seconds: number): string {
  if (seconds < 30) return 'Dolazi';
  if (seconds < 120) return `~${Math.round(seconds)} sek`;
  const mins = Math.round(seconds / 60);
  return `~${mins} min`;
}

/** Format schedule-based ETA */
function formatScheduleEta(
  seconds: number,
  isScheduled: boolean,
  etaMinutes: number,
  delaySeconds: number | null
): string {
  const prefix = isScheduled ? '~' : '';
  if (seconds <= 0) return 'Sada';
  if (seconds < 120) return `${prefix}za ${Math.round(seconds)} sek`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${prefix}za ${mins} min`;
  const adjusted = etaMinutes + (delaySeconds ?? 0) / 60;
  return `${prefix}${minutesToTime(adjusted)}`;
}

export function ApproachingVehicleCard({ vehicle, onRouteClick }: ApproachingVehicleCardProps) {
  const isScheduled = vehicle.confidence === 'scheduled';
  const isArriving = !vehicle.passedStop && vehicle.arrivingInSeconds <= 0;
  const isAtStop = vehicle.distanceMeters !== null && vehicle.distanceMeters < 15;

  // Animate out when the vehicle has arrived and is no longer in the list
  const [leaving, setLeaving] = useState(false);
  const prevArrivingRef = useRef(vehicle.arrivingInSeconds);

  useEffect(() => {
    const prev = prevArrivingRef.current;
    prevArrivingRef.current = vehicle.arrivingInSeconds;
    if (prev > 0 && vehicle.arrivingInSeconds <= 0 && !vehicle.passedStop) {
      setLeaving(true);
    }
  }, [vehicle.arrivingInSeconds, vehicle.passedStop]);

  // Progress bar: proportional to remaining time (wide = far, narrow = close / arrived)
  const remaining = Math.max(0, vehicle.arrivingInSeconds);
  const barPercent = Math.min(100, (remaining / WINDOW_SECONDS) * 100);

  // Delay info
  const delaySec = vehicle.delaySeconds ?? 0;
  const delayMin = Math.round(Math.abs(delaySec) / 60);
  const isLate = delaySec > 90;
  const isEarly = delaySec < -90;

  const badgeColor = vehicle.routeType === 0 ? '#2563eb' : '#d97706';

  // Proximity state for highlight effects
  const isNear = !vehicle.passedStop && vehicle.distanceMeters !== null && vehicle.distanceMeters < 100;
  const proximityRing = isAtStop
    ? 'ring-2 ring-success bg-success/10'
    : isNear
      ? 'ring-1 ring-success/50 bg-success/5'
      : '';
  const badgeAnim = isAtStop ? 'animate-pulse' : '';

  // Primary display: distance in meters
  let primaryText: string;
  let primaryColorClass: string;
  if (vehicle.passedStop) {
    primaryText = vehicle.distanceMeters !== null ? `${formatDistance(vehicle.distanceMeters)} ↑` : 'Prošao';
    primaryColorClass = 'text-base-content/40';
  } else if (isAtStop) {
    primaryText = 'Na stajalištu';
    primaryColorClass = 'text-success';
  } else if (vehicle.distanceMeters !== null) {
    primaryText = formatDistance(vehicle.distanceMeters);
    primaryColorClass = isArriving ? 'text-success' : isScheduled ? 'text-base-content/50' : isNear ? 'text-success' : 'text-base-content';
  } else {
    // No GPS — fall back to schedule ETA as primary
    primaryText = formatScheduleEta(vehicle.arrivingInSeconds, isScheduled, vehicle.etaMinutes, vehicle.delaySeconds);
    primaryColorClass = isArriving ? 'text-success' : isScheduled ? 'text-base-content/50' : 'text-base-content';
  }

  // Secondary: GPS time estimate (or schedule when no distance)
  let secondaryText: string | null = null;
  if (!vehicle.passedStop && !isAtStop && vehicle.distanceMeters !== null) {
    secondaryText = vehicle.etaFromGpsSeconds !== null
      ? formatGpsEta(vehicle.etaFromGpsSeconds)
      : formatScheduleEta(vehicle.arrivingInSeconds, isScheduled, vehicle.etaMinutes, vehicle.delaySeconds);
  }

  const dimClass = isScheduled || vehicle.passedStop ? 'opacity-50' : '';

  return (
    <div
      className={`card bg-base-200 overflow-hidden transition-all duration-500 ${proximityRing} ${leaving ? 'opacity-0 max-h-0 !py-0 !my-0' : 'max-h-44 opacity-100'
        }`}
    >
      <div className="card-body p-3 pb-2 gap-0">
        {/* Top row: badge + name + distance + time */}
        <div className={`flex items-center gap-2 mb-1.5 ${dimClass}`}>
          {/* Route badge */}
          <div className={`badge ${badgeAnim} font-bold shrink-0 min-w-[2.75rem] justify-center text-white`} style={{ backgroundColor: badgeColor }}>
            {vehicle.routeShortName}
          </div>

          {/* Route name + status */}
          <div className="flex-1 min-w-0">
            {onRouteClick ? (
              <button
                onClick={() => onRouteClick(vehicle.routeId, vehicle.routeType)}
                className="text-sm font-medium truncate leading-tight text-left hover:opacity-70 transition-opacity w-full block"
              >
                {vehicle.routeLongName}
              </button>
            ) : (
              <div className="text-sm font-medium truncate leading-tight">{vehicle.routeLongName}</div>
            )}
            <div className="text-xs text-base-content/50 mt-0.5 flex items-center gap-1.5">
              {vehicle.passedStop ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                  <span>Prošao stajalište</span>
                </>
              ) : vehicle.confidence === 'realtime' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0 animate-pulse" />
                  {vehicle.stopsAway !== null ? (
                    <span>
                      {vehicle.stopsAway <= 1
                        ? 'na stajalištu'
                        : `${vehicle.stopsAway - 1} ${vehicle.stopsAway - 1 === 1 ? 'stajalište' : 'stajališta'}`}
                    </span>
                  ) : (
                    <span>GPS uživo</span>
                  )}
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-base-content/30 shrink-0" />
                  <span>prema redu vožnje</span>
                </>
              )}
            </div>
          </div>

          {/* Distance (primary) + time estimate (secondary) */}
          <div className="text-right shrink-0">
            <div className={`font-bold text-base tabular-nums whitespace-nowrap ${primaryColorClass}`}>
              {primaryText}
            </div>
            {secondaryText && (
              <div className="text-xs text-base-content/50 tabular-nums">{secondaryText}</div>
            )}
            {/* Delay info when no GPS distance available */}
            {vehicle.distanceMeters === null && vehicle.delaySeconds !== null && (isLate || isEarly) && (
              <div className={`text-xs font-medium ${isLate ? 'text-error' : 'text-success'}`}>
                {isLate ? `+${delayMin}` : `-${delayMin}`} min
              </div>
            )}
            {vehicle.distanceMeters === null && vehicle.delaySeconds !== null && !isLate && !isEarly && (
              <div className="text-xs text-success font-medium">Na vrij.</div>
            )}
          </div>
        </div>

        {/* Reverse progress bar (hidden for passed-stop vehicles) */}
        {!vehicle.passedStop && (
          <div className="w-full h-1 bg-base-300 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-[4s] ease-linear ${isScheduled
                  ? 'bg-base-content/25'
                  : isArriving
                    ? 'bg-success'
                    : vehicle.routeType === 0
                      ? 'bg-blue-600'
                      : 'bg-amber-600'
                }`}
              style={{ width: `${barPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
