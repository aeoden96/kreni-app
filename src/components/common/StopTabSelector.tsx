/**
 * Tab selector for stop view: "Vozila" (live GPS) and "Red vožnje" (timetable).
 */

import { Bus, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type StopTab = 'timetable' | 'vehicles';

interface StopTabSelectorProps {
  activeTab: StopTab;
  /** Smaller variant for compact StopInfoBar */
  compact?: boolean;
  /** When true, the Vozila (vehicles) tab is not rendered. Useful for modes without realtime. */
  hideVehicles?: boolean;
  /** Number of live GPS vehicles — shown as a badge on the Vehicles tab */
  liveVehicleCount?: number;
  onTabChange: (tab: StopTab) => void;
}

export function StopTabSelector({
  activeTab,
  compact = false,
  hideVehicles = false,
  liveVehicleCount,
  onTabChange,
}: StopTabSelectorProps) {
  const { t } = useTranslation();
  const tabClass = compact
    ? 'tab text-[11px] px-2 py-0.5 rounded-full'
    : 'tab text-xs px-3 py-1 rounded-full';
  const activeClass = 'tab-active font-semibold';
  const iconSize = compact ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <div className="tabs tabs-box bg-base-200/70 rounded-full w-full p-0.5" role="tablist">
      {!hideVehicles && (
        <button
          className={`${tabClass} ${activeTab === 'vehicles' ? activeClass : ''} flex flex-1 items-center justify-center gap-1`}
          onClick={() => onTabChange('vehicles')}
          role="tab"
        >
          <Bus className={iconSize} />
          <span>{t('stopView.tabVehiclesNearby')}</span>
          {liveVehicleCount !== undefined && liveVehicleCount > 0 && (
            <span className={`badge badge-success badge-xs font-bold tabular-nums`}>
              {liveVehicleCount}
            </span>
          )}
        </button>
      )}
      <button
        className={`${tabClass} ${activeTab === 'timetable' ? activeClass : ''} flex flex-1 items-center justify-center gap-1`}
        onClick={() => onTabChange('timetable')}
        role="tab"
      >
        <Clock className={iconSize} />
        <span>{t('stopView.tabTimetable')}</span>
      </button>
    </div>
  );
}
