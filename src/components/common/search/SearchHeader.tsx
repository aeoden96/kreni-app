import { type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  X,
  TrainFront,
  Bus,
  MapPin,
  Star,
  ArrowLeftRight,
  ArrowUpDown,
} from 'lucide-react';
import type { Route, Stop } from '../../../utils/gtfs';
import type { FilterType } from '../../../utils/searchUtils';

interface GTFSModeConfig {
  id: string;
  dataDir: string;
}

interface SearchHeaderProps {
  config: GTFSModeConfig;
  filter: FilterType;
  setFilter: (f: FilterType) => void;
  trams: Route[];
  buses: Route[];
  trainRoutes: Route[];
  stopsMode: 'search' | 'directions';
  setStopsMode: (mode: 'search' | 'directions') => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;

  isDirsMode: boolean;
  dirFromStop: Stop | null;
  dirToStop: Stop | null;
  setDirActiveField: (field: 'from' | 'to') => void;
  setDirFromStop: (stop: Stop | null) => void;
  dirToQuery: string;
  setDirToQuery: (q: string) => void;
  dirToInputRef: RefObject<HTMLInputElement | null>;
  onDirSwap: () => void;

  favRoutes: Route[];
  favStops: Stop[];
  badgeColor: string;
  onSelectRoute: (route: Route) => void;
  onSelectStop: (stop: Stop) => void;
  onClose: () => void;
}

export function SearchHeader({
  config,
  filter,
  setFilter,
  trams,
  buses,
  trainRoutes,
  stopsMode,
  setStopsMode,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  isDirsMode,
  dirFromStop,
  dirToStop,
  setDirActiveField,
  setDirFromStop,
  dirToQuery,
  setDirToQuery,
  dirToInputRef,
  onDirSwap,
  favRoutes,
  favStops,
  badgeColor,
  onSelectRoute,
  onSelectStop,
  onClose,
}: SearchHeaderProps) {
  const { t } = useTranslation();
  const isRouteFilter = filter === 'tram' || filter === 'bus' || filter === 'trains';

  return (
    <div className="p-4 border-b border-base-300">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-bold flex-1">{t('search.title')}</h2>
        <button
          onClick={onClose}
          className="btn btn-ghost btn-circle btn-sm min-h-[44px] min-w-[44px]"
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
                  ref={searchInputRef}
                  type="text"
                  placeholder={
                    isDirsMode
                      ? t('search.placeholder.fromWhere')
                      : filter === 'stanice'
                        ? t('search.placeholder.stopName')
                        : t('search.placeholder.routeQuery')
                  }
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (isDirsMode) setDirActiveField('from');
                  }}
                  onFocus={() => {
                    if (isDirsMode) setDirActiveField('from');
                  }}
                  className="input input-bordered w-full pl-10 pr-10 min-h-[44px] text-base"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/80"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
            {isDirsMode && dirFromStop && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/80"
                onClick={() => {
                  setDirFromStop(null);
                  setDirActiveField('from');
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {filter === 'stanice' && (
            <button
              type="button"
              onClick={() =>
                setStopsMode(stopsMode === 'search' ? 'directions' : 'search')
              }
              className={`btn btn-square min-h-[44px] w-[44px] shrink-0 ${
                stopsMode === 'directions' ? 'btn-primary' : 'btn-ghost border border-base-300'
              }`}
              title={
                stopsMode === 'search'
                  ? t('search.directionsToggleOn')
                  : t('search.directionsToggleOff')
              }
              aria-pressed={stopsMode === 'directions'}
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
                  ref={dirToInputRef}
                  type="text"
                  placeholder={t('search.placeholder.toWhere')}
                  value={dirToQuery}
                  onChange={(e) => {
                    setDirToQuery(e.target.value);
                    setDirActiveField('to');
                  }}
                  onFocus={() => setDirActiveField('to')}
                  className="input input-bordered w-full pl-10 pr-10 min-h-[44px] text-base"
                />
                {dirToQuery && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/80"
                    onClick={() => setDirToQuery('')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
            {dirToStop && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/80"
                onClick={() => {
                  setDirToQuery('');
                  setTimeout(() => dirToInputRef.current?.focus(), 50);
                }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-square min-h-[44px] w-[44px] shrink-0 btn-ghost border border-base-300"
            onClick={onDirSwap}
            disabled={!dirFromStop && !dirToStop}
            aria-label={t('search.swapStopsAria')}
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
                    key={route.id}
                    onClick={() => onSelectRoute(route)}
                    className="badge badge-lg font-bold hover:opacity-80 transition-opacity cursor-pointer text-white"
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
                    key={stop.id}
                    onClick={() => onSelectStop(stop)}
                    className="badge badge-outline badge-lg hover:badge-primary transition-colors cursor-pointer text-xs"
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
