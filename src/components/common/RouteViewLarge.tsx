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
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Route, RouteTimetable, Stop } from '../../utils/gtfs';
import type { VehiclePosition } from '../../utils/vehicles';

import { useGTFSMode } from '../../contexts/GTFSModeContext';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import { formatMinutes } from '../../utils/format';
import { routeTypeColor } from '../../utils/routeStyle';
import { getDirectionColor } from '../Map/directionColors';
import { RouteDirectionHeader } from './RouteDirectionHeader';
import { RouteStopList } from './RouteStopList';

/** A single scheduled run of the line in the active direction. */
interface Departure {
  /** Time (minutes from midnight) at the first served stop in display order. */
  departureMin: number;
  /** stopId → scheduled time (minutes from midnight) for this run. */
  stopTimes: Map<string, number>;
  tripId: string;
}

type DirectionFilter = 'A' | 'B';

interface RouteViewLargeProps {
  /** Trip id of the currently focused vehicle, drawn with a heavier ring. */
  focusedTripId?: null | string;
  /** Default direction — 'A' or 'B'. */
  initialDirectionFilter?: DirectionFilter;
  isOpen: boolean;
  /** Parent station ID of the journey destination stop (from Plan Journey). */
  journeyFromParentId?: null | string;
  /** Parent station ID of the journey origin stop (from Plan Journey). */
  journeyToParentId?: null | string;
  onClose: () => void;
  onStopClick: (stopId: string) => void;
  /** Focus a vehicle picked off the line; the panel closes onto its itinerary. */
  onVehicleClick: (tripId: string) => void;
  orderedStops?: Record<string, string[]>;
  route: Route;
  routeStops: string[];
  /** Per-trip timed stop sequence for the line; drives the timetable strip. */
  routeTimetable?: null | RouteTimetable;
  /** Active service key (calendar[today]); trip ids are prefixed `{service}_`. */
  serviceId?: null | string;
  stopsById: Map<string, Stop>;
  vehicles: VehiclePosition[];
}

