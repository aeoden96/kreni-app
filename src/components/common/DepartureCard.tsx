/**
 * A single row in the unified stop departure board.
 *
 * One row per trip, regardless of whether it is GPS-tracked or schedule-only:
 *   - Primary (right): countdown to arrival from the fused ETA ("Now" / "in 4 min").
 *   - Secondary (right): clock time, with delay strike-through when realtime data is present.
 *   - Subtitle: live indicator + "2 stops away · 350 m" for GPS rows, "per timetable" otherwise.
 */

import type { TFunction } from 'i18next';

import { useTranslation } from 'react-i18next';

import type { StopDeparture } from '../../hooks/useStopDepartures';

import { minutesToTime } from '../../utils/gtfs';

interface DepartureCardProps {
  /** Compact single-row style for StopInfoBar; default false = full card for StopModal */
  compact?: boolean;
  departure: StopDeparture;
  onRouteClick?: (
    routeId: string,
    routeType: number,
    tripId: string,
    lat: null | number,
    lon: null | number
  ) => void;
}

export function DepartureCard({ compact = false, departure, onRouteClick }: DepartureCardProps) {
  const { t } = useTranslation();
  const {
    adjustedMinutes,
    delaySeconds,
    distanceMeters,
    etaSeconds,
    hasGps,
    passedStop,
    realtimeSource,
    scheduledMinutes,
  } = departure;

  const hasDelay = realtimeSource !== null && delaySeconds !== null;
  const delaySec = delaySeconds ?? 0;
  const delayMin = Math.round(Math.abs(delaySec) / 60);
  const isLate = delaySec > 90;
  const isEarly = delaySec < -90;
  const isAtStop = hasGps && !passedStop && distanceMeters !== null && distanceMeters < 15;

  const badgeColor = departure.routeType === 0 ? '#2563eb' : '#d97706';
  const clockTime = minutesToTime(hasDelay ? adjustedMinutes : scheduledMinutes);
  const scheduledClockTime = minutesToTime(scheduledMinutes);

  // Primary countdown
  const primaryText = passedStop
    ? t('vehicleCard.passedStop')
    : isAtStop
      ? t('vehicleCard.atStop')
      : formatCountdown(etaSeconds, t);
  const primaryColor = passedStop
    ? 'text-base-content/40'
    : isAtStop || etaSeconds <= 0
      ? 'text-success'
      : '';

  // Subtitle: live status + distance, or schedule chip
  const subtitle = (
    <div className="text-[11px] text-base-content/45 leading-tight flex items-center gap-1">
      {passedStop ? (
        <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
      ) : hasGps ? (
        <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0 animate-pulse" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-base-content/30 shrink-0" />
      )}
      <span className="truncate">{statusLabel(departure, t)}</span>
    </div>
  );

  // Secondary line: clock time + delay indication
  const secondary =
    hasDelay && (isLate || isEarly) ? (
      <div className="flex items-center justify-end gap-1">
        <span className="text-[11px] text-base-content/40 tabular-nums line-through">
          {scheduledClockTime}
        </span>
        <span className={`text-[11px] font-medium ${isLate ? 'text-error' : 'text-success'}`}>
          {isLate ? `+${delayMin}` : `-${delayMin}`}m
        </span>
      </div>
    ) : (
      <span className="text-[11px] text-base-content/40 tabular-nums">{clockTime}</span>
    );

  const badge = (
    <span
      className={`badge ${compact ? 'badge-sm' : ''} font-bold ${
        compact ? 'min-w-[2.5rem]' : 'min-w-[2.75rem]'
      } justify-center shrink-0 text-white`}
      style={{
        backgroundColor: badgeColor,
        ...(isAtStop ? { animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' } : {}),
      }}
    >
      {departure.routeShortName}
    </span>
  );

  const destination = onRouteClick ? (
    <button
      className={`${compact ? 'text-xs' : 'text-sm font-medium'} truncate leading-tight text-left hover:opacity-70 transition-opacity w-full block`}
      onClick={() =>
        onRouteClick(
          departure.routeId,
          departure.routeType,
          departure.tripId,
          departure.lat,
          departure.lon
        )
      }
      type="button"
    >
      {departure.tripDestinationName}
    </button>
  ) : (
    <div className={`${compact ? 'text-xs' : 'text-sm font-medium'} truncate leading-tight`}>
      {departure.tripDestinationName}
    </div>
  );

  const dimClass = passedStop ? 'opacity-50' : '';

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${dimClass}`}>
        {badge}
        <div className="flex-1 min-w-0">
          {destination}
          {subtitle}
        </div>
        <div className="text-right shrink-0">
          <div className={`font-bold text-sm tabular-nums whitespace-nowrap ${primaryColor}`}>
            {primaryText}
          </div>
          <div className="flex items-center justify-end gap-1">{secondary}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card bg-base-200 ${dimClass}`}>
      <div className="card-body p-3 gap-0">
        <div className="flex items-center gap-2">
          {badge}
          <div className="flex-1 min-w-0">
            {destination}
            <div className="mt-0.5">{subtitle}</div>
          </div>
          <div className="text-right shrink-0">
            <div className={`font-bold text-sm tabular-nums whitespace-nowrap ${primaryColor}`}>
              {primaryText}
            </div>
            <div className="mt-0.5 flex items-center justify-end gap-1">{secondary}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Format the fused ETA as a countdown. Seconds under 2 min, minutes otherwise. */
function formatCountdown(seconds: number, t: TFunction): string {
  if (seconds <= 0) return t('timetableCard.departsNow');
  if (seconds < 120) return t('vehicleCard.inSeconds', { secs: Math.round(seconds) });
  const mins = Math.round(seconds / 60);
  if (mins < 60) return t('timetableCard.inMinutes', { count: mins });
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0
    ? t('timetableCard.inHours', { hours: h })
    : t('timetableCard.inHoursMinutes', { hours: h, mins: m });
}

/** Format distance: metres below 1000, km above */
function formatDistance(meters: number, t: TFunction): string {
  if (meters < 1000) return t('common.metresShort', { metres: meters });
  return t('common.kilometres', { km: (meters / 1000).toFixed(1) });
}

/** Live status text: stops away + distance for GPS rows, schedule chip otherwise. */
function statusLabel(d: StopDeparture, t: TFunction): string {
  if (d.passedStop) return t('vehicleCard.passedStop');
  if (!d.hasGps) return t('timetableCard.perSchedule');

  const stopsPart =
    d.stopsAway !== null
      ? d.stopsAway <= 1
        ? t('vehicleCard.atPlatform')
        : t('vehicleCard.stopsAway', { count: d.stopsAway - 1 })
      : t('vehicleCard.gpsLive');

  if (d.distanceMeters !== null && d.distanceMeters >= 15) {
    return `${stopsPart} · ${formatDistance(d.distanceMeters, t)}`;
  }
  return stopsPart;
}
