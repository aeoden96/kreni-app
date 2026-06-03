import { Bus, Loader2, TrainFront } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Route, Stop } from '../../../utils/gtfs';

interface DirectionResult {
  directionFilter: 'A' | 'B';
  directionKey: string;
  route: Route;
  stopsBetween: number;
}

interface DirectionsContentProps {
  dirFromStop: null | Stop;
  dirLoading: boolean;
  dirResultLabel: string;
  dirResults: DirectionResult[];
  dirToStop: null | Stop;
  onSelectDirectionsRoute: (routeId: string, routeType: number, direction: 'A' | 'B') => void;
}

export function DirectionsContent({
  dirFromStop,
  dirLoading,
  dirResultLabel,
  dirResults,
  dirToStop,
  onSelectDirectionsRoute,
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
              const VehicleIcon = item.route.type === 0 ? TrainFront : Bus;
              return (
                <button
                  className="w-full px-3 py-3 text-left hover:bg-base-200 transition-colors"
                  key={`${item.route.id}-${item.directionKey}`}
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
                    <VehicleIcon className="w-4 h-4 text-base-content/50 shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}
