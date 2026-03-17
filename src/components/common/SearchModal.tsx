/**
 * Search modal – route browsing, stop search, favourites & recently viewed.
 * Opens from the floating search bar on the map.
 */

import { useState, useMemo, useRef, useEffect, memo } from 'react';
import { Search, X, TrainFront, Bus, MapPin, Star, Clock, ArrowLeftRight, ChevronDown, ChevronRight } from 'lucide-react';
import type { Route, Stop } from '../../utils/gtfs';
import { bearingToDirection, isRouteTypeTram, isRouteTypeBus, isRouteTypeRail } from '../../utils/gtfs';
import { useSettingsStore } from '../../stores/settingsStore';
import { useGTFSMode } from '../../contexts/GTFSModeContext';
import { trackEvent } from '../../utils/analytics';
import { DirectionsPanel } from './DirectionsPanel';
import { useStopRoutes } from '../../hooks/useStopRoutes';
import { useStopTermini } from '../../hooks/useStopTermini';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: Route[];
  stops: Stop[];
  stopsById: Map<string, Stop>;
  onSelectRoute: (routeId: string, routeType: number, directionFilter?: 'A' | 'B') => void;
  onSelectStop: (stopId: string) => void;
}

type FilterType = 'tram' | 'bus' | 'trains' | 'stanice' | 'smjerovi';
type ParentStopGroup = {
  key: string;
  representative: Stop;
  terminals: Stop[];
};

function getStopTypeVisuals(routeType?: number): { Icon: typeof TrainFront; color: string; label: string } {
  if (routeType === 3) return { Icon: Bus, color: '#d97706', label: 'Autobusna stanica' };
  if (routeType === 2) return { Icon: TrainFront, color: '#dc2626', label: 'Željeznička stanica' };
  return { Icon: TrainFront, color: '#2563eb', label: 'Tramvajska stanica' };
}

