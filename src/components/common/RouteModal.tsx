/**
 * Route details panel — redesigned with metro-diagram sidebar.
 *
 * Desktop  : fixed left side panel (380 px wide, full height),
 *            no backdrop so the map stays interactive.
 * Mobile   : full-screen overlay with backdrop.
 *
 * Stop list + vertical metro diagram share the same scrollable flex row so
 * the dots on the line always align with the corresponding stop rows.
 */

import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, X, Train, Bus } from 'lucide-react';
import type { Route, Stop } from '../../utils/gtfs';
import { getDirectionColor } from '../Map/directionColors';
import type { VehiclePosition } from '../../utils/vehicles';
import {
  RouteLineDiagram,
  STOP_ROW_HEIGHT,
  STOP_LIST_PADDING_TOP,
} from './RouteLineDiagram';

interface RouteModalProps {
  isOpen: boolean;
  route: Route;
  routeStops: string[];
  orderedStops?: Record<string, string[]>;
  stopsById: Map<string, Stop>;
  vehicles: VehiclePosition[];
  /** Default direction — 'A' or 'B'. */
  initialDirectionFilter?: DirectionFilter;
  onClose: () => void;
  onStopClick: (stopId: string) => void;
}

type DirectionFilter = 'A' | 'B';

const TRAM_COLOR = '#2563eb'; // blue-600
const BUS_COLOR = '#d97706'; // amber-600

export const RouteModal = memo(function RouteModal({
  isOpen,
  route,
  routeStops,
  orderedStops,
  stopsById,
  vehicles,
  // initialDirectionFilter = 'A', // unused
  onClose,
  onStopClick,
}: RouteModalProps) {
  const { t } = useTranslation();

  // Compute direction keys and labels from orderedStops
  const directionKeys = orderedStops
    ? Object.keys(orderedStops).sort((a, b) => Number(a) - Number(b))
    : ['0', '1'];

  // For each direction, get the ending stop name and color
  const directionLabels = directionKeys.map((key, idx) => {
    const ids = orderedStops?.[key] || [];
    const endId = ids[ids.length - 1] || ids[0] || null;
    const stopName = endId ? (stopsById.get(endId)?.name || endId) : key;
    return {
      key,
      label: stopName,
      color: getDirectionColor(route.type ?? null, idx),
    };
  });

  // Track selected direction by key (default to first key)
  const [directionKey, setDirectionKey] = useState<string>(directionLabels[0]?.key || '0');

  // Ordered stop IDs for the active direction
  const orderedStopIds: string[] = orderedStops?.[directionKey]?.length
    ? orderedStops[directionKey]
    : routeStops;

  // Vehicles for this direction (direction 0 = A, 1 = B, fallback to all)
  const directionIndex = directionKeys.indexOf(directionKey);
  const dirVehicles = vehicles.filter((v) => v.direction === directionIndex);
  const filteredVehicles: VehiclePosition[] = dirVehicles.length > 0 ? dirVehicles : vehicles;

  const color = directionLabels[directionIndex]?.color || (route.type === 0 ? TRAM_COLOR : BUS_COLOR);

  if (!isOpen) return null;

  const stopRows = orderedStopIds.map((stopId, idx) => ({
    stopId,
    stop: stopsById.get(stopId),
    idx,
  }));

  return (
    <>
      {/* Mobile-only backdrop */}
      <div
        className="fixed inset-0 z-[3000] bg-black/50 backdrop-blur-sm sm:hidden"
        style={{ animation: 'backdrop-fade-in 0.15s ease-out' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed inset-0 z-[3100] flex flex-col bg-base-100 overflow-hidden sm:inset-auto sm:left-0 sm:top-0 sm:bottom-0 sm:w-[380px] sm:shadow-2xl sm:border-r sm:border-base-300"
        style={{ animation: 'modal-fade-in 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-base-300">
          {/* Row 1: back / badge / name / close */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm p-1.5 min-h-[36px] min-w-[36px]"
              aria-label={t('common.close')}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <span
              className="badge badge-lg font-bold text-white shrink-0"
              style={{ backgroundColor: color }}
            >
              {route.shortName}
            </span>

            {route.type === 0
              ? <Train className="w-3.5 h-3.5 opacity-40 shrink-0" />
              : <Bus className="w-3.5 h-3.5 opacity-40 shrink-0" />}

            <h2 className="font-bold text-sm leading-snug flex-1 min-w-0 line-clamp-2">
              {route.longName}
            </h2>

            <button
              onClick={onClose}
              className="btn btn-ghost btn-circle btn-sm p-1.5 min-h-[36px] min-w-[36px]"
              aria-label={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Row 2: full-width direction toggle with live vehicle counts */}
          <div className="flex rounded-lg overflow-hidden border border-base-300 w-full">
            {directionLabels.map((dir, idx) => {
              const dirCount = vehicles.filter((v) => v.direction === idx).length;
              const isActive = directionKey === dir.key;
              const VehicleIcon = route.type === 0 ? Train : Bus;
              return (
                <button
                  key={dir.key}
                  onClick={() => setDirectionKey(dir.key)}
                  className={[
                    'flex-1 flex items-center justify-between gap-2 px-3 py-1.5 text-sm font-semibold transition-colors min-w-0',
                    isActive ? 'text-white' : 'bg-base-100 text-base-content/60 hover:bg-base-200',
                  ].join(' ')}
                  style={isActive ? { backgroundColor: dir.color } : undefined}
                >
                  <span className="truncate">{dir.label}</span>
                  <span className={[
                    'flex items-center gap-1 shrink-0 text-xs font-bold tabular-nums',
                    isActive ? 'text-white/90' : dirCount > 0 ? 'text-success' : 'opacity-30',
                  ].join(' ')}>
                    {dirCount > 0 && (
                      <span className={[
                        'w-1.5 h-1.5 rounded-full animate-pulse',
                        isActive ? 'bg-white/80' : 'bg-success',
                      ].join(' ')} />
                    )}
                    <VehicleIcon className="w-3 h-3" />
                    {dirCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable body: metro diagram + stop list side-by-side */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="flex" style={{ paddingTop: STOP_LIST_PADDING_TOP }}>
            {/* Metro line diagram column */}
            <RouteLineDiagram
              orderedStopIds={orderedStopIds}
              stopsById={stopsById}
              vehicles={filteredVehicles}
              routeType={route.type}
            />

            {/* Stop name list */}
            <div className="flex-1 min-w-0">
              {stopRows.map(({ stopId, stop }) => {
                const isEndpoint = stopRows[0]?.stopId === stopId || stopRows[stopRows.length - 1]?.stopId === stopId;
                const name = stop?.name ?? stopId;
                return (
                  <button
                    key={stopId}
                    onClick={() => onStopClick(stopId)}
                    className={[
                      'w-full text-left px-3 flex items-center',
                      'transition-colors hover:bg-base-200 active:bg-base-300',
                      isEndpoint ? 'font-semibold' : '',
                    ].join(' ')}
                    style={{ height: STOP_ROW_HEIGHT }}
                  >
                    <span className="text-sm leading-tight line-clamp-1">{name}</span>
                  </button>
                );
              })}

              {stopRows.length === 0 && (
                <div className="text-sm text-base-content/50 px-3 py-8 text-center">
                  {t('routeModal.noStops')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});
