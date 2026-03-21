import { useTranslation } from 'react-i18next';
import { Clock, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import type { Route, Stop } from '../../../utils/gtfs';
import { isRouteTypeTram, isRouteTypeRail } from '../../../utils/gtfs';
import type { RecentMergedItem } from '../../../utils/searchUtils';

interface RecentsBarProps {
  recentItemsMerged: RecentMergedItem[];
  recentsExpanded: boolean;
  setRecentsExpanded: (updater: (prev: boolean) => boolean) => void;
  onClearRecents: () => void;
  onSelectRoute: (route: Route) => void;
  onSelectStop: (stop: Stop) => void;
}

export function RecentsBar({
  recentItemsMerged,
  recentsExpanded,
  setRecentsExpanded,
  onClearRecents,
  onSelectRoute,
  onSelectStop,
}: RecentsBarProps) {
  const { t } = useTranslation();

  return (
    <div className="shrink-0 px-4 py-3 border-t border-base-300 bg-base-100">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setRecentsExpanded((e) => !e)}
          className="flex items-center gap-1 text-xs text-base-content/60 hover:text-base-content/80 transition-colors"
          aria-expanded={recentsExpanded}
        >
          <Clock className="w-3 h-3 shrink-0" />
          <span>{t('search.recentSection')}</span>
          {recentsExpanded ? (
            <ChevronDown className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0" />
          )}
        </button>
        <button
          onClick={onClearRecents}
          className="text-xs text-base-content/40 hover:text-base-content/70 transition-colors shrink-0"
        >
          {t('search.recentClear')}
        </button>
      </div>
      {recentsExpanded && (
        <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 -mx-1 px-1 mt-1.5">
          {recentItemsMerged.map((item) =>
            item.type === 'route' ? (
              <button
                key={`recent-r-${item.data.id}`}
                onClick={() => onSelectRoute(item.data)}
                className="badge badge-md font-bold hover:opacity-80 transition-opacity cursor-pointer text-white shrink-0"
                style={{
                  backgroundColor: isRouteTypeTram(item.data.type)
                    ? '#2563eb'
                    : isRouteTypeRail(item.data.type)
                      ? '#64748b'
                      : '#d97706',
                }}
              >
                {item.data.shortName}
              </button>
            ) : (
              <button
                key={`recent-s-${item.data.id}`}
                onClick={() => onSelectStop(item.data)}
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
  );
}
