/**
 * Search modal – route browsing, stop search, favourites & recently viewed.
 * Opens from the floating search bar on the map.
 */

import { memo } from 'react';

import type { Route, Stop } from '../../utils/gtfs';

import { useSearchModal } from '../../hooks/useSearchModal';
import { RecentsBar } from './search/RecentsBar';
import { RouteList } from './search/RouteList';
import { SearchHeader } from './search/SearchHeader';
import { StopGroupList } from './search/StopGroupList';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoute: (routeId: string, routeType: number, directionFilter?: 'A' | 'B') => void;
  onSelectStop: (stopId: string) => void;
  routes: Route[];
  stops: Stop[];
  stopsById: Map<string, Stop>;
}

export const SearchModal = memo(function SearchModal(props: SearchModalProps) {
  const {
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
  } = useSearchModal(props);

  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-start justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={props.onClose}
        style={{ animation: 'backdrop-fade-in 0.15s ease-out' }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-2 mt-2 sm:mt-8 max-h-[90svh] bg-base-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'modal-fade-in 0.2s ease-out' }}
      >
        <SearchHeader
          badgeColor={badgeColor}
          buses={buses}
          config={config}
          favRoutes={favRoutes}
          favStops={favStops}
          filter={filter}
          onClose={props.onClose}
          onSelectRoute={handleSelectRoute}
          onSelectStop={handleSelectStop}
          searchInputRef={searchInputRef}
          searchQuery={searchQuery}
          setFilter={setFilter}
          setSearchQuery={setSearchQuery}
          trainRoutes={trainRoutes}
          trams={trams}
        />

        {/* Content list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {isRouteFilter && (
            <RouteList
              badgeColor={badgeColor}
              favouriteRouteIds={favouriteRouteIds}
              filteredRoutes={filteredRoutes}
              onSelectRoute={handleSelectRoute}
              searchQuery={searchQuery}
              toggleFavouriteRoute={toggleFavouriteRoute}
            />
          )}

          {filter === 'stanice' && (
            <StopGroupList
              dataDir={config.dataDir}
              expandedStopKeys={expandedStopKeys}
              favouriteStopIds={favouriteStopIds}
              filteredStopGroups={filteredStopGroups}
              onSelectStop={handleSelectStop}
              routesById={routesById}
              searchQuery={searchQuery}
              setExpandedStopKeys={setExpandedStopKeys}
              stopsById={stopsById}
              toggleFavouriteStop={toggleFavouriteStop}
            />
          )}
        </div>

        {/* Recently viewed — sticky footer */}
        {!searchQuery && hasRecents && (
          <RecentsBar
            onClearRecents={handleClearRecentsForTab}
            onSelectRoute={handleSelectRoute}
            onSelectStop={handleSelectStop}
            recentItemsMerged={recentItemsMerged}
            recentsExpanded={recentsExpanded}
            setRecentsExpanded={setRecentsExpanded}
          />
        )}
      </div>
    </div>
  );
});
