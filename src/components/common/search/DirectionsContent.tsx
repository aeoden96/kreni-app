import { ChevronRight, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Route, Stop } from '../../../utils/gtfs';
import type { AllVehiclePosition } from '../../../utils/vehicles';

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
              const color =
                item.route.type === 0 ? '#2563eb' : item.route.type === 3 ? '#d97706' : '#64748b';
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
