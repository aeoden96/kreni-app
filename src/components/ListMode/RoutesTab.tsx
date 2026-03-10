/**
 * Routes tab — browse tram & bus routes, with search.
 * Reuses the same filtering logic from SearchModal but in an inline list.
 */

import { useState, useMemo } from 'react';
import { Search, TrainFront, Bus, Star } from 'lucide-react';
import type { Route } from '../../utils/gtfs';
import { isRouteTypeTram, isRouteTypeBus } from '../../utils/gtfs';
import { useSettingsStore } from '../../stores/settingsStore';

interface RoutesTabProps {
  routes: Route[];
  onSelectRoute: (routeId: string, routeType: number) => void;
}

type FilterType = 'tram' | 'bus';

const ROUTE_TYPE_SORT = (a: Route, b: Route) => {
  const numA = parseInt(a.shortName, 10);
  const numB = parseInt(b.shortName, 10);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
  return a.shortName.localeCompare(b.shortName);
};

export function RoutesTab({ routes, onSelectRoute }: RoutesTabProps) {
  const [filter, setFilter] = useState<FilterType>('tram');
  const [searchQuery, setSearchQuery] = useState('');
  const { favouriteRouteIds, toggleFavouriteRoute } = useSettingsStore();

  const { trams, buses } = useMemo(
    () =>
      routes.reduce(
        (acc, route) => {
          if (isRouteTypeTram(route.type)) acc.trams.push(route);
          else if (isRouteTypeBus(route.type)) acc.buses.push(route);
          return acc;
        },
        { trams: [] as Route[], buses: [] as Route[] }
      ),
    [routes]
  );

  const sourceRoutes = filter === 'tram' ? trams : buses;

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = q
      ? sourceRoutes.filter(
        (r) =>
          r.shortName.toLowerCase().includes(q) ||
          r.longName.toLowerCase().includes(q)
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
            type="text"
            placeholder="Pretraži linije..."
            className="flex-1 bg-transparent outline-none text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('tram')}
            className={`btn btn-sm flex-1 gap-1.5 ${filter === 'tram' ? 'btn-primary' : 'btn-ghost'}`}
          >
            <TrainFront className="w-4 h-4" />
            Tramvaji ({trams.length})
          </button>
          <button
            onClick={() => setFilter('bus')}
            className={`btn btn-sm flex-1 gap-1.5 ${filter === 'bus' ? 'btn-warning' : 'btn-ghost'}`}
          >
            <Bus className="w-4 h-4" />
            Autobusi ({buses.length})
          </button>
        </div>
      </div>

      {/* Route list */}
      <div className="flex-1 overflow-y-auto overscroll-contain pb-24">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-base-content/50 text-sm">
            Nema rezultata za &quot;{searchQuery}&quot;
          </div>
        ) : (
          <div className="divide-y divide-base-200">
            {filtered.map((route) => {
              const isFav = favouriteRouteIds.includes(route.id);
              return (
                <div key={route.id} className="flex items-center hover:bg-base-200 transition-colors">
                  <button
                    onClick={() => onSelectRoute(route.id, route.type)}
                    className="flex-1 flex items-center gap-3 px-4 py-3 text-left min-w-0"
                  >
                    <span
                      className="badge font-bold shrink-0 text-white"
                      style={{ backgroundColor: isRouteTypeTram(route.type) ? '#2563eb' : '#d97706' }}
                    >
                      {route.shortName}
                    </span>
                    <span className="text-sm truncate">{route.longName}</span>
                  </button>
                  <button
                    onClick={() => toggleFavouriteRoute(route.id)}
                    className="btn btn-ghost btn-sm btn-square shrink-0 mr-2"
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
