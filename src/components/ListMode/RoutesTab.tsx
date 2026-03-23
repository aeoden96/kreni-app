/**
 * Routes tab — browse tram & bus routes, with search.
 * Reuses the same filtering logic from SearchModal but in an inline list.
 */

import { Bus, Search, Star, TrainFront } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Route } from '../../utils/gtfs';

import { useSettingsStore } from '../../stores/settingsStore';
import { isRouteTypeBus, isRouteTypeTram } from '../../utils/gtfs';

type FilterType = 'bus' | 'tram';

interface RoutesTabProps {
  onSelectRoute: (routeId: string, routeType: number) => void;
  routes: Route[];
}

const ROUTE_TYPE_SORT = (a: Route, b: Route) => {
  const numA = parseInt(a.shortName, 10);
  const numB = parseInt(b.shortName, 10);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
  return a.shortName.localeCompare(b.shortName);
};

export function RoutesTab({ onSelectRoute, routes }: RoutesTabProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterType>('tram');
  const [searchQuery, setSearchQuery] = useState('');
  const { favouriteRouteIds, toggleFavouriteRoute } = useSettingsStore();

  const { buses, trams } = useMemo(
    () =>
      routes.reduce(
        (acc, route) => {
          if (isRouteTypeTram(route.type)) acc.trams.push(route);
          else if (isRouteTypeBus(route.type)) acc.buses.push(route);
          return acc;
        },
        { buses: [] as Route[], trams: [] as Route[] }
      ),
    [routes]
  );

  const sourceRoutes = filter === 'tram' ? trams : buses;

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = q
      ? sourceRoutes.filter(
          (r) => r.shortName.toLowerCase().includes(q) || r.longName.toLowerCase().includes(q)
        )
      : sourceRoutes;
    return [...list].sort(ROUTE_TYPE_SORT);
  }, [sourceRoutes, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* Search + filter */}
      <div className="p-3 space-y-2 border-b border-base-300 bg-base-100 sticky top-0 z-10">
        <div className="flex items-center gap-2 bg-base-200 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-base-content/50" />
          <input
            className="flex-1 bg-transparent outline-none text-sm"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search.barPlaceholderLines')}
            type="text"
            value={searchQuery}
          />
        </div>
        <div className="flex gap-2">
          <button
            className={`btn btn-sm flex-1 gap-1.5 ${filter === 'tram' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('tram')}
          >
            <TrainFront className="w-4 h-4" />
            {t('search.tabs.trams', { count: trams.length })}
          </button>
          <button
            className={`btn btn-sm flex-1 gap-1.5 ${filter === 'bus' ? 'btn-warning' : 'btn-ghost'}`}
            onClick={() => setFilter('bus')}
          >
            <Bus className="w-4 h-4" />
            {t('search.tabs.buses', { count: buses.length })}
          </button>
        </div>
      </div>

      {/* Route list */}
      <div className="flex-1 overflow-y-auto overscroll-contain pb-24">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-base-content/50 text-sm">
            {t('search.listNoResultsForQuery', { query: searchQuery })}
          </div>
        ) : (
          <div className="divide-y divide-base-200">
            {filtered.map((route) => {
              const isFav = favouriteRouteIds.includes(route.id);
              return (
                <div
                  className="flex items-center hover:bg-base-200 transition-colors"
                  key={route.id}
                >
                  <button
                    className="flex-1 flex items-center gap-3 px-4 py-3 text-left min-w-0"
                    onClick={() => onSelectRoute(route.id, route.type)}
                  >
                    <span
                      className="badge font-bold shrink-0 text-white"
                      style={{
                        backgroundColor: isRouteTypeTram(route.type) ? '#2563eb' : '#d97706',
                      }}
                    >
                      {route.shortName}
                    </span>
                    <span className="text-sm truncate">{route.longName}</span>
                  </button>
                  <button
                    className="btn btn-ghost btn-sm btn-square shrink-0 mr-2"
                    onClick={() => toggleFavouriteRoute(route.id)}
                  >
                    <Star
                      className={`w-4 h-4 ${isFav ? 'fill-warning text-warning' : 'text-base-content/30'}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
