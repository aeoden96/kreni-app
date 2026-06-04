/**
 * A single vehicle card in the "Vehicles" tab approaching-vehicles list.
 *
 * Distance is the primary indicator; GPS-derived time estimate is secondary.
 * Passed-stop vehicles are shown dimmed at the bottom.
 */

import type { TFunction } from 'i18next';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ApproachingVehicle } from '../../hooks/useApproachingVehicles';

import { minutesToTime } from '../../utils/gtfs';

interface ApproachingVehicleCardProps {
  onRouteClick?: (routeId: string, routeType: number, tripId: string) => void;
  vehicle: ApproachingVehicle;
}

export function ApproachingVehicleCard({ onRouteClick, vehicle }: ApproachingVehicleCardProps) {
  const { t } = useTranslation();
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

  // Delay info
  const delaySec = vehicle.delaySeconds ?? 0;
  const delayMin = Math.round(Math.abs(delaySec) / 60);
  const isLate = delaySec > 90;
  const isEarly = delaySec < -90;

  const badgeColor = vehicle.routeType === 0 ? '#2563eb' : '#d97706';

  // Proximity state for highlight effects
  const isNear =
    !vehicle.passedStop && vehicle.distanceMeters !== null && vehicle.distanceMeters < 100;
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
    primaryText =
      vehicle.distanceMeters !== null
        ? `${formatDistance(vehicle.distanceMeters, t)} ↑`
        : t('vehicleCard.passed');
    primaryColorClass = 'text-base-content/40';
  } else if (isAtStop) {
    primaryText = t('vehicleCard.atStop');
    primaryColorClass = 'text-success';
  } else if (vehicle.distanceMeters !== null) {
    primaryText = formatDistance(vehicle.distanceMeters, t);
    primaryColorClass = isArriving
      ? 'text-success'
      : isScheduled
        ? 'text-base-content/50'
        : isNear
          ? 'text-success'
          : 'text-base-content';
  } else {
    // No GPS — fall back to schedule ETA as primary
    primaryText = formatScheduleEta(
      vehicle.arrivingInSeconds,
      isScheduled,
      vehicle.etaMinutes,
      vehicle.delaySeconds,
      t
    );
    primaryColorClass = isArriving
      ? 'text-success'
      : isScheduled
        ? 'text-base-content/50'
        : 'text-base-content';
  }

  // Secondary: GPS time estimate (or schedule when no distance)
  let secondaryText: null | string = null;
  if (!vehicle.passedStop && !isAtStop && vehicle.distanceMeters !== null) {
    secondaryText =
      vehicle.etaFromGpsSeconds !== null
        ? formatGpsEta(vehicle.etaFromGpsSeconds, t)
        : formatScheduleEta(
            vehicle.arrivingInSeconds,
            isScheduled,
            vehicle.etaMinutes,
            vehicle.delaySeconds,
            t
          );
  }

  const dimClass = isScheduled || vehicle.passedStop ? 'opacity-50' : '';

  return (
    <div
      className={`card bg-base-200 overflow-hidden transition-all duration-500 ${proximityRing} ${
        leaving ? 'opacity-0 max-h-0 !py-0 !my-0' : 'max-h-44 opacity-100'
      }`}
    >
      <div className="card-body p-3 gap-0">
        {/* Top row: badge + name + distance + time */}
        <div className={`flex items-center gap-2 mb-1.5 ${dimClass}`}>
          {/* Route badge */}
          <div
            className={`badge ${badgeAnim} font-bold shrink-0 min-w-[2.75rem] justify-center text-white`}
            style={{ backgroundColor: badgeColor }}
          >
            {vehicle.routeShortName}
          </div>

          {/* Route name + status */}
          <div className="flex-1 min-w-0">
            {onRouteClick ? (
              <button
                className="text-sm font-medium truncate leading-tight text-left hover:opacity-70 transition-opacity w-full block"
                onClick={() => onRouteClick(vehicle.routeId, vehicle.routeType, vehicle.tripId)}
              >
                {vehicle.tripDestinationName}
              </button>
            ) : (
              <div className="text-sm font-medium truncate leading-tight">
                {vehicle.tripDestinationName}
              </div>
            )}
            <div className="text-xs text-base-content/50 mt-0.5 flex items-center gap-1.5">
              {vehicle.passedStop ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                  <span>{t('vehicleCard.passedStop')}</span>
                </>
              ) : vehicle.confidence === 'realtime' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0 animate-pulse" />
                  {vehicle.stopsAway !== null ? (
                    <span>
                      {vehicle.stopsAway <= 1
                        ? t('vehicleCard.atPlatform')
                        : t('vehicleCard.stopsAway', { count: vehicle.stopsAway - 1 })}
                    </span>
                  ) : (
                    <span>{t('vehicleCard.gpsLive')}</span>
                  )}
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-base-content/30 shrink-0" />
                  <span>{t('vehicleCard.perSchedule')}</span>
                </>
              )}
            </div>
          </div>

          {/* Distance (primary) + time estimate (secondary) */}
          <div className="text-right shrink-0">
            <div
              className={`font-bold text-base tabular-nums whitespace-nowrap ${primaryColorClass}`}
            >
              {primaryText}
            </div>
            {secondaryText && (
              <div className="text-xs text-base-content/50 tabular-nums">{secondaryText}</div>
            )}
            {/* Delay info when no GPS distance available */}
            {vehicle.distanceMeters === null &&
              vehicle.delaySeconds !== null &&
              (isLate || isEarly) && (
                <div className={`text-xs font-medium ${isLate ? 'text-error' : 'text-success'}`}>
                  {isLate ? `+${delayMin}` : `-${delayMin}`} min
                </div>
              )}
            {vehicle.distanceMeters === null &&
              vehicle.delaySeconds !== null &&
              !isLate &&
              !isEarly && (
                <div className="text-xs text-success font-medium">
                  {t('vehicleCard.onTimeShort')}
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Format distance: metres below 1000, km above */
function formatDistance(meters: number, t: TFunction): string {
  if (meters < 1000) return t('common.metresShort', { metres: meters });
  return t('common.kilometres', { km: (meters / 1000).toFixed(1) });
}

/** Format GPS-derived ETA as a short string */
function formatGpsEta(seconds: number, t: TFunction): string {
  if (seconds < 30) return t('vehicleCard.arriving');
  if (seconds < 120) return t('vehicleCard.secondsTilde', { secs: Math.round(seconds) });
  const mins = Math.round(seconds / 60);
  return t('vehicleCard.minutesTilde', { mins });
}

/** Format schedule-based ETA */
function formatScheduleEta(
  seconds: number,
  isScheduled: boolean,
  etaMinutes: number,
  delaySeconds: null | number,
  t: TFunction
): string {
  if (seconds <= 0) return t('vehicleCard.nowTilde');
  if (seconds < 120) {
    const s = Math.round(seconds);
    return isScheduled
      ? t('vehicleCard.secondsTilde', { secs: s })
      : t('vehicleCard.inSeconds', { secs: s });
  }
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return isScheduled
      ? t('vehicleCard.minutesTilde', { mins })
      : t('vehicleCard.inMinutes', { mins });
  }
  const adjusted = etaMinutes + (delaySeconds ?? 0) / 60;
  return `${isScheduled ? '~' : ''}${minutesToTime(adjusted)}`;
}