export const RouteViewLarge = memo(function RouteViewLarge({
  focusedTripId,
  initialDirectionFilter = 'A',
  isOpen,
  journeyFromParentId,
  journeyToParentId,
  onClose,
  onStopClick,
  onVehicleClick,
  orderedStops,
  route,
  routeStops,
  routeTimetable,
  serviceId,
  stopsById,
  vehicles,
}: RouteViewLargeProps) {
  const { t } = useTranslation();
  const { hasRealtime } = useGTFSMode();
  const nowMinutes = useCurrentTime();

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

  /** Step to the next direction of the line (two on ZET lines, but cycle anyway). */
  const switchDirection = () => {
    if (directionKeys.length < 2) return;
    const idx = directionKeys.indexOf(directionKey);
    setDirectionKey(directionKeys[(idx + 1) % directionKeys.length]);
  };

  // Ordered stop IDs for the active direction
  const orderedStopIds: string[] = orderedStops?.[directionKey]?.length
    ? orderedStops[directionKey]
    : routeStops;

  // Vehicles for this direction (direction 0 = A, 1 = B, fallback to all)
  const directionIndex = directionKeys.indexOf(directionKey);
  const dirVehicles = vehicles.filter((v) => v.direction === directionIndex);
  const filteredVehicles: VehiclePosition[] = dirVehicles.length > 0 ? dirVehicles : vehicles;

  const color = directionLabels[directionIndex]?.color || routeTypeColor(route.type);
  const RouteIcon = route.type === 3 ? Bus : Train;

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

  // Timetable strip — scheduled departures for the active direction (train mode).
  // Each route in the HŽPP feed is single-direction, so we keep only runs whose
  // calling times are non-decreasing along the displayed stop order; for ZET
  // this naturally filters out the opposite-direction trips of a two-way line.
  const showTimetable = !hasRealtime && !!routeTimetable;

  const departures = useMemo<Departure[]>(() => {
    if (!showTimetable || !routeTimetable) return [];
    const orderIndex = new Map(orderedStopIds.map((id, i) => [id, i]));
    const result: Departure[] = [];

    for (const [tripId, stops] of Object.entries(routeTimetable)) {
      if (serviceId && !tripId.startsWith(`${serviceId}_`)) continue;

      // Times at the displayed stops, sorted by display order.
      const onRoute = stops
        .map(([stopId, , timeMin]) => ({ orderIdx: orderIndex.get(stopId), stopId, timeMin }))
        .filter(
          (s): s is { orderIdx: number; stopId: string; timeMin: number } =>
            s.orderIdx !== undefined
        )
        .sort((a, b) => a.orderIdx - b.orderIdx);
      if (onRoute.length < 2) continue;

      // Drop runs that go the other way along the displayed order.
      let monotonic = true;
      for (let i = 1; i < onRoute.length; i++) {
        if (onRoute[i].timeMin < onRoute[i - 1].timeMin) {
          monotonic = false;
          break;
        }
      }
      if (!monotonic) continue;

      result.push({
        departureMin: onRoute[0].timeMin,
        stopTimes: new Map(onRoute.map((s) => [s.stopId, s.timeMin])),
        tripId,
      });
    }

    result.sort((a, b) => a.departureMin - b.departureMin);
    return result;
  }, [showTimetable, routeTimetable, serviceId, orderedStopIds]);

  // Default-select the next upcoming departure whenever the run set changes
  // (route or direction switch). Read "now" via a ref so the 1-minute tick of
  // useCurrentTime() doesn't clobber a manual selection.
  const [selectedTripId, setSelectedTripId] = useState<null | string>(null);
  const nowRef = useRef(nowMinutes);
  nowRef.current = nowMinutes;
  useEffect(() => {
    if (departures.length === 0) {
      setSelectedTripId(null);
      return;
    }
    const now = nowRef.current;
    const next = departures.find((d) => d.departureMin >= now) ?? departures[departures.length - 1];
    setSelectedTripId(next.tripId);
  }, [departures]);

  const selectedStopTimes = useMemo(
    () => departures.find((d) => d.tripId === selectedTripId)?.stopTimes ?? null,
    [departures, selectedTripId]
  );

  // Scroll the active departure chip into view when it changes.
  const selectedChipRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    selectedChipRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [selectedTripId]);

  if (!isOpen) return null;

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

            <RouteIcon className="w-3.5 h-3.5 opacity-40 shrink-0" />

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

          {/* Row 2: active direction — switchable unless a journey pins it */}
          <RouteDirectionHeader
            caption={
              journeySegment ? t('routeModal.journeyDirection') : t('routeBar.directionTowards')
            }
            color={color}
            label={directionLabels[directionIndex]?.label ?? ''}
            onSwitch={!journeySegment && directionLabels.length > 1 ? switchDirection : undefined}
          />

          {/* Departures strip (train mode) — pick a run to see its calling times */}
          {showTimetable && departures.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5">
              <span className="text-[11px] font-semibold text-base-content/40 shrink-0 pr-0.5">
                {t('routeModal.departures')}
              </span>
              {departures.map((d) => {
                const isActive = d.tripId === selectedTripId;
                const passed = d.departureMin < nowMinutes;
                return (
                  <button
                    className={[
                      'shrink-0 rounded-md px-2 py-1 text-xs font-bold tabular-nums transition-colors',
                      isActive
                        ? 'text-white'
                        : passed
                          ? 'bg-base-200 text-base-content/35 hover:bg-base-300'
                          : 'bg-base-200 text-base-content/70 hover:bg-base-300',
                    ].join(' ')}
                    key={d.tripId}
                    onClick={() => setSelectedTripId(d.tripId)}
                    ref={isActive ? selectedChipRef : undefined}
                    style={isActive ? { backgroundColor: color } : undefined}
                    type="button"
                  >
                    {formatMinutes(d.departureMin)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable body: metro diagram + stop list side-by-side */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <RouteStopList
            focusedTripId={focusedTripId}
            journeySegment={journeySegment}
            onStopClick={onStopClick}
            onVehicleClick={onVehicleClick}
            orderedStopIds={orderedStopIds}
            routeType={route.type}
            segmentColor={color}
            stopsById={stopsById}
            stopTimes={showTimetable ? selectedStopTimes : null}
            vehicles={filteredVehicles}
          />
        </div>
      </div>
    </>
  );
});
