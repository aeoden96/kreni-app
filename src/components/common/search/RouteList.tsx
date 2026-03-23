import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Route } from '../../../utils/gtfs';

import { trackEvent } from '../../../utils/analytics';

interface RouteListProps {
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
                <div
                  className="badge font-bold min-w-[3rem] justify-center text-white"
                  style={{ backgroundColor: badgeColor }}
                >
                  {route.shortName}
                </div>
                <div className="text-sm">{route.longName}</div>
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
                fill={isFav ? 'currentColor' : 'none'}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
