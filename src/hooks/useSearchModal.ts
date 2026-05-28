import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Route, Stop } from '../utils/gtfs';

import { useGTFSMode } from '../contexts/GTFSModeContext';
import { useSettingsStore } from '../stores/settingsStore';
import { trackEvent } from '../utils/analytics';
import { isRouteTypeBus, isRouteTypeRail, isRouteTypeTram } from '../utils/gtfs';
import {
  filterParentStops,
  filterRoutes,
  type FilterType,
  getBadgeColor,
  groupPlatformStops,
  mergeAndFilterRecents,
} from '../utils/searchUtils';
import { useDirections } from './useDirections';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoute: (routeId: string, routeType: number, directionFilter?: 'A' | 'B') => void;
  onSelectStop: (stopId: string) => void;
  routes: Route[];
  stops: Stop[];
  stopsById: Map<string, Stop>;
}

export function useSearchModal({
  isOpen,
  onClose,
  onSelectRoute,
  onSelectStop,
  routes,
  stops,
  stopsById,
}: SearchModalProps) {
  const { t } = useTranslation();
  const config = useGTFSMode();
  const [filter, setFilter] = useState<FilterType>(config.id === 'train' ? 'trains' : 'stanice');
  const [stopsMode, setStopsMode] = useState<'directions' | 'search'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStopKeys, setExpandedStopKeys] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [dirFromStop, setDirFromStop] = useState<null | Stop>(null);
  const [dirToStop, setDirToStop] = useState<null | Stop>(null);
  const [dirActiveField, setDirActiveField] = useState<'from' | 'to'>('from');
  const [dirToQuery, setDirToQuery] = useState('');
  const dirToInputRef = useRef<HTMLInputElement>(null);

  const {
    favouriteRouteIds,
    favouriteStopIds,
    recentRoutes,
    recentStops,
    removeRecentRoutes,
    removeRecentStops,
    toggleFavouriteRoute,
    toggleFavouriteStop,
  } = useSettingsStore();

  const [recentsExpanded, setRecentsExpanded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
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

  const { buses, trainRoutes, trams } = useMemo(
    () =>
      routes.reduce(
        (acc, route) => {
          if (isRouteTypeTram(route.type)) acc.trams.push(route);
          else if (isRouteTypeBus(route.type)) acc.buses.push(route);
          else if (isRouteTypeRail(route.type)) acc.trainRoutes.push(route);
          return acc;
        },
        { buses: [] as Route[], trainRoutes: [] as Route[], trams: [] as Route[] }
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
    () => favouriteStopIds.map((id) => stopsById.get(id)).filter((s): s is Stop => s !== undefined),
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
      return { hasMore: false, stops: [] } as ReturnType<typeof filterParentStops>;
    }
    const query = dirActiveField === 'from' ? searchQuery : dirToQuery;
    return filterParentStops(parentStops, query);
  }, [filter, stopsMode, dirActiveField, searchQuery, dirToQuery, parentStops]);

  const { loading: dirLoading, results: dirResults } = useDirections(
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
    trackEvent('directions_route_selected', { direction, route_id: routeId });
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
      if (!dirFromStop) {
        setDirActiveField('from');
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
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

  const isRouteFilter = filter === 'tram' || filter === 'bus' || filter === 'trains';
  const isDirsMode = filter === 'stanice' && stopsMode === 'directions';
  const badgeColor = getBadgeColor(filter);
  const hasRecents = recentItemsMerged.length > 0;

  return {
    badgeColor,
    buses,
    config,
    dirActiveField,
    dirFromStop,
    dirLoading,
    dirResultLabel,
    dirResults,
    dirToInputRef,
    dirToQuery,
    dirToStop,
    expandedStopKeys,
    favouriteRouteIds,
    favouriteStopIds,
    favRoutes,
    favStops,
    filter,
    filteredDirStops,
    filteredRoutes,
    filteredStopGroups,
    handleClearRecentsForTab,
    handleDirStopSelect,
    handleDirSwap,
    handleSelectDirectionsRoute,
    handleSelectRoute,
    handleSelectStop,
    hasRecents,
    isDirsMode,
    isRouteFilter,
    recentItemsMerged,
    recentsExpanded,
    routesById,
    searchInputRef,
    searchQuery,
    setDirActiveField,
    setDirFromStop,
    setDirToQuery,
    setDirToStop,
    setExpandedStopKeys,
    setFilter,
    setRecentsExpanded,
    setSearchQuery,
    setStopsMode,
    stopsById,
    stopsMode,
    toggleFavouriteRoute,
    toggleFavouriteStop,
    trainRoutes,
    trams,
  };
}
