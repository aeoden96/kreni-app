import { useEffect, useMemo, useRef, useState } from 'react';

import type { Route, Stop } from '../utils/gtfs';

import { useGTFSMode } from '../contexts/GTFSModeContext';
import { useSettingsStore } from '../stores/settingsStore';
import { trackEvent } from '../utils/analytics';
import { isRouteTypeBus, isRouteTypeRail, isRouteTypeTram } from '../utils/gtfs';
import {
  filterRoutes,
  type FilterType,
  getBadgeColor,
  groupPlatformStops,
  mergeAndFilterRecents,
} from '../utils/searchUtils';

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
  const config = useGTFSMode();
  const [filter, setFilter] = useState<FilterType>(config.id === 'train' ? 'trains' : 'stanice');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStopKeys, setExpandedStopKeys] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    setExpandedStopKeys(new Set());
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
    if (filter !== 'stanice') {
      return { groups: [], hasMore: false } as ReturnType<typeof groupPlatformStops>;
    }
    return groupPlatformStops(platformStops, searchQuery);
  }, [filter, searchQuery, platformStops]);

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

  const handleClearRecentsForTab = () => {
    const routeIds = recentItemsMerged.filter((x) => x.type === 'route').map((x) => x.data.id);
    const stopIds = recentItemsMerged.filter((x) => x.type === 'stop').map((x) => x.data.id);
    if (routeIds.length > 0) removeRecentRoutes(routeIds);
    if (stopIds.length > 0) removeRecentStops(stopIds);
  };

  const isRouteFilter = filter === 'tram' || filter === 'bus' || filter === 'trains';
  const badgeColor = getBadgeColor(filter);
  const hasRecents = recentItemsMerged.length > 0;

  return {
    badgeColor,
    buses,
    config,
    expandedStopKeys,
    favouriteRouteIds,
    favouriteStopIds,
    favRoutes,
    favStops,
    filter,
    filteredRoutes,
    filteredStopGroups,
    handleClearRecentsForTab,
    handleSelectRoute,
    handleSelectStop,
    hasRecents,
    isRouteFilter,
    recentItemsMerged,
    recentsExpanded,
    routesById,
    searchInputRef,
    searchQuery,
    setExpandedStopKeys,
    setFilter,
    setRecentsExpanded,
    setSearchQuery,
    stopsById,
    toggleFavouriteRoute,
    toggleFavouriteStop,
    trainRoutes,
    trams,
  };
}