const TerminalStopRow = memo(function TerminalStopRow({
  stop,
  routesById,
  stopsById,
  dataDir,
  onSelect,
}: {
  stop: Stop;
  routesById: Map<string, Route>;
  stopsById: Map<string, Stop>;
  dataDir: string;
  onSelect: (stop: Stop) => void;
}) {
  const { routes, loading: routesLoading } = useStopRoutes(stop.id, routesById, { dataDir });
  const { termini } = useStopTermini(stop.id, stopsById, routesById, { dataDir });
  const { Icon, color, label } = getStopTypeVisuals(stop.routeType);
  const heading = termini.length > 0
    ? `Smjer prema ${termini.join(', ')}`
    : stop.bearing !== undefined
      ? `Smjer prema ${bearingToDirection(stop.bearing)}`
      : stop.code
        ? `Smjer ${stop.code}`
        : 'Smjer nije dostupan';

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
                  style={{ backgroundColor: route.type === 0 ? '#2563eb' : route.type === 2 ? '#64748b' : '#d97706' }}
                >
                  {route.shortName}
                </span>
              ))}
              {routes.length > 8 && (
                <span className="text-[11px] text-base-content/60">+{routes.length - 8}</span>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-base-content/50 mt-0.5">Nema linija za prikaz</div>
          )}
        </div>
      </div>
    </button>
  );
});

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
  const [expandedStopKeys, setExpandedStopKeys] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    favouriteRouteIds,
    favouriteStopIds,
    recentRoutes,
    recentStops,
    toggleFavouriteRoute,
    toggleFavouriteStop,
    removeRecentRoutes,
    removeRecentStops,
  } = useSettingsStore();

  const [recentsExpanded, setRecentsExpanded] = useState(true);

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

  // Recently viewed routes & stops merged by recency, filtered by current tab
  const recentItemsMerged = useMemo(() => {
    const withType = [
      ...recentRoutes.map((r) => ({ ...r, type: 'route' as const })),
      ...recentStops.map((s) => ({ ...s, type: 'stop' as const })),
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 12);
    const resolved = withType
      .map((item) => {
        if (item.type === 'route') {
          const route = routesById.get(item.id);
          return route ? { type: 'route' as const, data: route } : null;
        }
        const stop = stopsById.get(item.id);
        return stop ? { type: 'stop' as const, data: stop } : null;
      })
      .filter((x): x is { type: 'route'; data: Route } | { type: 'stop'; data: Stop } => x !== null);

    // Filter by current tab: tram/bus/trains show matching routes + stops; stanice shows stops only
    if (filter === 'stanice') {
      return resolved.filter((x) => x.type === 'stop');
    }
    if (filter === 'tram' || filter === 'bus' || filter === 'trains') {
      const routeTypeMatch =
        filter === 'tram' ? isRouteTypeTram : filter === 'bus' ? isRouteTypeBus : isRouteTypeRail;
      return resolved.filter(
        (x) => x.type === 'route' && routeTypeMatch(x.data.type)
      );
    }
    return resolved;
  }, [recentRoutes, recentStops, routesById, stopsById, filter]);

  const hasRecents = recentItemsMerged.length > 0;

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

  // Filtered parent stop groups with expandable terminal lists
  const filteredStopGroups = useMemo(() => {
    if (filter !== 'stanice') return [];
    const query = searchQuery.trim().toLowerCase();
    const source = query
      ? platformStops.filter((s) => s.name.toLowerCase().includes(query))
      : platformStops;

    const groupsByKey = new Map<string, Stop[]>();
    for (const s of source) {
      const key = s.parentStation ? `parent:${s.parentStation}` : `name:${s.name.toLowerCase()}`;
      const existing = groupsByKey.get(key);
      if (existing) existing.push(s);
      else groupsByKey.set(key, [s]);
    }

    const groups: ParentStopGroup[] = [];
    for (const [key, terminalsRaw] of groupsByKey) {
      const terminals = key.startsWith('parent:')
        ? terminalsRaw
        : (() => {
          const seen = new Set<string>();
          return terminalsRaw.filter((s) => {
            const directionKey = s.bearing !== undefined ? bearingToDirection(s.bearing) : s.code || s.id;
            if (seen.has(directionKey)) return false;
            seen.add(directionKey);
            return true;
          });
        })();
      const sorted = terminals.slice().sort((a, b) => (a.code || '').localeCompare(b.code || ''));
      groups.push({ key, representative: sorted[0] || terminalsRaw[0], terminals: sorted });
    }

    groups.sort((a, b) => a.representative.name.localeCompare(b.representative.name));
    return groups.slice(0, 100);
  }, [filter, searchQuery, platformStops]);

  useEffect(() => {
    setExpandedStopKeys(new Set());
  }, [filter, searchQuery]);

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

  const handleSelectDirectionsRoute = (routeId: string, routeType: number, direction: 'A' | 'B') => {
    trackEvent('directions_route_selected', { route_id: routeId, direction });
    onSelectRoute(routeId, routeType, direction);
    onClose();
  };

  const handleClearRecentsForTab = () => {
    const routeIds = recentItemsMerged.filter((x) => x.type === 'route').map((x) => x.data.id);
    const stopIds = recentItemsMerged.filter((x) => x.type === 'stop').map((x) => x.data.id);
    if (routeIds.length > 0) removeRecentRoutes(routeIds);
    if (stopIds.length > 0) removeRecentStops(stopIds);
  };

  if (!isOpen) return null;

  const isRouteFilter = filter === 'tram' || filter === 'bus' || filter === 'trains';
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

      {/* Modal — use svh so it fits on mobile when browser bar is visible */}
      <div
        className="relative w-full max-w-lg mx-2 mt-2 sm:mt-8 max-h-[90svh] bg-base-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
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
                <button
                  className={`tab flex-1 min-h-[40px] gap-1 text-xs sm:text-sm ${filter === 'smjerovi' ? 'tab-active' : ''}`}
                  onClick={() => setFilter('smjerovi')}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Smjerovi
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
                <button
                  className={`tab flex-1 min-h-[40px] gap-1 text-xs sm:text-sm ${filter === 'smjerovi' ? 'tab-active' : ''}`}
                  onClick={() => setFilter('smjerovi')}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Smjerovi
                </button>
              </>
            )}
          </div>

          {/* Search input */}
          {filter !== 'smjerovi' && (
            <div className="relative mt-3 ">
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
          )}

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
            </>
          )}
        </div>

        {/* Recently viewed — collapsible, single-line scroll, clear only active tab items */}
        {filter !== 'smjerovi' && !searchQuery && hasRecents && (
          <div className="px-4 py-2 border-b border-base-300">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setRecentsExpanded((e) => !e)}
                className="flex items-center gap-1 text-xs text-base-content/60 hover:text-base-content/80 transition-colors"
                aria-expanded={recentsExpanded}
              >
                <Clock className="w-3 h-3 shrink-0" />
                <span>Nedavno pregledano</span>
                {recentsExpanded ? (
                  <ChevronDown className="w-3 h-3 shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 shrink-0" />
                )}
              </button>
              <button
                onClick={handleClearRecentsForTab}
                className="text-xs text-base-content/40 hover:text-base-content/70 transition-colors shrink-0"
              >
                Očisti
              </button>
            </div>
            {recentsExpanded && (
              <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 -mx-1 px-1 mt-1.5">
                {recentItemsMerged.map((item) =>
                  item.type === 'route' ? (
                    <button
                      key={`recent-r-${item.data.id}`}
                      onClick={() => handleSelectRoute(item.data)}
                      className="badge badge-md font-bold hover:opacity-80 transition-opacity cursor-pointer text-white shrink-0"
                      style={{ backgroundColor: isRouteTypeTram(item.data.type) ? '#2563eb' : isRouteTypeRail(item.data.type) ? '#64748b' : '#d97706' }}
                    >
                      {item.data.shortName}
                    </button>
                  ) : (
                    <button
                      key={`recent-s-${item.data.id}`}
                      onClick={() => handleSelectStop(item.data)}
                      className="badge badge-ghost badge-md hover:badge-outline transition-colors cursor-pointer text-xs flex items-center gap-1 shrink-0"
                    >
                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                      <span className="whitespace-nowrap truncate max-w-[120px]">{item.data.name}</span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {filter === 'smjerovi' && (
            <DirectionsPanel
              stops={stops}
              routesById={routesById}
              dataDir={config.dataDir}
              onRouteClick={handleSelectDirectionsRoute}
            />
          )}

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
            filteredStopGroups.length === 0 ? (
              <div className="p-8 text-center text-base-content/50">
                {searchQuery ? 'Nema rezultata' : 'Upišite naziv stanice za pretragu'}
              </div>
            ) : (
              <div className="divide-y divide-base-300">
                {filteredStopGroups.map((group) => {
                  const { representative, terminals, key } = group;
                  const isFav = favouriteStopIds.includes(representative.id);
                  const isExpanded = expandedStopKeys.has(key);
                  return (
                    <div key={key}>
                      <div className="flex items-center hover:bg-base-200 active:bg-base-300 transition-colors">
                        <button
                          onClick={() =>
                            setExpandedStopKeys((prev) => {
                              const next = new Set(prev);
                              if (next.has(key)) next.delete(key);
                              else next.add(key);
                              return next;
                            })
                          }
                          className="flex-1 flex items-center"
                          aria-expanded={isExpanded}
                          aria-controls={`terminals-${key}`}
                        >
                          <div className="flex-1 py-3 px-4 text-left min-h-[52px]">
                            <div className="flex items-center gap-3">
                              <MapPin className="w-4 h-4 text-base-content/40 shrink-0" />
                              <div>
                                <div className="text-sm font-medium">{representative.name}</div>
                                <div className="text-xs text-base-content/50">
                                  {terminals.length} {terminals.length === 1 ? 'terminal' : 'terminala'}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="pr-2 text-base-content/40">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            trackEvent('favourite_toggled', { item_type: 'stop', stop_id: representative.id, action: favouriteStopIds.includes(representative.id) ? 'remove' : 'add' });
                            toggleFavouriteStop(representative.id);
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
                      {isExpanded && (
                        <div id={`terminals-${key}`} className="pb-2">
                          <div className="mx-4 border-l border-base-300">
                            {terminals.map((terminal) => (
                              <TerminalStopRow
                                key={terminal.id}
                                stop={terminal}
                                routesById={routesById}
                                stopsById={stopsById}
                                dataDir={config.dataDir}
                                onSelect={handleSelectStop}
                              />
                            ))}
                          </div>
                        </div>
                      )}
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
