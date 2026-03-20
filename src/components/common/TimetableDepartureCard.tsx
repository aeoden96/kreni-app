/**
 * A single departure row in the timetable tab.
 *
 * Primary: minutes until departure ("za X min" / "Sada").
 * Secondary: clock time (HH:MM), with delay indication when realtime data present.
 */

import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { TimetableDeparture } from '../../hooks/useTimetableDepartures';
import { minutesToTime } from '../../utils/gtfs';

interface TimetableDepartureCardProps {
  departure: TimetableDeparture;
  onRouteClick?: (routeId: string, routeType: number) => void;
  /** Compact single-row style for StopInfoBar; default false = card style */
  compact?: boolean;
}

/** Format "minutes until" as a human-readable countdown */
function formatMinutesUntil(mins: number, t: TFunction): string {
  if (mins <= 0) return t('timetableCard.departsNow');
  if (mins === 1) return t('timetableCard.inOneMin');
  if (mins < 60) return t('timetableCard.inMinutes', { count: mins });
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0
    ? t('timetableCard.inHours', { hours: h })
    : t('timetableCard.inHoursMinutes', { hours: h, mins: m });
}

export function TimetableDepartureCard({
  departure,
  onRouteClick,
  compact = false,
}: TimetableDepartureCardProps) {
  const { t } = useTranslation();
  const { delaySeconds, scheduledMinutes, adjustedMinutes, realtimeSource, minutesUntil } = departure;
  const hasRealtime = realtimeSource !== null && delaySeconds !== null;
  const delaySec = delaySeconds ?? 0;
  const delayMin = Math.round(Math.abs(delaySec) / 60);
  const isLate = delaySec > 90;
  const isEarly = delaySec < -90;
  const isOnTime = hasRealtime && !isLate && !isEarly;

  const badgeColor = departure.routeType === 0 ? '#2563eb' : '#d97706';
  const countdownText = formatMinutesUntil(minutesUntil, t);
  // Clock time: show adjusted if there's a delay, else scheduled
  const clockTime = minutesToTime(hasRealtime ? adjustedMinutes : scheduledMinutes);
  const scheduledClockTime = minutesToTime(scheduledMinutes);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="badge badge-sm font-bold min-w-[2.5rem] justify-center shrink-0 text-white"
          style={{ backgroundColor: badgeColor }}
        >
          {departure.routeShortName}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-base-content/80 truncate">{departure.tripDestinationName}</div>
          <div className="text-[11px] text-base-content/45 leading-tight flex items-center gap-1">
            {hasRealtime ? (
              <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0 animate-pulse" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-base-content/30 shrink-0" />
            )}
            <span>{hasRealtime ? t('timetableCard.gpsLive') : t('timetableCard.scheduleOnly')}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          {/* Primary: countdown */}
          <div className={`font-bold text-sm tabular-nums ${minutesUntil <= 0 ? 'text-success' : ''}`}>
            {countdownText}
          </div>
          {/* Secondary: clock time + delay badge */}
          <div className="flex items-center justify-end gap-1">
            {hasRealtime && (isLate || isEarly) ? (
              <>
                <span className="text-[11px] text-base-content/40 tabular-nums line-through">{scheduledClockTime}</span>
                <span className={`text-[11px] font-medium ${isLate ? 'text-error' : 'text-success'}`}>
                  {isLate ? `+${delayMin}` : `-${delayMin}`}m
                </span>
              </>
            ) : (
              <span className="text-[11px] text-base-content/40 tabular-nums">{clockTime}</span>
            )}
            {isOnTime && <span className="text-[11px] text-success">✓</span>}
          </div>
        </div>
      </div>
    );
  }

  // Full card style for StopModal
  return (
    <div className="card bg-base-200">
      <div className="card-body p-3 gap-0">
        <div className="flex items-center gap-2">
          {/* Route badge */}
          <div className="badge font-bold shrink-0 min-w-[2.75rem] justify-center text-white" style={{ backgroundColor: badgeColor }}>
            {departure.routeShortName}
          </div>

          {/* Route name */}
          <div className="flex-1 min-w-0">
            {onRouteClick ? (
              <button
                onClick={() => onRouteClick(departure.routeId, departure.routeType)}
                className="text-sm font-medium truncate leading-tight text-left hover:opacity-70 transition-opacity w-full block"
              >
                {departure.tripDestinationName}
              </button>
            ) : (
              <div className="text-sm font-medium truncate leading-tight">{departure.tripDestinationName}</div>
            )}
            <div className="text-xs text-base-content/50 mt-0.5 flex items-center gap-1.5">
              {hasRealtime ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0 animate-pulse" />
                  <span>{t('timetableCard.gpsLive')}</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-base-content/30 shrink-0" />
                  <span>{t('timetableCard.perSchedule')}</span>
                </>
              )}
            </div>
          </div>

          {/* Countdown (primary) + clock time (secondary) */}
          <div className="text-right shrink-0">
            <div className={`font-bold text-sm tabular-nums ${minutesUntil <= 0 ? 'text-success' : ''}`}>
              {countdownText}
            </div>
            {hasRealtime && (isLate || isEarly) ? (
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <span className="text-[11px] text-base-content/40 tabular-nums line-through">{scheduledClockTime}</span>
                <span className={`text-xs font-medium ${isLate ? 'text-error' : 'text-success'}`}>
                  {isLate ? `+${delayMin}` : `-${delayMin}`} min
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-base-content/40 tabular-nums mt-0.5">
                {clockTime}
                {isOnTime && <span className="ml-1 text-success">✓</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
