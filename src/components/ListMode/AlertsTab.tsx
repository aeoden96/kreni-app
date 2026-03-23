/**
 * Alerts tab — full-page list of GTFS-RT service alerts.
 */

import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Route } from '../../utils/gtfs';
import type { ParsedServiceAlert } from '../../utils/realtime';

import { serviceAlertEffectLabel } from '../../utils/serviceAlertEffectLabel';

interface AlertsTabProps {
  alerts: ParsedServiceAlert[];
  onRouteClick: (routeId: string, routeType: number) => void;
  routesById: Map<string, Route>;
}

export function AlertsTab({ alerts, onRouteClick, routesById }: AlertsTabProps) {
  const { t } = useTranslation();
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <AlertTriangle className="w-12 h-12 text-base-content/20 mb-4" />
        <p className="text-lg font-semibold text-base-content/60">{t('alertsTab.emptyTitle')}</p>
        <p className="text-sm text-base-content/40 mt-1">{t('alertsTab.emptySubtitle')}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-base-200 pb-24">
      {alerts.map((alert) => (
        <div className="p-4" key={alert.id}>
          {/* Effect badge */}
          <div className="flex items-start gap-2 mb-2">
            <span className="badge badge-warning badge-sm shrink-0 mt-0.5">
              {serviceAlertEffectLabel(alert.effect, t)}
            </span>
          </div>

          {/* Header text */}
          {alert.header && <p className="font-semibold text-sm mb-1">{alert.header}</p>}

          {/* Description */}
          {alert.description && (
            <p className="text-xs text-base-content/70 mb-2 whitespace-pre-wrap">
              {alert.description}
            </p>
          )}

          {/* Affected routes */}
          {alert.routeIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {alert.routeIds.map((rid) => {
                const route = routesById.get(rid);
                if (!route) return null;
                return (
                  <button
                    className="badge badge-sm font-bold gap-1 hover:opacity-80 transition-opacity cursor-pointer text-white"
                    key={rid}
                    onClick={() => onRouteClick(rid, route.type)}
                    style={{ backgroundColor: route.type === 0 ? '#2563eb' : '#d97706' }}
                  >
                    {route.shortName}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
