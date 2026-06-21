import { ArrowRight, ChevronRight, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Route, Stop } from '../../../utils/gtfs';
import type { AllVehiclePosition } from '../../../utils/vehicles';

import { useGTFSMode } from '../../../contexts/GTFSModeContext';
import { useJourneyDepartures } from '../../../hooks/useJourneyDepartures';
import { routeTypeColor } from '../../../utils/routeStyle';
import { RouteMiniTrack } from '../RouteMiniTrack';

interface DirectionResult {
  directionFilter: 'A' | 'B';
  directionKey: string;
  fromIndex: number;
  parentStopIds: string[];
  route: Route;
  stopsBetween: number;
  toIndex: number;
}

interface DirectionsContentProps {
  dirFromStop: null | Stop;
  dirLoading: boolean;
  dirResultLabel: string;
  dirResults: DirectionResult[];
  dirToStop: null | Stop;
  onSelectDirectionsRoute: (
    routeId: string,
    routeType: number,
    direction: 'A' | 'B',
    tripId?: null | string
  ) => void;
  stopsById: Map<string, Stop>;
  vehicles: AllVehiclePosition[];
}

export function DirectionsContent({
  dirFromStop,
  dirLoading,
  dirResultLabel,
  dirResults,
  dirToStop,
  onSelectDirectionsRoute,
  stopsById,
  vehicles,
}: DirectionsContentProps) {
  const { t } = useTranslation();
  const { dataDir, hasRealtime } = useGTFSMode();

  // Train mode: show a chronological A→B departures board (times + duration)
  // instead of a bare list of connecting lines.
  const showDepartureBoard = !hasRealtime;
  const { directionByRoute, routeIds, routesById } = useMemo(() => {
    const ids = new Set<string>();
    const byId = new Map<string, Route>();
    const dir = new Map<string, 'A' | 'B'>();
    for (const r of dirResults) {
      ids.add(r.route.id);
      byId.set(r.route.id, r.route);
      if (!dir.has(r.route.id)) dir.set(r.route.id, r.directionFilter);
    }
    return { directionByRoute: dir, routeIds: [...ids], routesById: byId };
  }, [dirResults]);

  const { departures: journeyDepartures, loading: journeyLoading } = useJourneyDepartures(
    showDepartureBoard ? (dirFromStop?.id ?? null) : null,
    showDepartureBoard ? (dirToStop?.id ?? null) : null,
    routeIds,
    routesById,
    dataDir
  );

  if (dirFromStop && dirToStop && showDepartureBoard) {
    const loading = dirLoading || journeyLoading;
    return (
      <div className="p-4 space-y-3">
        <div aria-live="polite" className="text-xs text-base-content/60 px-1">
          {loading
            ? t('search.searchingDirectRoutes')
            : journeyDepartures.length === 0
              ? t('search.noDirectTrains')
              : t('search.trainsFound', { count: journeyDepartures.length })}
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-base-content/60 px-1">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('search.loading')}
          </div>
        )}
        {!loading && journeyDepartures.length > 0 && (
          <div className="divide-y divide-base-300 border border-base-300 rounded-xl overflow-hidden">
            {journeyDepartures.map((d) => {
              const color = routeTypeColor(d.route.type);
              const direction = directionByRoute.get(d.route.id) ?? 'A';
              return (
                <button
                  className="w-full px-3 py-3 text-left hover:bg-base-200 transition-colors flex items-center gap-3"
                  key={d.instanceId}
                  onClick={() =>
                    onSelectDirectionsRoute(d.route.id, d.route.type, direction, d.instanceId)
                  }
                  type="button"
                >
                  <div className="flex items-center gap-1.5 font-bold tabular-nums shrink-0">
                    <span>{fmtTime(d.depMin)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-base-content/40" />
                    <span>{fmtTime(d.arrMin)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-base-content/60 truncate">{d.route.longName}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-base-content/50 tabular-nums">
                      {fmtDuration(d.durationMin)}
                    </span>
                    <span
                      className="badge badge-sm font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {d.trainNumber || d.route.shortName}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (dirFromStop && dirToStop) {
    return (
      <div className="p-4 space-y-3">
        <div aria-live="polite" className="text-xs text-base-content/60 px-1">
          {dirResultLabel}
        </div>
        {dirLoading && (
          <div className="flex items-center gap-2 text-sm text-base-content/60 px-1">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('search.loading')}
          </div>
        )}
        {!dirLoading && dirResults.length === 0 && (
          <div className="text-center text-base-content/50 py-4 text-sm">
            {t('search.noDirectRoutes')}
          </div>
        )}
        {!dirLoading && dirResults.length > 0 && (
          <div className="divide-y divide-base-300 border border-base-300 rounded-xl overflow-hidden">
            {dirResults.map((item) => {
              const color = routeTypeColor(item.route.type);
              const directionIndex = item.directionFilter === 'A' ? 0 : 1;
              const routeVehicles = vehicles.filter(
                (v) => v.routeId === item.route.id && v.direction === directionIndex
              );
              const journeySegment = { fromIdx: item.fromIndex, toIdx: item.toIndex };

              return (
                <div key={`${item.route.id}-${item.directionKey}`}>
                  {/* Route info row — clickable header */}
                  <button
                    className="w-full px-3 pt-3 pb-2 text-left hover:bg-base-200 transition-colors"
                    onClick={() =>
                      onSelectDirectionsRoute(item.route.id, item.route.type, item.directionFilter)
                    }
                    type="button"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="badge font-bold text-white min-w-[3rem] justify-center"
                        style={{ backgroundColor: color }}
                      >
                        {item.route.shortName}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm line-clamp-1">{item.route.longName}</div>
                        <div className="text-xs text-base-content/60">
                          {t('search.routeDirectionMeta', {
                            count: item.stopsBetween + 1,
                            direction: item.directionFilter,
                          })}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-base-content/30 shrink-0" />
                    </div>
                  </button>

                  {/* Mini track — vehicles are separately clickable */}
                  {item.parentStopIds.length >= 2 && (
                    <div className="px-3 pb-3">
                      <RouteMiniTrack
                        expanded={false}
                        journeySegment={journeySegment}
                        onVehicleClick={(tripId) =>
                          onSelectDirectionsRoute(
                            item.route.id,
                            item.route.type,
                            item.directionFilter,
                            tripId
                          )
                        }
                        orderedStopIds={item.parentStopIds}
                        routeType={item.route.type}
                        stopsById={stopsById}
                        vehicles={routeVehicles}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}

/** Format a duration in minutes as e.g. "2h 15m" or "45m". */
function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Format minutes-from-midnight as HH:MM (wraps past-midnight times). */
function fmtTime(min: number): string {
  const w = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(w / 60)).padStart(2, '0')}:${String(w % 60).padStart(2, '0')}`;
}
