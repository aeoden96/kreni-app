/**
 * Search modal – route browsing, stop search, favourites & recently viewed.
 * Opens from the floating search bar on the map.
 */

import { useState, useMemo, useRef, useEffect, memo } from 'react';
import type { Route, Stop } from '../../utils/gtfs';
import { isRouteTypeTram, isRouteTypeBus, isRouteTypeRail } from '../../utils/gtfs';
import { useSettingsStore } from '../../stores/settingsStore';
import { useGTFSMode } from '../../contexts/GTFSModeContext';
import { trackEvent } from '../../utils/analytics';
import { useDirections } from '../../hooks/useDirections';
import { useTranslation } from 'react-i18next';
import {
  type FilterType,
  getBadgeColor,
  filterRoutes,
  groupPlatformStops,
  filterParentStops,
  mergeAndFilterRecents,
} from '../../utils/searchUtils';
import { SearchHeader } from './search/SearchHeader';
import { RouteList } from './search/RouteList';
import { StopGroupList } from './search/StopGroupList';
import { DirectionsContent } from './search/DirectionsContent';
import { RecentsBar } from './search/RecentsBar';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: Route[];
  stops: Stop[];
  stopsById: Map<string, Stop>;
  onSelectRoute: (routeId: string, routeType: number, directionFilter?: 'A' | 'B') => void;
  onSelectStop: (stopId: string) => void;
}

