import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Route } from '../../../utils/gtfs';

import { trackEvent } from '../../../utils/analytics';
import { getRouteSuspension, parseFeedDate } from '../../../utils/routeService';
import { RouteBadge } from '../RouteBadge';

const DATE_FMT = new Intl.DateTimeFormat('hr-HR', { day: 'numeric', month: 'short' });

interface RouteListProps {
  /** Unused for night lines, which carry their own night colour. */
  badgeColor: string;
  favouriteRouteIds: string[];
  filteredRoutes: Route[];
  onSelectRoute: (route: Route) => void;
  searchQuery: string;
  toggleFavouriteRoute: (id: string) => void;
}

export function RouteList({
  badgeColor,
  favouriteRouteIds,
  filteredRoutes,
  onSelectRoute,
  searchQuery,
  toggleFavouriteRoute,
}: RouteListProps) {
  const { t } = useTranslation();
  // One reading for the whole list, so no two rows disagree about the date.
  const now = new Date();

  if (filteredRoutes.length === 0) {
    return (
      <div className="p-8 text-center text-base-content/50">
        {searchQuery ? t('search.emptyNoResults') : t('search.emptyNoRoutes')}
      </div>
    );
  }

  return (
    <div className="divide-y divide-base-300">
      {filteredRoutes.map((route) => {
        const isFav = favouriteRouteIds.includes(route.id);
        // Out of service for a stretch — still listed and selectable, since the
        // timetable is what tells you when it comes back.
        const suspension = getRouteSuspension(route, now);
        return (
          <div
            className="flex items-center hover:bg-base-200 active:bg-base-300 transition-colors"
            key={route.id}
          >
            <button
              className="flex-1 py-3 px-4 text-left min-h-[52px]"
              onClick={() => onSelectRoute(route)}
            >
              <div className="flex items-center gap-3">
                <RouteBadge
                  className="min-w-[3rem] justify-center"
                  color={badgeColor}
                  dimmed={!!suspension}
                  route={route}
                />
                <div className="min-w-0">
                  <div className={`text-sm${suspension ? ' text-base-content/50' : ''}`}>
                    {route.longName}
                  </div>
                  {suspension && (
                    <div className="text-[11px] text-warning">
                      {t('search.suspendedUntil', {
                        date: DATE_FMT.format(parseFeedDate(suspension.until)),
                      })}
                    </div>
                  )}
                </div>
              </div>
            </button>
            <button
              className="px-3 py-3 text-base-content/30 hover:text-warning transition-colors min-h-[52px] flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                trackEvent('favourite_toggled', {
                  action: favouriteRouteIds.includes(route.id) ? 'remove' : 'add',
                  item_type: 'route',
                  route_id: route.id,
                });
                toggleFavouriteRoute(route.id);
              }}
              title={isFav ? t('search.favouriteRemove') : t('search.favouriteAdd')}
            >
              <Star
                className="w-4 h-4"
                color={isFav ? '#f59e0b' : 'currentColor'}
                fill={isFav ? '#f59e0b' : 'none'}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
