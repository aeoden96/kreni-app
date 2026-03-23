import {
  ArrowLeftRight,
  ArrowUpDown,
  Bus,
  MapPin,
  Search,
  Star,
  TrainFront,
  X,
} from 'lucide-react';
import { type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import type { Route, Stop } from '../../../utils/gtfs';
import type { FilterType } from '../../../utils/searchUtils';

interface GTFSModeConfig {
  dataDir: string;
  id: string;
}

interface SearchHeaderProps {
  badgeColor: string;
  buses: Route[];
  config: GTFSModeConfig;
  dirFromStop: null | Stop;
  dirToInputRef: RefObject<HTMLInputElement | null>;
  dirToQuery: string;
  dirToStop: null | Stop;
  favRoutes: Route[];

  favStops: Stop[];
  filter: FilterType;
  isDirsMode: boolean;

  onClose: () => void;
  onDirSwap: () => void;
  onSelectRoute: (route: Route) => void;
  onSelectStop: (stop: Stop) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  setDirActiveField: (field: 'from' | 'to') => void;
  setDirFromStop: (stop: null | Stop) => void;
  setDirToQuery: (q: string) => void;

  setFilter: (f: FilterType) => void;
  setSearchQuery: (q: string) => void;
  setStopsMode: (mode: 'directions' | 'search') => void;
  stopsMode: 'directions' | 'search';
  trainRoutes: Route[];
  trams: Route[];
}

export function SearchHeader({
  badgeColor,
  buses,
  config,
  dirFromStop,
  dirToInputRef,
  dirToQuery,
  dirToStop,
  favRoutes,
  favStops,
  filter,
  isDirsMode,
  onClose,
  onDirSwap,
  onSelectRoute,
  onSelectStop,
  searchInputRef,
  searchQuery,
  setDirActiveField,
  setDirFromStop,
  setDirToQuery,
  setFilter,
  setSearchQuery,
  setStopsMode,
  stopsMode,
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

      {/* Row 1: search / from-field input + directions toggle */}
      {(isRouteFilter || filter === 'stanice') && (
        <div className="flex items-center gap-2 mt-3">
          <div className="relative flex-1">
            {isDirsMode && dirFromStop ? (
              <div className="input input-bordered w-full min-h-[44px] flex items-center gap-2 px-3 pr-10 text-sm">
                <MapPin className="w-4 h-4 text-primary/70 shrink-0" />
                <span className="flex-1 truncate">{dirFromStop.name}</span>
              </div>
            ) : (
              <>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
                <input
                  className="input input-bordered w-full pl-10 pr-10 min-h-[44px] text-base"
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (isDirsMode) setDirActiveField('from');
                  }}
                  onFocus={() => {
                    if (isDirsMode) setDirActiveField('from');
                  }}
                  placeholder={
                    isDirsMode
                      ? t('search.placeholder.fromWhere')
                      : filter === 'stanice'
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
              </>
            )}
            {isDirsMode && dirFromStop && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/80"
                onClick={() => {
                  setDirFromStop(null);
                  setDirActiveField('from');
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {filter === 'stanice' && (
            <button
              aria-pressed={stopsMode === 'directions'}
              className={`btn btn-square min-h-[44px] w-[44px] shrink-0 ${
                stopsMode === 'directions' ? 'btn-primary' : 'btn-ghost border border-base-300'
              }`}
              onClick={() => setStopsMode(stopsMode === 'search' ? 'directions' : 'search')}
              title={
                stopsMode === 'search'
                  ? t('search.directionsToggleOn')
                  : t('search.directionsToggleOff')
              }
              type="button"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Row 2: to-field input + swap button (directions mode only) */}
      {isDirsMode && (
        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1">
            {dirToStop ? (
              <div className="input input-bordered w-full min-h-[44px] flex items-center gap-2 px-3 pr-10 text-sm">
                <MapPin className="w-4 h-4 text-primary/70 shrink-0" />
                <span className="flex-1 truncate">{dirToStop.name}</span>
              </div>
            ) : (
              <>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
                <input
                  className="input input-bordered w-full pl-10 pr-10 min-h-[44px] text-base"
                  onChange={(e) => {
                    setDirToQuery(e.target.value);
                    setDirActiveField('to');
                  }}
                  onFocus={() => setDirActiveField('to')}
                  placeholder={t('search.placeholder.toWhere')}
                  ref={dirToInputRef}
                  type="text"
                  value={dirToQuery}
                />
                {dirToQuery && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/80"
                    onClick={() => setDirToQuery('')}
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
            {dirToStop && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/80"
                onClick={() => {
                  setDirToQuery('');
                  setTimeout(() => dirToInputRef.current?.focus(), 50);
                }}
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            aria-label={t('search.swapStopsAria')}
            className="btn btn-square min-h-[44px] w-[44px] shrink-0 btn-ghost border border-base-300"
            disabled={!dirFromStop && !dirToStop}
            onClick={onDirSwap}
            type="button"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
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
                    style={{ backgroundColor: badgeColor }}
                  >
                    {route.shortName}
                  </button>
                ))}
              </div>
            </div>
          )}
          {filter === 'stanice' && stopsMode === 'search' && favStops.length > 0 && (
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
