import { ChevronDown, ChevronRight, MapPin, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Route, Stop } from '../../../utils/gtfs';
import type { ParentStopGroup } from '../../../utils/searchUtils';

import { trackEvent } from '../../../utils/analytics';
import { TerminalStopRow } from './TerminalStopRow';

interface StopGroupListProps {
  dataDir: string;
  expandedStopKeys: Set<string>;
  favouriteStopIds: string[];
  filteredStopGroups: { groups: ParentStopGroup[]; hasMore: boolean };
  onSelectStop: (stop: Stop) => void;
  routesById: Map<string, Route>;
  searchQuery: string;
  setExpandedStopKeys: (updater: (prev: Set<string>) => Set<string>) => void;
  stopsById: Map<string, Stop>;
  toggleFavouriteStop: (id: string) => void;
}

export function StopGroupList({
  dataDir,
  expandedStopKeys,
  favouriteStopIds,
  filteredStopGroups,
  onSelectStop,
  routesById,
  searchQuery,
  setExpandedStopKeys,
  stopsById,
  toggleFavouriteStop,
}: StopGroupListProps) {
  const { t } = useTranslation();

  if (filteredStopGroups.groups.length === 0) {
    return (
      <div className="p-8 text-center text-base-content/50">
        {searchQuery ? t('search.emptyNoResults') : t('search.emptyTypeStopToSearch')}
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-base-300">
        {filteredStopGroups.groups.map((group) => {
          const { key, representative, terminals } = group;
          const isFav = favouriteStopIds.includes(representative.id);
          const isExpanded = expandedStopKeys.has(key);
          return (
            <div key={key}>
              <div className="flex items-center hover:bg-base-200 active:bg-base-300 transition-colors">
                <button
                  aria-controls={`terminals-${key}`}
                  aria-expanded={isExpanded}
                  className="flex-1 flex items-center"
                  onClick={() =>
                    setExpandedStopKeys((prev) => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    })
                  }
                >
                  <div className="flex-1 py-3 px-4 text-left min-h-[52px]">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-base-content/40 shrink-0" />
                      <div>
                        <div className="text-sm font-medium">{representative.name}</div>
                        <div className="text-xs text-base-content/50">
                          {t('search.terminalsCount', { count: terminals.length })}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pr-2 text-base-content/40">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </button>
                <button
                  className="px-3 py-3 text-base-content/30 hover:text-warning transition-colors min-h-[52px] flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    trackEvent('favourite_toggled', {
                      action: favouriteStopIds.includes(representative.id) ? 'remove' : 'add',
                      item_type: 'stop',
                      stop_id: representative.id,
                    });
                    toggleFavouriteStop(representative.id);
                  }}
                  title={isFav ? t('search.favouriteRemove') : t('search.favouriteAdd')}
                >
                  <Star
                    className="w-4 h-4"
                    color={isFav ? '#f59e0b' : 'currentColor'}
                    fill={isFav ? '#f59e0b' : 'none'}
                  />
                </button>
              </div>
              {isExpanded && (
                <div className="pb-2" id={`terminals-${key}`}>
                  <div className="mx-4 border-l border-base-300">
                    {terminals.map((terminal) => (
                      <TerminalStopRow
                        dataDir={dataDir}
                        key={terminal.id}
                        onSelect={onSelectStop}
                        routesById={routesById}
                        stop={terminal}
                        stopsById={stopsById}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {filteredStopGroups.hasMore && (
        <p className="px-4 py-2 text-xs text-base-content/50 text-center">
          {t('search.listFirst20Hint')}
        </p>
      )}
    </>
  );
}
