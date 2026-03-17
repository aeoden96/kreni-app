/**
 * Floating off-screen stop indicator.
 *
 * Must be mounted as a child of <MapContainer>. It uses useMap() to get
 * live map state on every `move` event (frame-rate smooth), and renders
 * via a React portal to document.body so it overlays the whole screen.
 *
 * When a stop is selected and its position is outside the visible map
 * viewport, renders a directional arrow pinned to the nearest screen
 * edge that always points toward the stop. Clicking it flies the map
 * to that stop.
 */

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from 'react-leaflet';
import { Navigation2 } from 'lucide-react';
import type { Stop } from '../../utils/gtfs';

export interface OffScreenIndicatorUIProps {
  x: number;
  y: number;
  /** CSS rotation in degrees — 0 = up, clockwise */
  angle: number;
  stopName: string;
  onFlyTo: () => void;
  /** When true, render inline (for Storybook); otherwise portal to document.body */
  inline?: boolean;
}

/** Presentational indicator UI — used by OffScreenStopIndicator and Storybook. */
export function OffScreenIndicatorUI({
  x,
  y,
  angle,
  stopName,
  onFlyTo,
  inline = false,
}: OffScreenIndicatorUIProps) {
  const content = (
    <div
      className={inline ? '' : 'fixed z-[2000] pointer-events-none'}
      style={{
        position: inline ? 'relative' : 'fixed',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <button
        className="pointer-events-auto flex flex-col items-center gap-1 group focus:outline-none"
        onClick={onFlyTo}
        title={`Skoči na postaju: ${stopName}`}
      >
        <div
          className="bg-primary text-primary-content rounded-full w-11 h-11 flex items-center justify-center shadow-xl border-2 border-base-100 transition-transform duration-200 group-hover:scale-110 group-active:scale-95"
          style={{ rotate: `${angle}deg` }}
        >
          <Navigation2 className="w-5 h-5" fill="currentColor" />
        </div>
        <span className="bg-base-100/95 backdrop-blur-sm text-base-content text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-md max-w-[120px] truncate border border-base-200 transition-transform duration-200 group-hover:scale-105">
          {stopName}
        </span>
      </button>
    </div>
  );

  return inline ? content : createPortal(content, document.body);
}

interface OffScreenStopIndicatorProps {
  stop: Stop | null;
  onFlyTo: () => void;
}

interface Indicator {
  x: number;
  y: number;
  /** CSS rotation angle in degrees — 0 = pointing up, clockwise */
  angle: number;
}

function computeIndicator(
  stop: Stop,
  north: number,
  south: number,
  east: number,
  west: number,
  W: number,
  H: number
): Indicator | null {
  const latSpan = north - south;
  const lonSpan = east - west;
  if (latSpan === 0 || lonSpan === 0) return null;

  // Project stop lat/lon to screen pixel space using linear mapping
  const sx = ((stop.lon - west) / lonSpan) * W;
  const sy = ((north - stop.lat) / latSpan) * H;

  // Stop is inside the viewport — no indicator needed
  if (sx >= 0 && sx <= W && sy >= 0 && sy <= H) return null;

  const cx = W / 2;
  const cy = H / 2;
  const dx = sx - cx;
  const dy = sy - cy;

  if (dx === 0 && dy === 0) return null;

  // CSS rotate angle: 0 = up (north), clockwise positive
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;

  // Inset rectangle for clamped edge position
  const margin = 52; // px from screen edge
  const minX = margin;
  const maxX = W - margin;
  const minY = margin;
  const maxY = H - margin;

  // Find smallest positive t such that (cx + t*dx, cy + t*dy) hits the rect
  let t = Infinity;
  if (dx > 0) t = Math.min(t, (maxX - cx) / dx);
  if (dx < 0) t = Math.min(t, (minX - cx) / dx);
  if (dy > 0) t = Math.min(t, (maxY - cy) / dy);
  if (dy < 0) t = Math.min(t, (minY - cy) / dy);

  if (!isFinite(t) || t <= 0) return null;

  return {
    x: Math.round(cx + t * dx),
    y: Math.round(cy + t * dy),
    angle,
  };
}

export function OffScreenStopIndicator({ stop, onFlyTo }: OffScreenStopIndicatorProps) {
  const map = useMap();
  const [indicator, setIndicator] = useState<Indicator | null>(null);

  const update = useCallback(() => {
    if (!stop) {
      setIndicator(null);
      return;
    }
    const bounds = map.getBounds();
    const size = map.getSize();
    setIndicator(
      computeIndicator(
        stop,
        bounds.getNorth(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getWest(),
        size.x,
        size.y
      )
    );
  }, [stop, map]);

  useEffect(() => {
    update();
    map.on('move', update);
    map.on('zoomend', update);
    return () => {
      map.off('move', update);
      map.off('zoomend', update);
    };
  }, [map, update]);

  if (!indicator || !stop) return null;

  return (
    <OffScreenIndicatorUI
      x={indicator.x}
      y={indicator.y}
      angle={indicator.angle}
      stopName={stop.name}
      onFlyTo={onFlyTo}
    />
  );
}