export const SearchModal = memo(function SearchModal({
  isOpen,
  onClose,
  routes,
  stops,
  stopsById,
  onSelectRoute,
  onSelectStop,
}: SearchModalProps) {
  const { t } = useTranslation();
  const config = useGTFSMode();
  const [filter, setFilter] = useState<FilterType>(config.id === 'train' ? 'trains' : 'stanice');
  const [stopsMode, setStopsMode] = useState<'search' | 'directions'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStopKeys, setExpandedStopKeys] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Directions mode state
  const [dirFromStop, setDirFromStop] = useState<Stop | null>(null);
  const [dirToStop, setDirToStop] = useState<Stop | null>(null);
  const [dirActiveField, setDirActiveField] = useState<'from' | 'to'>('from');
  const [dirToQuery, setDirToQuery] = useState('');
  const dirToInputRef = useRef<HTMLInputElement>(null);

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

  const [recentsExpanded, setRecentsExpanded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
      setStopsMode('search');
    }
  }, [isOpen]);

  useEffect(() => {
    if (stopsMode !== 'directions') {
      setDirFromStop(null);
      setDirToStop(null);
      setDirActiveField('from');
      setDirToQuery('');
    }
  }, [stopsMode]);

  useEffect(() => {
    setExpandedStopKeys(new Set());
    if (filter !== 'stanice') {
      setStopsMode('search');
    }
  }, [filter, searchQuery]);

  // Routes split by type
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

  const routesById = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes]);

  const platformStops = useMemo(() => stops.filter((s) => s.locationType === 0), [stops]);

  const parentStops = useMemo(() => {
    const canonicalParentIds = new Set(
      platformStops.map((s) => s.parentStation).filter((id): id is string => id != null)
    );
    return stops
      .filter((s) => s.locationType === 1 && canonicalParentIds.has(s.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [stops, platformStops]);

  const favRoutes = useMemo(() => {
    const source = filter === 'tram' ? trams : filter === 'trains' ? trainRoutes : buses;
    return favouriteRouteIds
      .map((id) => source.find((r) => r.id === id))
      .filter((r): r is Route => r !== undefined);
  }, [filter, trams, buses, trainRoutes, favouriteRouteIds]);

  const favStops = useMemo(
    () =>
      favouriteStopIds
        .map((id) => stopsById.get(id))
        .filter((s): s is Stop => s !== undefined),
    [favouriteStopIds, stopsById]
  );

  const recentItemsMerged = useMemo(
    () => mergeAndFilterRecents(recentRoutes, recentStops, routesById, stopsById, filter),
    [recentRoutes, recentStops, routesById, stopsById, filter]
  );

  const sourceRoutes = filter === 'tram' ? trams : filter === 'trains' ? trainRoutes : buses;
  const filteredRoutes = useMemo(
    () => filterRoutes(sourceRoutes, searchQuery),
    [sourceRoutes, searchQuery]
  );

  const filteredStopGroups = useMemo(() => {
    if (filter !== 'stanice' || stopsMode !== 'search') {
      return { groups: [], hasMore: false } as ReturnType<typeof groupPlatformStops>;
    }
    return groupPlatformStops(platformStops, searchQuery);
  }, [filter, stopsMode, searchQuery, platformStops]);

  const filteredDirStops = useMemo(() => {
    if (filter !== 'stanice' || stopsMode !== 'directions') {
      return { stops: [], hasMore: false } as ReturnType<typeof filterParentStops>;
    }
    const query = dirActiveField === 'from' ? searchQuery : dirToQuery;
    return filterParentStops(parentStops, query);
  }, [filter, stopsMode, dirActiveField, searchQuery, dirToQuery, parentStops]);

  const { results: dirResults, loading: dirLoading } = useDirections(
    dirFromStop?.id ?? null,
    dirToStop?.id ?? null,
    routesById,
    { dataDir: config.dataDir }
  );

  const dirResultLabel = useMemo(() => {
    if (!dirFromStop || !dirToStop) return '';
    if (dirLoading) return t('search.searchingDirectRoutes');
    if (dirResults.length === 0) return t('search.noDirectRoutes');
    if (dirResults.length === 1) return t('search.directRoutesSingle');
    return t('search.directRoutesMany', { count: dirResults.length });
  }, [dirFromStop, dirToStop, dirLoading, dirResults.length, t]);

  // ── Event handlers ──────────────────────────────────────────────────────────

  const handleSelectRoute = (route: Route) => {
    const routeType = isRouteTypeTram(route.type)
      ? 'tram'
      : isRouteTypeBus(route.type)
        ? 'bus'
        : isRouteTypeRail(route.type)
          ? 'train'
          : 'other';
    trackEvent('route_selected', {
      route_id: route.id,
      route_name: route.shortName,
      route_type: routeType,
    });
    onSelectRoute(route.id, route.type, 'A');
    onClose();
  };

  const handleSelectStop = (stop: Stop) => {
    trackEvent('stop_selected', { stop_id: stop.id, stop_name: stop.name });
    onSelectStop(stop.id);
    onClose();
  };

  const handleSelectDirectionsRoute = (
    routeId: string,
    routeType: number,
    direction: 'A' | 'B'
  ) => {
    trackEvent('directions_route_selected', { route_id: routeId, direction });
    onSelectRoute(routeId, routeType, direction);
    onClose();
  };

  const handleDirStopSelect = (stop: Stop) => {
    if (dirActiveField === 'from') {
      setDirFromStop(stop);
      setSearchQuery('');
      if (!dirToStop) {
        setDirActiveField('to');
        setTimeout(() => dirToInputRef.current?.focus(), 50);
      }
    } else {
      setDirToStop(stop);
      setDirToQuery('');
    }
  };

  const handleDirSwap = () => {
    const newFrom = dirToStop;
    const newTo = dirFromStop;
    setDirFromStop(newFrom);
    setDirToStop(newTo);
    setSearchQuery(newFrom ? '' : dirToQuery);
    setDirToQuery(newTo ? '' : searchQuery);
  };

  const handleClearRecentsForTab = () => {
    const routeIds = recentItemsMerged.filter((x) => x.type === 'route').map((x) => x.data.id);
    const stopIds = recentItemsMerged.filter((x) => x.type === 'stop').map((x) => x.data.id);
    if (routeIds.length > 0) removeRecentRoutes(routeIds);
    if (stopIds.length > 0) removeRecentStops(stopIds);
  };

  if (!isOpen) return null;

  const isRouteFilter = filter === 'tram' || filter === 'bus' || filter === 'trains';
  const isDirsMode = filter === 'stanice' && stopsMode === 'directions';
  const badgeColor = getBadgeColor(filter);
  const hasRecents = recentItemsMerged.length > 0;

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
        className="relative w-full max-w-lg mx-2 mt-2 sm:mt-8 max-h-[90svh] bg-base-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'modal-fade-in 0.2s ease-out' }}
      >
        <SearchHeader
          config={config}
          filter={filter}
          setFilter={setFilter}
          trams={trams}
          buses={buses}
          trainRoutes={trainRoutes}
          stopsMode={stopsMode}
          setStopsMode={setStopsMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchInputRef={searchInputRef}
          isDirsMode={isDirsMode}
          dirFromStop={dirFromStop}
          dirToStop={dirToStop}
          setDirActiveField={setDirActiveField}
          setDirFromStop={setDirFromStop}
          dirToQuery={dirToQuery}
          setDirToQuery={setDirToQuery}
          dirToInputRef={dirToInputRef}
          onDirSwap={handleDirSwap}
          favRoutes={favRoutes}
          favStops={favStops}
          badgeColor={badgeColor}
          onSelectRoute={handleSelectRoute}
          onSelectStop={handleSelectStop}
          onClose={onClose}
        />

        {/* Content list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {isDirsMode && (
            <DirectionsContent
              dirFromStop={dirFromStop}
              dirToStop={dirToStop}
              dirActiveField={dirActiveField}
              searchQuery={searchQuery}
              dirToQuery={dirToQuery}
              filteredDirStops={filteredDirStops}
              onDirStopSelect={handleDirStopSelect}
              dirResultLabel={dirResultLabel}
              dirLoading={dirLoading}
              dirResults={dirResults}
              onSelectDirectionsRoute={handleSelectDirectionsRoute}
            />
          )}

          {isRouteFilter && (
            <RouteList
              filteredRoutes={filteredRoutes}
              badgeColor={badgeColor}
              searchQuery={searchQuery}
              favouriteRouteIds={favouriteRouteIds}
              toggleFavouriteRoute={toggleFavouriteRoute}
              onSelectRoute={handleSelectRoute}
            />
          )}

          {filter === 'stanice' && stopsMode === 'search' && (
            <StopGroupList
              filteredStopGroups={filteredStopGroups}
              expandedStopKeys={expandedStopKeys}
              setExpandedStopKeys={setExpandedStopKeys}
              routesById={routesById}
              stopsById={stopsById}
              dataDir={config.dataDir}
              favouriteStopIds={favouriteStopIds}
              toggleFavouriteStop={toggleFavouriteStop}
              onSelectStop={handleSelectStop}
              searchQuery={searchQuery}
            />
          )}
        </div>

        {/* Recently viewed — sticky footer */}
        {!isDirsMode && !searchQuery && hasRecents && (
          <RecentsBar
            recentItemsMerged={recentItemsMerged}
            recentsExpanded={recentsExpanded}
            setRecentsExpanded={setRecentsExpanded}
            onClearRecents={handleClearRecentsForTab}
            onSelectRoute={handleSelectRoute}
            onSelectStop={handleSelectStop}
          />
        )}
      </div>
    </div>
  );
});
