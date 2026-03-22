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
import { computeVehicleStopProgress } from '../../utils/vehicles';

// ── Layout constants ────────────────────────────────────────────────────────
/** Pixel height of each stop row in the stop list (must match CSS). */
export const STOP_ROW_HEIGHT = 40;

/** Vertical top padding inside the scrollable list before the first stop. */
export const STOP_LIST_PADDING_TOP = 8;

/** Width of the diagram column (in px). */
const DIAGRAM_WIDTH = 44;

// ── Colors ──────────────────────────────────────────────────────────────────
const TRAM_COLOR = '#2563eb';   // blue-600
const BUS_COLOR = '#d97706';   // amber-600

interface RouteLineDiagramProps {
  /** Ordered stop IDs for the selected direction. */
  orderedStopIds: string[];
  /** Stop lookup map for lat/lon access. */
  stopsById: Map<string, Stop>;
  /** Realtime vehicles filtered to this direction (from the route). */
  vehicles: VehiclePosition[];
  /** 0 = Tram, 3 = Bus */
  routeType: number;
}

interface VehicleMarker {
  progress: number; // fractional index into orderedStopIds (e.g. 2.6)
  vehicle: VehiclePosition;
}

export function RouteLineDiagram({
  orderedStopIds,
  stopsById,
  vehicles,
  routeType,
}: RouteLineDiagramProps) {
  const color = routeType === 0 ? TRAM_COLOR : BUS_COLOR;
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

  const totalHeight =
    stopCount * STOP_ROW_HEIGHT + STOP_LIST_PADDING_TOP;

  // top-centre of the first dot
  const firstDotTop = STOP_LIST_PADDING_TOP + STOP_ROW_HEIGHT / 2;
  // top-centre of the last dot
  const lastDotTop = STOP_LIST_PADDING_TOP + (stopCount - 1) * STOP_ROW_HEIGHT + STOP_ROW_HEIGHT / 2;

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: DIAGRAM_WIDTH, height: totalHeight }}
      aria-hidden="true"
    >
      {/* Vertical track line */}
      <div
        className="absolute"
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          top: firstDotTop,
          height: lastDotTop - firstDotTop,
          width: 3,
          backgroundColor: color,
          borderRadius: 2,
          opacity: 0.75,
        }}
      />

      {/* Stop dots */}
      {orderedStopIds.map((_, idx) => {
        const isEndpoint = idx === 0 || idx === stopCount - 1;
        const dotSize = isEndpoint ? 12 : 7;
        const top = STOP_LIST_PADDING_TOP + idx * STOP_ROW_HEIGHT + STOP_ROW_HEIGHT / 2;

        return (
          <div
            key={idx}
            className="absolute"
            style={{
              left: '50%',
              top,
              transform: 'translate(-50%, -50%)',
              width: dotSize,
              height: dotSize,
              borderRadius: '50%',
              backgroundColor: isEndpoint ? color : 'white',
              border: `2.5px solid ${color}`,
              zIndex: 1,
              boxShadow: isEndpoint ? `0 0 0 2px ${color}33` : undefined,
            }}
          />
        );
      })}

      {/* Vehicle markers */}
      {vehicleMarkers.map(({ progress, vehicle }, idx) => {
        // Clamp to valid range
        const clampedProgress = Math.max(0, Math.min(stopCount - 1, progress));
        const top =
          STOP_LIST_PADDING_TOP +
          clampedProgress * STOP_ROW_HEIGHT +
          STOP_ROW_HEIGHT / 2;

        const label = vehicle.headsign || (vehicle.direction === 0 ? 'A' : 'B');
        const speedKmh = vehicle.speed != null ? Math.round(vehicle.speed * 3.6) : null;
        const delayMin =
          vehicle.delay != null ? Math.round(vehicle.delay / 60) : null;

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
            key={`v-${idx}`}
            title={tooltip}
            className="absolute flex items-center justify-center"
            style={{
              left: '50%',
              top,
              transform: 'translate(-50%, -50%)',
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: color,
              border: '2.5px solid white',
              zIndex: 2,
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
              cursor: 'default',
            }}
          >
            {/* Small direction triangle — pointing down (direction of travel) */}
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <polygon points="4,7 7,1 1,1" fill="white" />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
