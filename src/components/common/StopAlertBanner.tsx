/**
 * Compact warning banner listing the ZET service alerts that affect a stop.
 * Shared by StopInfoBar (compact) and StopModal (expanded). Renders nothing
 * when there are no alerts for the stop.
 */

import { AlertTriangle, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Route } from '../../utils/gtfs';
import type { ParsedServiceAlert } from '../../utils/realtime';

import { isNightRoute } from '../../utils/nightLines';
import { routeBadgeColor } from '../../utils/routeStyle';
import { serviceAlertEffectLabel } from '../../utils/serviceAlertEffectLabel';
import { NightMoon } from './NightMoon';

const DATE_FMT = new Intl.DateTimeFormat('hr-HR', { day: 'numeric', month: 'short' });

interface StopAlertBannerProps {
  alerts: ParsedServiceAlert[];
  className?: string;
  routesById: Map<string, Route>;
}

export function StopAlertBanner({ alerts, className, routesById }: StopAlertBannerProps) {
  const { t } = useTranslation();
  if (alerts.length === 0) return null;

  return (
    <div
      className={`p-2 rounded-lg bg-warning/10 border border-warning/30 space-y-2 ${className ?? ''}`}
    >
      {alerts.map((alert) => (
        <div className="flex gap-1.5 items-start" key={alert.id}>
          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold leading-snug text-base-content/90">
              {alert.header || serviceAlertEffectLabel(alert.effect, t)}
            </p>
            {alert.description && alert.description !== alert.header && (
              <p className="text-[11px] text-base-content/70 leading-relaxed line-clamp-3">
                {alert.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {alert.routeIds.map((rid) => {
                const route = routesById.get(rid);
                if (!route) return null;
                return (
                  <span
                    className="badge badge-xs font-bold text-white border-0"
                    key={rid}
                    style={{ backgroundColor: routeBadgeColor(route) }}
                  >
                    {route.shortName}
                    {isNightRoute(route) && <NightMoon className="w-2.5 h-2.5" />}
                  </span>
                );
              })}
              {alert.activeUntil && (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-base-content/60">
                  <Calendar className="w-3 h-3" />
                  {t('serviceAlerts.dateUntil', {
                    date: DATE_FMT.format(new Date(alert.activeUntil * 1000)),
                  })}
                </span>
              )}
              {alert.url && (
                <a
                  className="text-[11px] text-base-content/40 hover:text-primary underline underline-offset-2"
                  href={alert.url}
                  onClick={(e) => e.stopPropagation()}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  zet.hr ↗
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
