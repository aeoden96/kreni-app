import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Route, Stop } from '../../../utils/gtfs';
import { compassLabelForBearing } from '../../../utils/localizedCompass';
import { getStopTypeIcons } from '../../../utils/searchUtils';
import { useStopRoutes } from '../../../hooks/useStopRoutes';
import { useStopTermini } from '../../../hooks/useStopTermini';

interface TerminalStopRowProps {
  stop: Stop;
  routesById: Map<string, Route>;
  stopsById: Map<string, Stop>;
  dataDir: string;
  onSelect: (stop: Stop) => void;
}

export const TerminalStopRow = memo(function TerminalStopRow({
  stop,
  routesById,
  stopsById,
  dataDir,
  onSelect,
}: TerminalStopRowProps) {
  const { t } = useTranslation();
  const { routes, loading: routesLoading } = useStopRoutes(stop.id, routesById, { dataDir });
  const { termini } = useStopTermini(stop.id, stopsById, routesById, { dataDir });
  const { Icon, color } = getStopTypeIcons(stop.routeType);

  const label =
    stop.routeType === 3
      ? t('search.stopTypes.bus')
      : stop.routeType === 2
        ? t('search.stopTypes.rail')
        : t('search.stopTypes.tram');

  const heading =
    termini.length > 0
      ? t('search.headingTowards', { place: termini.join(', ') })
      : stop.bearing !== undefined
        ? t('search.headingTowards', { place: compassLabelForBearing(stop.bearing, t) })
        : stop.code
          ? t('search.headingCode', { code: stop.code })
          : t('search.headingUnknown');

  return (
    <button
      onClick={() => onSelect(stop)}
      className="w-full text-left px-4 py-2.5 hover:bg-base-200/70 active:bg-base-300/80 transition-colors"
      title={label}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 p-1 rounded-md bg-base-200">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-base-content/70">{heading}</div>
          {routesLoading ? (
            <div className="h-4 mt-1 w-28 rounded bg-base-300 animate-pulse" />
          ) : routes.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {routes.slice(0, 8).map((route) => (
                <span
                  key={route.id}
                  className="badge badge-xs font-bold text-white"
                  style={{
                    backgroundColor:
                      route.type === 0 ? '#2563eb' : route.type === 2 ? '#64748b' : '#d97706',
                  }}
                >
                  {route.shortName}
                </span>
              ))}
              {routes.length > 8 && (
                <span className="text-[11px] text-base-content/60">+{routes.length - 8}</span>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-base-content/50 mt-0.5">
              {t('search.noLinesForStop')}
            </div>
          )}
        </div>
      </div>
    </button>
  );
});
