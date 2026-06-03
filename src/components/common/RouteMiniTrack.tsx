import { Bus, Train } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import type { Stop } from '../../utils/gtfs';
import type { VehiclePosition } from '../../utils/vehicles';

import { computeVehicleStopProgress } from '../../utils/vehicles';

const TRAM_COLOR = '#2563eb';
const BUS_COLOR = '#d97706';
const STOP_PITCH = 56;
const EDGE_PAD = 20;
const TRACK_ROW_H = 28;
const NAME_ROW_H = 18;
const TOTAL_H = TRACK_ROW_H + NAME_ROW_H;

interface RouteMiniTrackProps {
  expanded?: boolean;
  journeySegment?: null | { fromIdx: number; toIdx: number };
  onVehicleClick?: (tripId: string) => void;
  orderedStopIds: string[];
  routeType: number;
  stopsById: Map<string, Stop>;
  vehicles: VehiclePosition[];
}

export function RouteMiniTrack({
  expanded = false,
  journeySegment,
  onVehicleClick,
  orderedStopIds,
  routeType,
  stopsById,
  vehicles,
}: RouteMiniTrackProps) {
  const color = routeType === 0 ? TRAM_COLOR : BUS_COLOR;
  const stopCount = orderedStopIds.length;

  const resolvedStops = useMemo(
    () =>
      orderedStopIds.map((id) => {
        const s = stopsById.get(id);
        return s ? { lat: s.lat, lon: s.lon } : { lat: 0, lon: 0 };
      }),
    [orderedStopIds, stopsById]
  );

  const vehicleMarkers = useMemo(
    () =>
      vehicles.map((v) => ({
        progress: computeVehicleStopProgress(v.lat, v.lon, resolvedStops),
        vehicle: v,
      })),
    [vehicles, resolvedStops]
  );

  // Expanded mode: fixed-pitch pixel positioning
  const tickLeft = (idx: number) => EDGE_PAD + idx * STOP_PITCH;
  const vehicleLeftPx = (p: number) =>
    EDGE_PAD + Math.max(0, Math.min(stopCount - 1, p)) * STOP_PITCH;

  // Collapsed mode: percentage positioning within the track container
  const toPercent = (p: number) =>
    (Math.max(0, Math.min(stopCount - 1, p)) / (stopCount - 1)) * 100;

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const el = scrollRef.current;
    if (!el) return;
    let targetPx: number | undefined;
    if (vehicleMarkers.length > 0) {
      targetPx = vehicleLeftPx(vehicleMarkers[0].progress);
    } else if (journeySegment) {
      targetPx = tickLeft(journeySegment.fromIdx);
    }
    if (targetPx !== undefined) {
      el.scrollLeft = targetPx - el.clientWidth / 2;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, vehicleMarkers, journeySegment, orderedStopIds]);

  if (stopCount < 2) return null;

  // Vehicle has already passed the journey boarding stop → dim it
  const vehicleOpacity = (progress: number) =>
    journeySegment && progress >= journeySegment.fromIdx ? 0.25 : 1;

  // ── Shared: vehicle marker renderer ────────────────────────────────────────
  const renderVehicleMarker = (
    left: number | string,
    vehicle: VehiclePosition,
    idx: number,
    usePercent: boolean,
    opacity: number
  ) => {
    const label = vehicle.headsign || (vehicle.direction === 0 ? 'A' : 'B');
    const VehicleIcon = routeType === 0 ? Train : Bus;
    const offsetTop = TRACK_ROW_H / 2 - 12;

    return (
      <div
        className="absolute"
        key={`v-${idx}`}
        style={{
          left: usePercent ? `${left}%` : left,
          opacity,
          top: offsetTop,
          transform: 'translateX(-50%)',
          zIndex: 2,
        }}
      >
        <button
          className="flex items-center justify-center rounded-full"
          onClick={() => onVehicleClick?.(vehicle.tripId)}
          style={{
            backgroundColor: color,
            border: '1.5px solid white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
            cursor: onVehicleClick ? 'pointer' : 'default',
            height: 24,
            width: 24,
          }}
          title={label}
          type="button"
        >
          <VehicleIcon color="white" size={14} strokeWidth={2.5} />
        </button>
      </div>
    );
  };

  // ── COLLAPSED MODE ──────────────────────────────────────────────────────────
  if (!expanded) {
    const startName = stopsById.get(orderedStopIds[0])?.name ?? '';
    const endName = stopsById.get(orderedStopIds[stopCount - 1])?.name ?? '';

    const segFromPct = journeySegment ? toPercent(journeySegment.fromIdx) : null;
    const segToPct = journeySegment ? toPercent(journeySegment.toIdx) : null;

    return (
      <div aria-hidden="true" className="w-full select-none">
        {/* Terminal labels */}
        <div className="flex justify-between mb-1 px-1 gap-2">
          <span className="text-[11px] text-base-content/50 truncate max-w-[45%]">{startName}</span>
          <span className="text-[11px] text-base-content/50 truncate max-w-[45%] text-right">
            {endName}
          </span>
        </div>

        {/* Track row — mx-3 gives 12px margin so endpoint icons stay within bounds */}
        <div className="relative mx-3" style={{ height: TRACK_ROW_H }}>
          {/* Track line */}
          {journeySegment && segFromPct !== null && segToPct !== null ? (
            <>
              {segFromPct > 0 && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    backgroundColor: color,
                    height: 3,
                    left: 0,
                    opacity: 0.2,
                    width: `${segFromPct}%`,
                  }}
                />
              )}
              <div
                className="absolute top-1/2 -translate-y-1/2 rounded-full"
                style={{
                  backgroundColor: color,
                  height: 4,
                  left: `${segFromPct}%`,
                  opacity: 1,
                  width: `${segToPct - segFromPct}%`,
                }}
              />
              {segToPct < 100 && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    backgroundColor: color,
                    height: 3,
                    left: `${segToPct}%`,
                    opacity: 0.2,
                    width: `${100 - segToPct}%`,
                  }}
                />
              )}
            </>
          ) : (
            <div
              className="absolute top-1/2 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: color, height: 3, left: 0, opacity: 0.75, width: '100%' }}
            />
          )}

          {/* Stop ticks */}
          {orderedStopIds.map((id, idx) => {
            const isEndpoint = idx === 0 || idx === stopCount - 1;
            const isOutside =
              journeySegment && (idx < journeySegment.fromIdx || idx > journeySegment.toIdx);
            const leftPct = (idx / (stopCount - 1)) * 100;

            if (isEndpoint) {
              return (
                <div
                  className="absolute top-1/2"
                  key={id}
                  style={{
                    backgroundColor: color,
                    borderRadius: '50%',
                    height: 8,
                    left: `${leftPct}%`,
                    opacity: isOutside ? 0.2 : 1,
                    transform: 'translate(-50%, -50%)',
                    width: 8,
                    zIndex: 1,
                  }}
                />
              );
            }

            return (
              <div
                className="absolute top-1/2"
                key={id}
                style={{
                  backgroundColor: color,
                  height: 8,
                  left: `${leftPct}%`,
                  opacity: isOutside ? 0.2 : 0.4,
                  transform: 'translate(-50%, -50%)',
                  width: 2,
                  zIndex: 1,
                }}
              />
            );
          })}

          {/* Vehicle markers */}
          {vehicleMarkers.map(({ progress, vehicle }, idx) =>
            renderVehicleMarker(toPercent(progress), vehicle, idx, true, vehicleOpacity(progress))
          )}
        </div>
      </div>
    );
  }

  // ── EXPANDED MODE ───────────────────────────────────────────────────────────
  const innerWidth = EDGE_PAD * 2 + (stopCount - 1) * STOP_PITCH;
  const segFromPx = journeySegment ? tickLeft(journeySegment.fromIdx) : null;
  const segToPx = journeySegment ? tickLeft(journeySegment.toIdx) : null;
  const trackLineLeft = EDGE_PAD;
  const trackLineWidth = (stopCount - 1) * STOP_PITCH;

  return (
    <div aria-hidden="true" className="relative w-full select-none">
      {/* Left edge fade */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-base-100 to-transparent pointer-events-none z-10" />
      {/* Right edge fade */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-base-100 to-transparent pointer-events-none z-10" />

      {/* Scrollable container */}
      <div className="w-full overflow-x-auto overflow-y-hidden" ref={scrollRef}>
        <div className="relative" style={{ height: TOTAL_H, width: innerWidth }}>
          {/* Track line */}
          {journeySegment && segFromPx !== null && segToPx !== null ? (
            <>
              {segFromPx > trackLineLeft && (
                <div
                  className="absolute top-0 rounded-full"
                  style={{
                    backgroundColor: color,
                    height: 3,
                    left: trackLineLeft,
                    marginTop: TRACK_ROW_H / 2 - 1.5,
                    opacity: 0.2,
                    width: segFromPx - trackLineLeft,
                  }}
                />
              )}
              <div
                className="absolute top-0 rounded-full"
                style={{
                  backgroundColor: color,
                  height: 4,
                  left: segFromPx,
                  marginTop: TRACK_ROW_H / 2 - 2,
                  opacity: 1,
                  width: segToPx - segFromPx,
                }}
              />
              {segToPx < trackLineLeft + trackLineWidth && (
                <div
                  className="absolute top-0 rounded-full"
                  style={{
                    backgroundColor: color,
                    height: 3,
                    left: segToPx,
                    marginTop: TRACK_ROW_H / 2 - 1.5,
                    opacity: 0.2,
                    width: trackLineLeft + trackLineWidth - segToPx,
                  }}
                />
              )}
            </>
          ) : (
            <div
              className="absolute top-0 rounded-full"
              style={{
                backgroundColor: color,
                height: 3,
                left: trackLineLeft,
                marginTop: TRACK_ROW_H / 2 - 1.5,
                opacity: 0.75,
                width: trackLineWidth,
              }}
            />
          )}

          {/* Stop ticks */}
          {orderedStopIds.map((id, idx) => {
            const isEndpoint = idx === 0 || idx === stopCount - 1;
            const isOutside =
              journeySegment && (idx < journeySegment.fromIdx || idx > journeySegment.toIdx);
            const left = tickLeft(idx);

            if (isEndpoint) {
              return (
                <div
                  className="absolute"
                  key={id}
                  style={{
                    backgroundColor: color,
                    borderRadius: '50%',
                    height: 8,
                    left,
                    opacity: isOutside ? 0.2 : 1,
                    top: TRACK_ROW_H / 2 - 4,
                    transform: 'translateX(-50%)',
                    width: 8,
                    zIndex: 1,
                  }}
                />
              );
            }

            return (
              <div
                className="absolute"
                key={id}
                style={{
                  backgroundColor: color,
                  height: 8,
                  left,
                  opacity: isOutside ? 0.2 : 0.4,
                  top: TRACK_ROW_H / 2 - 4,
                  transform: 'translateX(-50%)',
                  width: 2,
                  zIndex: 1,
                }}
              />
            );
          })}

          {/* Vehicle markers */}
          {vehicleMarkers.map(({ progress, vehicle }, idx) =>
            renderVehicleMarker(
              vehicleLeftPx(progress),
              vehicle,
              idx,
              false,
              vehicleOpacity(progress)
            )
          )}

          {/* Station name labels */}
          {orderedStopIds.map((id, idx) => {
            const isEndpoint = idx === 0 || idx === stopCount - 1;
            const left = tickLeft(idx) - STOP_PITCH / 2;

            return (
              <div
                key={`n-${id}`}
                style={{
                  left,
                  overflow: 'hidden',
                  position: 'absolute',
                  textAlign: 'center',
                  top: TRACK_ROW_H + 2,
                  whiteSpace: 'nowrap',
                  width: STOP_PITCH,
                }}
              >
                <span
                  className={`text-[9px] truncate block ${isEndpoint ? 'text-base-content/70' : 'text-base-content/50'}`}
                >
                  {stopsById.get(id)?.name ?? ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
