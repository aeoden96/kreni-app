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

import { ArrowLeft, Bus, Train, X } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Route, Stop } from '../../utils/gtfs';
import type { VehiclePosition } from '../../utils/vehicles';

import { getDirectionColor } from '../Map/directionColors';
import { RouteLineDiagram, STOP_LIST_PADDING_TOP, STOP_ROW_HEIGHT } from './RouteLineDiagram';

type DirectionFilter = 'A' | 'B';

interface RouteModalProps {
  /** Default direction — 'A' or 'B'. */
  initialDirectionFilter?: DirectionFilter;
  isOpen: boolean;
  /** Parent station ID of the journey destination stop (from Plan Journey). */
  journeyFromParentId?: null | string;
  /** Parent station ID of the journey origin stop (from Plan Journey). */
  journeyToParentId?: null | string;
  onClose: () => void;
  onStopClick: (stopId: string) => void;
  orderedStops?: Record<string, string[]>;
  route: Route;
  routeStops: string[];
  stopsById: Map<string, Stop>;
  vehicles: VehiclePosition[];
}

const TRAM_COLOR = '#2563eb'; // blue-600
const BUS_COLOR = '#d97706'; // amber-600

export const RouteModal = memo(function RouteModal({
  initialDirectionFilter = 'A',
  isOpen,
  journeyFromParentId,
  journeyToParentId,
  onClose,
  onStopClick,
  orderedStops,
  route,
  routeStops,
  stopsById,
  vehicles,
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
    const stopName = endId ? stopsById.get(endId)?.name || endId : key;
    return {
      color: getDirectionColor(route.type ?? null, idx),
      key,
      label: stopName,
    };
  });

  // Map 'A'→directionKeys[0], 'B'→directionKeys[1]
  const initialKey =
    initialDirectionFilter === 'B' ? (directionKeys[1] ?? '1') : (directionKeys[0] ?? '0');

  // Track selected direction by key (default based on initialDirectionFilter)
  const [directionKey, setDirectionKey] = useState<string>(initialKey);

  // Ordered stop IDs for the active direction
  const orderedStopIds: string[] = orderedStops?.[directionKey]?.length
    ? orderedStops[directionKey]
    : routeStops;

  // Vehicles for this direction (direction 0 = A, 1 = B, fallback to all)
  const directionIndex = directionKeys.indexOf(directionKey);
  const dirVehicles = vehicles.filter((v) => v.direction === directionIndex);
  const filteredVehicles: VehiclePosition[] = dirVehicles.length > 0 ? dirVehicles : vehicles;

  const color =
    directionLabels[directionIndex]?.color || (route.type === 0 ? TRAM_COLOR : BUS_COLOR);

  // Compute journey segment indices from parent station IDs
  const journeySegment = useMemo(() => {
    if (!journeyFromParentId || !journeyToParentId) return null;
    const fromIdx = orderedStopIds.findIndex(
      (id) => stopsById.get(id)?.parentStation === journeyFromParentId
    );
    // Find last occurrence of the toParentId (in case there are multiple platforms)
    let toIdx = -1;
    for (let i = orderedStopIds.length - 1; i >= 0; i--) {
      if (stopsById.get(orderedStopIds[i])?.parentStation === journeyToParentId) {
        toIdx = i;
        break;
      }
    }
    if (fromIdx === -1 || toIdx === -1 || toIdx <= fromIdx) return null;
    return { fromIdx, toIdx };
  }, [journeyFromParentId, journeyToParentId, orderedStopIds, stopsById]);

  if (!isOpen) return null;

  const stopRows = orderedStopIds.map((stopId, idx) => ({
    idx,
    stop: stopsById.get(stopId),
    stopId,
  }));

  return (
    <>
      {/* Mobile-only backdrop */}
      <div
        className="fixed inset-0 z-[3000] bg-black/50 backdrop-blur-sm sm:hidden"
        onClick={onClose}
        style={{ animation: 'backdrop-fade-in 0.15s ease-out' }}
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
              aria-label={t('common.close')}
              className="btn btn-ghost btn-sm p-1.5 min-h-[36px] min-w-[36px]"
              onClick={onClose}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <span
              className="badge badge-lg font-bold text-white shrink-0"
              style={{ backgroundColor: color }}
            >
              {route.shortName}
            </span>

            {route.type === 0 ? (
              <Train className="w-3.5 h-3.5 opacity-40 shrink-0" />
            ) : (
              <Bus className="w-3.5 h-3.5 opacity-40 shrink-0" />
            )}

            <h2 className="font-bold text-sm leading-snug flex-1 min-w-0 line-clamp-2">
              {route.longName}
            </h2>

            <button
              aria-label={t('common.close')}
              className="btn btn-ghost btn-circle btn-sm p-1.5 min-h-[36px] min-w-[36px]"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Row 2: direction toggle OR static journey direction label */}
          {journeySegment ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-base-200 border border-base-300">
              <span className="text-xs text-base-content/50 shrink-0">
                {t('routeModal.journeyDirection')}
              </span>
              <span className="font-semibold text-sm flex-1 truncate">
                {directionLabels[directionIndex]?.label}
              </span>
            </div>
          ) : (
            <div className="flex rounded-lg overflow-hidden border border-base-300 w-full">
              {directionLabels.map((dir, idx) => {
                const dirCount = vehicles.filter((v) => v.direction === idx).length;
                const isActive = directionKey === dir.key;
                const VehicleIcon = route.type === 0 ? Train : Bus;
                return (
                  <button
                    className={[
                      'flex-1 flex items-center justify-between gap-2 px-3 py-1.5 text-sm font-semibold transition-colors min-w-0',
                      isActive
                        ? 'text-white'
                        : 'bg-base-100 text-base-content/60 hover:bg-base-200',
                    ].join(' ')}
                    key={dir.key}
                    onClick={() => setDirectionKey(dir.key)}
                    style={isActive ? { backgroundColor: dir.color } : undefined}
                  >
                    <span className="truncate">{dir.label}</span>
                    <span
                      className={[
                        'flex items-center gap-1 shrink-0 text-xs font-bold tabular-nums',
                        isActive ? 'text-white/90' : dirCount > 0 ? 'text-success' : 'opacity-30',
                      ].join(' ')}
                    >
                      {dirCount > 0 && (
                        <span
                          className={[
                            'w-1.5 h-1.5 rounded-full animate-pulse',
                            isActive ? 'bg-white/80' : 'bg-success',
                          ].join(' ')}
                        />
                      )}
                      <VehicleIcon className="w-3 h-3" />
                      {dirCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable body: metro diagram + stop list side-by-side */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="flex" style={{ paddingTop: STOP_LIST_PADDING_TOP }}>
            {/* Metro line diagram column */}
            <RouteLineDiagram
              journeySegment={journeySegment}
              orderedStopIds={orderedStopIds}
              routeType={route.type}
              stopsById={stopsById}
              vehicles={filteredVehicles}
            />

            {/* Stop name list */}
            <div className="flex-1 min-w-0">
              {stopRows.map(({ idx, stop, stopId }) => {
                const isEndpoint =
                  stopRows[0]?.stopId === stopId ||
                  stopRows[stopRows.length - 1]?.stopId === stopId;
                const isInSegment = journeySegment
                  ? idx >= journeySegment.fromIdx && idx <= journeySegment.toIdx
                  : true;
                const isJourneyEndpoint = journeySegment
                  ? idx === journeySegment.fromIdx || idx === journeySegment.toIdx
                  : false;
                const name = stop?.name ?? stopId;
                return (
                  <button
                    className={[
                      'w-full text-left px-3 flex items-center gap-2',
                      'transition-colors hover:bg-base-200 active:bg-base-300',
                      isEndpoint ? 'font-semibold' : '',
                      !isInSegment ? 'opacity-25' : '',
                    ].join(' ')}
                    key={stopId}
                    onClick={() => onStopClick(stopId)}
                    style={{ height: STOP_ROW_HEIGHT }}
                  >
                    {isJourneyEndpoint && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                    )}
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
