/**
 * Transit-view disruptions surface: the compound chip trigger plus the tabbed
 * modal (service alerts + road closures). Owns only UI state — all data is fed
 * in from GTFSMode so the road-closures query is fetched once.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';

import type { RoadClosure } from '../../../hooks/useRoadClosures';
import type { Route } from '../../../utils/gtfs';
import type { ParsedServiceAlert } from '../../../utils/realtime';

import { DisruptionsChip } from './DisruptionsChip';
import { DisruptionsModal, type DisruptionTab } from './DisruptionsModal';

interface DisruptionsPanelProps {
  alerts: ParsedServiceAlert[];
  closures: RoadClosure[];
  onRefresh: () => void;
  onRouteClick?: (routeId: string, routeType: number) => void;
  onStopHighlight?: (stopIds: string[]) => void;
  refreshCooldownSecondsLeft: null | number;
  refreshedAtMs: null | number;
  refreshing: boolean;
  refreshLocked: boolean;
  routesById: Map<string, Route>;
  selectedRouteId?: null | string;
}

export function DisruptionsPanel({
  alerts,
  closures,
  onRefresh,
  onRouteClick,
  onStopHighlight,
  refreshCooldownSecondsLeft,
  refreshedAtMs,
  refreshing,
  refreshLocked,
  routesById,
  selectedRouteId,
}: DisruptionsPanelProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DisruptionTab>('alerts');

  if (alerts.length === 0 && closures.length === 0) return null;

  const handleOpen = (tab: DisruptionTab) => {
    setActiveTab(tab);
    setOpen(true);
  };

  // A route is selected and at least one alert affects it → escalate the chip colour.
  const hasRelevantAlerts = !!(
    selectedRouteId && alerts.some((a) => a.routeIds.includes(selectedRouteId))
  );

  return (
    <>
      <DisruptionsChip
        alertsCount={alerts.length}
        closuresCount={closures.length}
        hasRelevantAlerts={hasRelevantAlerts}
        onOpen={handleOpen}
      />

      {open &&
        createPortal(
          <DisruptionsModal
            activeTab={activeTab}
            alerts={alerts}
            closures={closures}
            onClose={() => setOpen(false)}
            onRefresh={onRefresh}
            onRouteClick={onRouteClick}
            onStopHighlight={onStopHighlight}
            onTabChange={setActiveTab}
            refreshCooldownSecondsLeft={refreshCooldownSecondsLeft}
            refreshedAtMs={refreshedAtMs}
            refreshing={refreshing}
            refreshLocked={refreshLocked}
            routesById={routesById}
            selectedRouteId={selectedRouteId}
          />,
          document.body
        )}
    </>
  );
}
