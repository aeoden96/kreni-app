/**
 * Search modal – route browsing, stop search, favourites & recently viewed.
 * Opens from the floating search bar on the map.
 */

import { memo } from 'react';
import type { Route, Stop } from '../../utils/gtfs';
import { useSearchModal } from '../../hooks/useSearchModal';
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

export const SearchModal = memo(function SearchModal(props: SearchModalProps) {
  const {
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
    setDirFromStop,
    dirToStop,
    dirActiveField,
    setDirActiveField,
    dirToQuery,
    setDirToQuery,
    dirToInputRef,
    handleDirSwap,
    favRoutes,
    favStops,
    badgeColor,
    handleSelectRoute,
    handleSelectStop,
    filteredRoutes,
    favouriteRouteIds,
    toggleFavouriteRoute,
    filteredStopGroups,
    expandedStopKeys,
    setExpandedStopKeys,
    routesById,
    stopsById,
    favouriteStopIds,
    toggleFavouriteStop,
    filteredDirStops,
    dirResultLabel,
    dirLoading,
    dirResults,
    handleSelectDirectionsRoute,
    handleDirStopSelect,
    recentItemsMerged,
    recentsExpanded,
    setRecentsExpanded,
    handleClearRecentsForTab,
    isRouteFilter,
    hasRecents,
  } = useSearchModal(props);

  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-start justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        style={{ animation: 'backdrop-fade-in 0.15s ease-out' }}
        onClick={props.onClose}
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
          onClose={props.onClose}
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
