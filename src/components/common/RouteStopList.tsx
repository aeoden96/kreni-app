/**
 * RouteStopList — the metro diagram column plus its stop-name column.
 *
 * Shared by the expanded route view (`RouteViewLarge`) and the compact route
 * panel (`RouteVehiclePanel`) so both render the line of stops identically.
 * The diagram must live in the same scrollable container as the rows for the
 * dots to stay aligned, so this component owns the flex row for both.
 */

import { useTranslation } from 'react-i18next';

import type { Stop } from '../../utils/gtfs';
import type { VehiclePosition } from '../../utils/vehicles';

import { formatMinutes } from '../../utils/format';
import {
  RouteLineDiagram,
  STOP_LIST_PADDING_LEFT,
  STOP_LIST_PADDING_TOP,
  STOP_ROW_HEIGHT,
} from './RouteLineDiagram';

interface RouteStopListProps {
  /** Trip id of the currently focused vehicle, drawn with a heavier ring. */
  focusedTripId?: null | string;
  /** Journey segment to highlight — stops outside it are dimmed. */
  journeySegment?: null | { fromIdx: number; toIdx: number };
  onStopClick: (stopId: string) => void;
  /** Focus a vehicle picked off the line. */
  onVehicleClick?: (tripId: string) => void;
  /** Ordered stop IDs for the active direction. */
  orderedStopIds: string[];
  routeType: number;
  /** Accent colour for the journey endpoint markers. */
  segmentColor: string;
  stopsById: Map<string, Stop>;
  /** Calling times (stopId → minutes from midnight) of the selected run, if any. */
  stopTimes?: Map<string, number> | null;
  /** Realtime vehicles already filtered to the active direction. */
  vehicles: VehiclePosition[];
}

export function RouteStopList({
  focusedTripId,
  journeySegment,
  onStopClick,
  onVehicleClick,
  orderedStopIds,
  routeType,
  segmentColor,
  stopsById,
  stopTimes,
  vehicles,
}: RouteStopListProps) {
  const { t } = useTranslation();

  if (orderedStopIds.length === 0) {
    return (
      <div className="text-sm text-base-content/50 px-3 py-8 text-center">
        {t('routeModal.noStops')}
      </div>
    );
  }

  const lastIdx = orderedStopIds.length - 1;

  return (
    <div
      className="flex"
      style={{ paddingLeft: STOP_LIST_PADDING_LEFT, paddingTop: STOP_LIST_PADDING_TOP }}
    >
      {/* Metro line diagram column */}
      <RouteLineDiagram
        focusedTripId={focusedTripId}
        journeySegment={journeySegment}
        onVehicleClick={onVehicleClick}
        orderedStopIds={orderedStopIds}
        routeType={routeType}
        stopsById={stopsById}
        vehicles={vehicles}
      />

      {/* Stop name list */}
      <div className="flex-1 min-w-0">
        {orderedStopIds.map((stopId, idx) => {
          const isEndpoint = idx === 0 || idx === lastIdx;
          const isInSegment = journeySegment
            ? idx >= journeySegment.fromIdx && idx <= journeySegment.toIdx
            : true;
          const isJourneyEndpoint = journeySegment
            ? idx === journeySegment.fromIdx || idx === journeySegment.toIdx
            : false;
          const name = stopsById.get(stopId)?.name ?? stopId;
          const stopTime = stopTimes?.get(stopId);
          return (
            <button
              className={[
                'w-full text-left px-3 flex items-center gap-2',
                'transition-colors hover:bg-base-200 active:bg-base-300',
                isEndpoint ? 'font-semibold' : '',
                !isInSegment ? 'opacity-25' : '',
              ].join(' ')}
              key={`${stopId}-${idx}`}
              onClick={() => onStopClick(stopId)}
              style={{ height: STOP_ROW_HEIGHT }}
            >
              {isJourneyEndpoint && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: segmentColor }}
                />
              )}
              <span className="text-sm leading-tight line-clamp-1 flex-1 min-w-0">{name}</span>
              {stopTime !== undefined && (
                <span className="text-xs font-semibold tabular-nums text-base-content/60 shrink-0">
                  {formatMinutes(stopTime)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
