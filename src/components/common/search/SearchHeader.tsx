import { Bus, MapPin, Search, Star, TrainFront, X } from 'lucide-react';
import { type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import type { Route, Stop } from '../../../utils/gtfs';
import type { FilterType } from '../../../utils/searchUtils';

import { isNightRoute } from '../../../utils/nightLines';
import { NIGHT_ROUTE_COLOR } from '../../../utils/routeStyle';
import { NightMoon } from '../NightMoon';

interface GTFSModeConfig {
  dataDir: string;
  id: string;
}

interface SearchHeaderProps {
  badgeColor: string;
  buses: Route[];
  config: GTFSModeConfig;
  favRoutes: Route[];
  favStops: Stop[];
  filter: FilterType;
  onClose: () => void;
  onSelectRoute: (route: Route) => void;
  onSelectStop: (stop: Stop) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  setFilter: (f: FilterType) => void;
  setSearchQuery: (q: string) => void;
  trainRoutes: Route[];
  trams: Route[];
}

export function SearchHeader({
  badgeColor,
  buses,
  config,
  favRoutes,
  favStops,
  filter,
  onClose,
  onSelectRoute,
  onSelectStop,
  searchInputRef,
  searchQuery,
  setFilter,
  setSearchQuery,
  trainRoutes,
  trams,
}: SearchHeaderProps) {
  const { t } = useTranslation();
  const isRouteFilter = filter === 'tram' || filter === 'bus' || filter === 'trains';

  return (
    <div className="p-4 border-b border-base-300">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-bold flex-1">{t('search.title')}</h2>
        <button
          className="btn btn-ghost btn-circle btn-sm min-h-[44px] min-w-[44px]"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed w-full">
        {config.id === 'train' ? (
          <>
            <button
              className={`tab flex-1 min-h-[40px] gap-1 text-xs sm:text-sm ${filter === 'trains' ? 'tab-active' : ''}`}
              onClick={() => setFilter('trains')}
            >
              <TrainFront className="w-4 h-4" />
              <span className="hidden sm:inline">
                {t('search.tabs.trains', { count: trainRoutes.length })}
              </span>
              <span className="sm:hidden">
                {t('search.tabs.trainsShort', { count: trainRoutes.length })}
              </span>
            </button>
            <button
              className={`tab flex-1 min-h-[40px] gap-1 text-xs sm:text-sm ${filter === 'stanice' ? 'tab-active' : ''}`}
              onClick={() => setFilter('stanice')}
            >
              <MapPin className="w-4 h-4" />
              {t('search.tabs.stations')}
            </button>
          </>
        ) : (
          <>
            <button
              className={`tab flex-1 min-h-[40px] gap-1 text-xs sm:text-sm ${filter === 'stanice' ? 'tab-active' : ''}`}
              onClick={() => setFilter('stanice')}
            >
              <MapPin className="w-4 h-4" />
              {t('search.tabs.stations')}
            </button>
            <button
              className={`tab flex-1 min-h-[40px] gap-1 text-xs sm:text-sm ${filter === 'tram' ? 'tab-active' : ''}`}
              onClick={() => setFilter('tram')}
            >
              <TrainFront className="w-4 h-4" />
              <span className="hidden sm:inline">
                {t('search.tabs.trams', { count: trams.length })}
              </span>
              <span className="sm:hidden">
                {t('search.tabs.tramsShort', { count: trams.length })}
              </span>
            </button>
            <button
              className={`tab flex-1 min-h-[40px] gap-1 text-xs sm:text-sm ${filter === 'bus' ? 'tab-active' : ''}`}
              onClick={() => setFilter('bus')}
            >
              <Bus className="w-4 h-4" />
              <span className="hidden sm:inline">
                {t('search.tabs.buses', { count: buses.length })}
              </span>
              <span className="sm:hidden">
                {t('search.tabs.busesShort', { count: buses.length })}
              </span>
            </button>
          </>
        )}
      </div>

      {/* Route / stop search input */}
      {(isRouteFilter || filter === 'stanice') && (
        <div className="flex items-center gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
            <input
              className="input input-bordered w-full pl-10 pr-10 min-h-[44px] text-base"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                filter === 'stanice'
                  ? t('search.placeholder.stopName')
                  : t('search.placeholder.routeQuery')
              }
              ref={searchInputRef}
              type="text"
              value={searchQuery}
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/80"
                onClick={() => setSearchQuery('')}
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Favourites quick access */}
      {!searchQuery && (
        <>
          {isRouteFilter && favRoutes.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-1 text-xs text-base-content/60 mb-1.5">
                <Star className="w-3 h-3 fill-current text-warning" />
                <span>{t('search.favourites')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {favRoutes.map((route) => (
                  <button
                    className="badge badge-lg font-bold hover:opacity-80 transition-opacity cursor-pointer text-white"
                    key={route.id}
                    onClick={() => onSelectRoute(route)}
                    style={{
                      backgroundColor: isNightRoute(route) ? NIGHT_ROUTE_COLOR : badgeColor,
                    }}
                  >
                    {route.shortName}
                    {isNightRoute(route) && <NightMoon className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          )}
          {filter === 'stanice' && favStops.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-1 text-xs text-base-content/60 mb-1.5">
                <Star className="w-3 h-3 fill-current text-warning" />
                <span>{t('search.favourites')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {favStops.map((stop) => (
                  <button
                    className="badge badge-outline badge-lg hover:badge-primary transition-colors cursor-pointer text-xs"
                    key={stop.id}
                    onClick={() => onSelectStop(stop)}
                  >
                    {stop.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
