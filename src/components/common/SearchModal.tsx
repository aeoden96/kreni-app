/**
 * Search modal – route browsing, stop search, favourites & recently viewed.
 * Opens from the floating search bar on the map.
 */

import { useState, useMemo, useRef, useEffect, memo } from 'react';
import { Search, X, TrainFront, Bus, MapPin, Star, Clock } from 'lucide-react';
import type { Route, Stop } from '../../utils/gtfs';
import { isRouteTypeTram, isRouteTypeBus, isRouteTypeRail } from '../../utils/gtfs';
import { useSettingsStore } from '../../stores/settingsStore';
import { useGTFSMode } from '../../contexts/GTFSModeContext';
import { trackEvent } from '../../utils/analytics';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: Route[];
  stops: Stop[];
  stopsById: Map<string, Stop>;
  onSelectRoute: (routeId: string, routeType: number, directionFilter?: 'A' | 'B') => void;
  onSelectStop: (stopId: string) => void;
}

type FilterType = 'tram' | 'bus' | 'trains' | 'stanice';

const POPULAR_TRAMS = ['6', '11', '17', '4', '13', '12'];
const POPULAR_BUSES = ['101', '102', '106', '140', '268'];

export const SearchModal = memo(function SearchModal({
  isOpen,
  onClose,
  routes,
  stops,
  stopsById,
  onSelectRoute,
  onSelectStop,
}: SearchModalProps) {
  const config = useGTFSMode();
  const [filter, setFilter] = useState<FilterType>(config.id === 'train' ? 'trains' : 'tram');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    favouriteRouteIds,
    favouriteStopIds,
    recentRoutes,
    recentStops,
    toggleFavouriteRoute,
    toggleFavouriteStop,
    clearRecents,
  } = useSettingsStore();

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Routes by type
  const { trams, buses, trainRoutes } = useMemo(
    () =>
      routes.reduce(
        (acc, route) => {
          if (isRouteTypeTram(route.type)) acc.trams.push(route);
          else if (isRouteTypeBus(route.type)) acc.buses.push(route);
          else if (isRouteTypeRail(route.type)) acc.trainRoutes.push(route);
          return acc;
        },
        { trams: [] as Route[], buses: [] as Route[], trainRoutes: [] as Route[] }
      ),
    [routes]
  );

  // Routes by id for lookups
  const routesById = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes]);

  // Platform stops only (exclude parent stations)
  const platformStops = useMemo(() => stops.filter((s) => s.locationType === 0), [stops]);

  // Popular routes
  const quickAccessRoutes = useMemo(() => {
    if (filter === 'trains') return [];
    const popular = filter === 'tram' ? POPULAR_TRAMS : POPULAR_BUSES;
    return popular
      .map((id) => routes.find((r) => r.shortName === id))
      .filter((r): r is Route => r !== undefined);
  }, [filter, routes]);

  // Favourite routes for current tab
  const favRoutes = useMemo(() => {
    const source = filter === 'tram' ? trams : filter === 'trains' ? trainRoutes : buses;
    return favouriteRouteIds
      .map((id) => source.find((r) => r.id === id))
      .filter((r): r is Route => r !== undefined);
  }, [filter, trams, buses, trainRoutes, favouriteRouteIds]);

  // Favourite stops
  const favStops = useMemo(
    () =>
      favouriteStopIds
        .map((id) => stopsById.get(id))
        .filter((s): s is Stop => s !== undefined),
    [favouriteStopIds, stopsById]
  );

  // Recently viewed routes & stops (up to 8 each)
  const recentRouteItems = useMemo(
    () =>
      recentRoutes
        .slice(0, 8)
        .map((r) => routesById.get(r.id))
        .filter((r): r is Route => r !== undefined),
    [recentRoutes, routesById]
  );

  const recentStopItems = useMemo(
    () =>
      recentStops
        .slice(0, 8)
        .map((r) => stopsById.get(r.id))
        .filter((s): s is Stop => s !== undefined),
    [recentStops, stopsById]
  );

  const hasRecents = recentRouteItems.length > 0 || recentStopItems.length > 0;

  // Filtered routes
  const filteredRoutes = useMemo(() => {
    const sourceRoutes = filter === 'tram' ? trams : filter === 'trains' ? trainRoutes : buses;
    if (!searchQuery.trim()) return sourceRoutes;
    const query = searchQuery.toLowerCase();
    return sourceRoutes.filter(
      (route) =>
        route.shortName.toLowerCase().includes(query) ||
        route.longName.toLowerCase().includes(query)
    );
  }, [filter, searchQuery, trams, buses, trainRoutes]);

  // Filtered stops (deduped by name)
  const filteredStops = useMemo(() => {
    if (filter !== 'stanice') return [];
    const query = searchQuery.trim().toLowerCase();
    const source = query
      ? platformStops.filter((s) => s.name.toLowerCase().includes(query))
      : platformStops;

    const seen = new Set<string>();
    const unique: Stop[] = [];
    for (const s of source) {
      if (!seen.has(s.name)) {
        seen.add(s.name);
        unique.push(s);
      }
    }
    return unique.slice(0, 100);
  }, [filter, searchQuery, platformStops]);

  const handleSelectRoute = (route: Route) => {
    const routeType = isRouteTypeTram(route.type) ? 'tram' : isRouteTypeBus(route.type) ? 'bus' : isRouteTypeRail(route.type) ? 'train' : 'other';
    trackEvent('route_selected', { route_id: route.id, route_name: route.shortName, route_type: routeType });
    onSelectRoute(route.id, route.type, 'A');
    onClose();
  };

  const handleSelectStop = (stop: Stop) => {
    trackEvent('stop_selected', { stop_id: stop.id, stop_name: stop.name });
    onSelectStop(stop.id);
    onClose();
  };

  if (!isOpen) return null;

  const isRouteFilter = filter === 'tram' || filter === 'bus' || filter === 'trains';
  const isTramOrBus = filter === 'tram' || filter === 'bus';
  const isTram = filter === 'tram';
  const badgeColor = isTram ? '#2563eb' : filter === 'trains' ? '#64748b' : '#d97706';

  return (
    <div className="fixed inset-0 z-[3000] flex items-start justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        style={{ animation: 'backdrop-fade-in 0.15s ease-out' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-2 mt-2 sm:mt-8 max-h-[90vh] bg-base-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'modal-fade-in 0.2s ease-out' }}
      >
        {/* Header / Search */}
        <div className="p-4 border-b border-base-300">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold flex-1">Pretraži</h2>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-circle btn-sm min-h-[44px] min-w-[44px]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search input */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={filter === 'stanice' ? 'Naziv stanice...' : 'Broj ili naziv linije...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered w-full pl-10 pr-10 min-h-[44px] text-base"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/80"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
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
                  <span className="hidden sm:inline">Vlakovi ({trainRoutes.length})</span>
                  <span className="sm:hidden">Vlak ({trainRoutes.length})</span>
                </button>
                <button
                  className={`tab flex-1 min-h-[40px] gap-1 text-xs sm:text-sm ${filter === 'stanice' ? 'tab-active' : ''}`}
                  onClick={() => setFilter('stanice')}
                >
                  <MapPin className="w-4 h-4" />
                  Stanice
                </button>
              </>
            ) : (
              <>
                <button
                  className={`tab flex-1 min-h-[40px] gap-1 text-xs sm:text-sm ${filter === 'tram' ? 'tab-active' : ''}`}
                  onClick={() => setFilter('tram')}
                >
                  <TrainFront className="w-4 h-4" />
                  <span className="hidden sm:inline">Tramvaji ({trams.length})</span>
                  <span className="sm:hidden">Tram ({trams.length})</span>
                </button>
                <button
                  className={`tab flex-1 min-h-[40px] gap-1 text-xs sm:text-sm ${filter === 'bus' ? 'tab-active' : ''}`}
                  onClick={() => setFilter('bus')}
                >
                  <Bus className="w-4 h-4" />
                  <span className="hidden sm:inline">Autobusi ({buses.length})</span>
                  <span className="sm:hidden">Bus ({buses.length})</span>
                </button>
                <button
                  className={`tab flex-1 min-h-[40px] gap-1 text-xs sm:text-sm ${filter === 'stanice' ? 'tab-active' : ''}`}
                  onClick={() => setFilter('stanice')}
                >
                  <MapPin className="w-4 h-4" />
                  Stanice
                </button>
              </>
            )}
          </div>

          {/* Favourites quick access */}
          {!searchQuery && (
            <>
              {isRouteFilter && favRoutes.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-1 text-xs text-base-content/60 mb-1.5">
                    <Star className="w-3 h-3 fill-current text-warning" />
                    <span>Favoriti:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {favRoutes.map((route) => (
                      <button
                        key={route.id}
                        onClick={() => handleSelectRoute(route)}
                        className="badge badge-lg font-bold hover:opacity-80 transition-opacity cursor-pointer text-white"
                        style={{ backgroundColor: badgeColor }}
                      >
                        {route.shortName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {filter === 'stanice' && favStops.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-1 text-xs text-base-content/60 mb-1.5">
                    <Star className="w-3 h-3 fill-current text-warning" />
                    <span>Favoriti:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {favStops.map((stop) => (
                      <button
                        key={stop.id}
                        onClick={() => handleSelectStop(stop)}
                        className="badge badge-outline badge-lg hover:badge-primary transition-colors cursor-pointer text-xs"
                      >
                        {stop.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Popular routes (shown only when no favourites in that tab) */}
              {isTramOrBus && favRoutes.length === 0 && quickAccessRoutes.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-base-content/60 mb-1.5">Brzi pristup:</div>
                  <div className="flex flex-wrap gap-2">
                    {quickAccessRoutes.map((route) => (
                      <button
                        key={route.id}
                        onClick={() => handleSelectRoute(route)}
                        className="badge badge-lg font-bold hover:opacity-80 transition-opacity cursor-pointer text-white"
                        style={{ backgroundColor: badgeColor }}
                      >
                        {route.shortName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Recently viewed — only when query is empty */}
        {!searchQuery && hasRecents && (
          <div className="px-4 py-3 border-b border-base-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 text-xs text-base-content/60">
                <Clock className="w-3 h-3" />
                <span>Nedavno pregledano</span>
              </div>
              <button
                onClick={clearRecents}
                className="text-xs text-base-content/40 hover:text-base-content/70 transition-colors"
              >
                Očisti
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentRouteItems.map((route) => (
                <button
                  key={`recent-r-${route.id}`}
                  onClick={() => handleSelectRoute(route)}
                  className="badge badge-md font-bold hover:opacity-80 transition-opacity cursor-pointer text-white"
                  style={{ backgroundColor: isRouteTypeTram(route.type) ? '#2563eb' : isRouteTypeRail(route.type) ? '#64748b' : '#d97706' }}
                >
                  {route.shortName}
                </button>
              ))}
              {recentStopItems.map((stop) => (
                <button
                  key={`recent-s-${stop.id}`}
                  onClick={() => handleSelectStop(stop)}
                  className="badge badge-ghost badge-md hover:badge-outline transition-colors cursor-pointer text-xs flex items-center gap-1"
                >
                  <MapPin className="w-2.5 h-2.5" />
                  {stop.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Route list */}
          {isRouteFilter && (
            filteredRoutes.length === 0 ? (
              <div className="p-8 text-center text-base-content/50">
                {searchQuery ? 'Nema rezultata' : 'Nema linija'}
              </div>
            ) : (
              <div className="divide-y divide-base-300">
                {filteredRoutes.map((route) => {
                  const isFav = favouriteRouteIds.includes(route.id);
                  return (
                    <div
                      key={route.id}
                      className="flex items-center hover:bg-base-200 active:bg-base-300 transition-colors"
                    >
                      <button
                        onClick={() => handleSelectRoute(route)}
                        className="flex-1 py-3 px-4 text-left min-h-[52px]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="badge font-bold min-w-[3rem] justify-center text-white" style={{ backgroundColor: badgeColor }}>
                            {route.shortName}
                          </div>
                          <div className="text-sm">{route.longName}</div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          trackEvent('favourite_toggled', { item_type: 'route', route_id: route.id, action: favouriteRouteIds.includes(route.id) ? 'remove' : 'add' });
                          toggleFavouriteRoute(route.id);
                        }}
                        className="px-3 py-3 text-base-content/30 hover:text-warning transition-colors min-h-[52px] flex items-center"
                        title={isFav ? 'Ukloni iz favorita' : 'Dodaj u favorite'}
                      >
                        <Star
                          className="w-4 h-4"
                          fill={isFav ? 'currentColor' : 'none'}
                          color={isFav ? '#f59e0b' : 'currentColor'}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Stop list */}
          {filter === 'stanice' && (
            filteredStops.length === 0 ? (
              <div className="p-8 text-center text-base-content/50">
                {searchQuery ? 'Nema rezultata' : 'Upišite naziv stanice za pretragu'}
              </div>
            ) : (
              <div className="divide-y divide-base-300">
                {filteredStops.map((stop) => {
                  const isFav = favouriteStopIds.includes(stop.id);
                  return (
                    <div
                      key={stop.id}
                      className="flex items-center hover:bg-base-200 active:bg-base-300 transition-colors"
                    >
                      <button
                        onClick={() => handleSelectStop(stop)}
                        className="flex-1 py-3 px-4 text-left min-h-[52px]"
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-base-content/40 shrink-0" />
                          <div>
                            <div className="text-sm font-medium">{stop.name}</div>
                            {stop.code && (
                              <div className="text-xs text-base-content/50">Smjer {stop.code}</div>
                            )}
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          trackEvent('favourite_toggled', { item_type: 'stop', stop_id: stop.id, action: favouriteStopIds.includes(stop.id) ? 'remove' : 'add' });
                          toggleFavouriteStop(stop.id);
                        }}
                        className="px-3 py-3 text-base-content/30 hover:text-warning transition-colors min-h-[52px] flex items-center"
                        title={isFav ? 'Ukloni iz favorita' : 'Dodaj u favorite'}
                      >
                        <Star
                          className="w-4 h-4"
                          fill={isFav ? 'currentColor' : 'none'}
                          color={isFav ? '#f59e0b' : 'currentColor'}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
});
