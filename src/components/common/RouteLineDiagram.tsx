/**
 * RouteLineDiagram — vertical metro-style timeline alongside the stop list.
 *
 * Renders:
 *   • A colored vertical line representing the route from start to finish
 *   • A dot at each stop's position on the line
 *   • Vehicle icons at their interpolated position between stops
 *
 * This component must be placed inside the **same scrollable container** as
 * the stop list so that dots and rows stay in sync. The parent flex row
 * reserves a fixed-width column (DIAGRAM_WIDTH) for the diagram and lets the
 * stop list take the remaining space.
 */

import { useMemo } from 'react';

import type { Stop } from '../../utils/gtfs';
import type { VehiclePosition } from '../../utils/vehicles';

import { routeTypeColor } from '../../utils/routeStyle';
import { computeVehicleStopProgress } from '../../utils/vehicles';

// ── Layout constants ────────────────────────────────────────────────────────
/** Pixel height of each stop row in the stop list (must match CSS). */
export const STOP_ROW_HEIGHT = 40;

/** Vertical top padding inside the scrollable list before the first stop. */
export const STOP_LIST_PADDING_TOP = 8;

/** Width of the diagram column (in px). */
const DIAGRAM_WIDTH = 44;

interface RouteLineDiagramProps {
  /** Journey segment to highlight — stops outside are dimmed. */
  journeySegment?: null | { fromIdx: number; toIdx: number };
  /** Ordered stop IDs for the selected direction. */
  orderedStopIds: string[];
  /** GTFS route_type: 0 = tram, 2 = rail, 3 = bus. */
  routeType: number;
  /** Stop lookup map for lat/lon access. */
  stopsById: Map<string, Stop>;
  /** Realtime vehicles filtered to this direction (from the route). */
  vehicles: VehiclePosition[];
}

interface VehicleMarker {
  progress: number; // fractional index into orderedStopIds (e.g. 2.6)
  vehicle: VehiclePosition;
}

