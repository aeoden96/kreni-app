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
import {
  computeOffScreenIndicator,
  type OffScreenIndicatorPosition,
} from '../../utils/offScreenIndicator';

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

export function OffScreenStopIndicator({ stop, onFlyTo }: OffScreenStopIndicatorProps) {
  const map = useMap();
  const [indicator, setIndicator] = useState<OffScreenIndicatorPosition | null>(null);

  const update = useCallback(() => {
    if (!stop) {
      setIndicator(null);
      return;
    }
    const bounds = map.getBounds();
    const size = map.getSize();
    setIndicator(
      computeOffScreenIndicator(
        stop.lat,
        stop.lon,
        {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        },
        size.x,
        size.y,
      ),
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