export function RouteLineDiagram({
  journeySegment,
  orderedStopIds,
  routeType,
  stopsById,
  vehicles,
}: RouteLineDiagramProps) {
  const color = routeTypeColor(routeType);
  const stopCount = orderedStopIds.length;

  // Build a resolved (lat, lon) array aligned with orderedStopIds
  const resolvedStops = useMemo(
    () =>
      orderedStopIds.map((id) => {
        const s = stopsById.get(id);
        return s ? { lat: s.lat, lon: s.lon } : { lat: 0, lon: 0 };
      }),
    [orderedStopIds, stopsById]
  );

  // Compute fractional stop index for each vehicle
  const vehicleMarkers = useMemo<VehicleMarker[]>(() => {
    return vehicles.map((v) => ({
      progress: computeVehicleStopProgress(v.lat, v.lon, resolvedStops),
      vehicle: v,
    }));
  }, [vehicles, resolvedStops]);

  if (stopCount === 0) return <div style={{ width: DIAGRAM_WIDTH }} />;

  const totalHeight = stopCount * STOP_ROW_HEIGHT + STOP_LIST_PADDING_TOP;

  // top-centre of the first dot
  const firstDotTop = STOP_LIST_PADDING_TOP + STOP_ROW_HEIGHT / 2;
  // top-centre of the last dot
  const lastDotTop =
    STOP_LIST_PADDING_TOP + (stopCount - 1) * STOP_ROW_HEIGHT + STOP_ROW_HEIGHT / 2;

  // Journey segment track boundaries (in px from top)
  const segmentFromTop = journeySegment
    ? STOP_LIST_PADDING_TOP + journeySegment.fromIdx * STOP_ROW_HEIGHT + STOP_ROW_HEIGHT / 2
    : null;
  const segmentToTop = journeySegment
    ? STOP_LIST_PADDING_TOP + journeySegment.toIdx * STOP_ROW_HEIGHT + STOP_ROW_HEIGHT / 2
    : null;

  return (
    <div
      aria-hidden="true"
      className="relative flex-shrink-0"
      style={{ height: totalHeight, width: DIAGRAM_WIDTH }}
    >
      {/* Vertical track line — split into 3 segments when journey context is active */}
      {journeySegment && segmentFromTop !== null && segmentToTop !== null ? (
        <>
          {/* Before segment: dimmed */}
          {segmentFromTop > firstDotTop && (
            <div
              className="absolute"
              style={{
                backgroundColor: color,
                borderRadius: 2,
                height: segmentFromTop - firstDotTop,
                left: '50%',
                opacity: 0.2,
                top: firstDotTop,
                transform: 'translateX(-50%)',
                width: 3,
              }}
            />
          )}
          {/* Active segment: full opacity, slightly wider */}
          <div
            className="absolute"
            style={{
              backgroundColor: color,
              borderRadius: 2,
              height: segmentToTop - segmentFromTop,
              left: '50%',
              opacity: 1,
              top: segmentFromTop,
              transform: 'translateX(-50%)',
              width: 4,
            }}
          />
          {/* After segment: dimmed */}
          {segmentToTop < lastDotTop && (
            <div
              className="absolute"
              style={{
                backgroundColor: color,
                borderRadius: 2,
                height: lastDotTop - segmentToTop,
                left: '50%',
                opacity: 0.2,
                top: segmentToTop,
                transform: 'translateX(-50%)',
                width: 3,
              }}
            />
          )}
        </>
      ) : (
        /* Single full-height track line */
        <div
          className="absolute"
          style={{
            backgroundColor: color,
            borderRadius: 2,
            height: lastDotTop - firstDotTop,
            left: '50%',
            opacity: 0.75,
            top: firstDotTop,
            transform: 'translateX(-50%)',
            width: 3,
          }}
        />
      )}

      {/* Stop dots */}
      {orderedStopIds.map((_, idx) => {
        const isEndpoint = idx === 0 || idx === stopCount - 1;
        const isOutsideSegment =
          journeySegment && (idx < journeySegment.fromIdx || idx > journeySegment.toIdx);
        const dotSize = isEndpoint ? 12 : 7;
        const top = STOP_LIST_PADDING_TOP + idx * STOP_ROW_HEIGHT + STOP_ROW_HEIGHT / 2;

        return (
          <div
            className="absolute"
            key={idx}
            style={{
              backgroundColor: isEndpoint ? color : 'white',
              border: `2.5px solid ${color}`,
              borderRadius: '50%',
              boxShadow: isEndpoint ? `0 0 0 2px ${color}33` : undefined,
              height: dotSize,
              left: '50%',
              opacity: isOutsideSegment ? 0.2 : 1,
              top,
              transform: 'translate(-50%, -50%)',
              width: dotSize,
              zIndex: 1,
            }}
          />
        );
      })}

      {/* Vehicle markers */}
      {vehicleMarkers.map(({ progress, vehicle }, idx) => {
        // Clamp to valid range
        const clampedProgress = Math.max(0, Math.min(stopCount - 1, progress));
        const top = STOP_LIST_PADDING_TOP + clampedProgress * STOP_ROW_HEIGHT + STOP_ROW_HEIGHT / 2;

        const label = vehicle.headsign || (vehicle.direction === 0 ? 'A' : 'B');
        const speedKmh = vehicle.speed != null ? Math.round(vehicle.speed * 3.6) : null;
        const delayMin = vehicle.delay != null ? Math.round(vehicle.delay / 60) : null;

        const tooltipParts: string[] = [label];
        if (speedKmh !== null) tooltipParts.push(`${speedKmh} km/h`);
        if (delayMin !== null)
          tooltipParts.push(
            delayMin > 0
              ? `${delayMin} min kašnjenja`
              : delayMin < 0
                ? `${Math.abs(delayMin)} min ispred`
                : 'Na vrijeme'
          );
        const tooltip = tooltipParts.join(' · ');

        return (
          <div
            className="absolute"
            key={`v-${idx}`}
            style={{
              left: '50%',
              top,
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
            }}
          >
            {/* Pulsing halo ring — offset by -2px each side so it stays centred without
                relying on transform (animate-ping's keyframe overwrites transform) */}
            <div
              className="absolute rounded-full animate-ping"
              style={{
                backgroundColor: color,
                height: 28,
                left: -2,
                opacity: 0.35,
                top: -2,
                width: 28,
              }}
            />
            {/* Vehicle circle */}
            <div
              className="relative flex items-center justify-center"
              style={{
                backgroundColor: color,
                border: '2.5px solid white',
                borderRadius: '50%',
                boxShadow: '0 1px 5px rgba(0,0,0,0.45)',
                cursor: 'default',
                height: 24,
                width: 24,
              }}
              title={tooltip}
            >
              {/* Small direction triangle — pointing down (direction of travel) */}
              <svg fill="none" height="10" viewBox="0 0 8 8" width="10">
                <polygon fill="white" points="4,7 7,1 1,1" />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}
