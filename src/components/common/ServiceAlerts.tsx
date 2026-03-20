/**
 * Service alerts banner + panel.
 * Shows a badge when active alerts exist; expands to a full-screen list panel on click.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeWithPanel } from './BadgeWithPanel';
import { serviceAlertEffectLabel } from '../../utils/serviceAlertEffectLabel';
import { AlertTriangle, X, ChevronRight, Bus, MapPin, Ban, Plus, Info, Calendar, ArrowRight } from 'lucide-react';
import type { ParsedServiceAlert } from '../../utils/realtime';
import type { Route } from '../../utils/gtfs';

// ── Per-effect visual config ───────────────────────────────────────────────
type EffectStyle = {
  border: string;       // left border colour class
  badge: string;        // DaisyUI badge variant
  icon: React.ReactNode;
};

function effectStyle(effect: string, isRelevant: boolean): EffectStyle {
  if (isRelevant) {
    return {
      border: 'border-l-error',
      badge: 'badge-error',
      icon: <AlertTriangle className="w-4 h-4 text-error" />,
    };
  }
  switch (effect) {
    case 'NO_SERVICE':
      return { border: 'border-l-error', badge: 'badge-error', icon: <Ban className="w-4 h-4 text-error" /> };
    case 'DETOUR':
    case 'MODIFIED_SERVICE':
    case 'REDUCED_SERVICE':
    case 'SIGNIFICANT_DELAYS':
      return { border: 'border-l-warning', badge: 'badge-warning', icon: <Bus className="w-4 h-4 text-warning" /> };
    case 'STOP_MOVED':
      return { border: 'border-l-info', badge: 'badge-info', icon: <MapPin className="w-4 h-4 text-info" /> };
    case 'ADDITIONAL_SERVICE':
      return { border: 'border-l-success', badge: 'badge-success', icon: <Plus className="w-4 h-4 text-success" /> };
    default:
      return { border: 'border-l-base-300', badge: 'badge-ghost', icon: <Info className="w-4 h-4 text-base-content/50" /> };
  }
}

// ── Date helpers ───────────────────────────────────────────────────────────
const DATE_FMT = new Intl.DateTimeFormat('hr-HR', { day: 'numeric', month: 'short' });

function fmtDate(posixSec: number): string {
  return DATE_FMT.format(new Date(posixSec * 1000));
}

interface DateRangeProps {
  since: number | null;
  until: number | null;
}

function DateRange({ since, until }: DateRangeProps) {
  if (!since && !until) return null;
  return (
    <div className="flex items-center gap-1 text-xs text-base-content/60 mt-2">
      <Calendar className="w-3 h-3 shrink-0" />
      {since && until ? (
        <>
          <span>{fmtDate(since)}</span>
          <ArrowRight className="w-3 h-3" />
          <span>{fmtDate(until)}</span>
        </>
      ) : since ? (
        <span>od {fmtDate(since)}</span>
      ) : (
        <span>do {fmtDate(until!)}</span>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
interface ServiceAlertsProps {
  alerts: ParsedServiceAlert[];
  routesById: Map<string, Route>;
  selectedRouteId?: string | null;
  onRouteClick?: (routeId: string, routeType: number) => void;
}

export function ServiceAlerts({ alerts, routesById, selectedRouteId, onRouteClick }: ServiceAlertsProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (alerts.length === 0) return null;

  // Relevant alerts first when a route is selected
  const sorted = selectedRouteId
    ? [
      ...alerts.filter((a) => a.routeIds.includes(selectedRouteId!)),
      ...alerts.filter((a) => !a.routeIds.includes(selectedRouteId!)),
    ]
    : alerts;

  const hasRelevant = selectedRouteId && alerts.some((a) => a.routeIds.includes(selectedRouteId));

  const panelContent = (onClose: () => void) => (
    <div className="fixed inset-0 z-[3200] flex items-start justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        style={{ animation: 'backdrop-fade-in 0.15s ease-out' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-2 mt-2 sm:mt-8 max-h-[90dvh] bg-base-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'modal-fade-in 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-base-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <h2 className="text-lg font-bold flex-1">Prometne obavijesti</h2>
          <span className="badge badge-warning badge-sm">{alerts.length}</span>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm min-h-[44px] min-w-[44px]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-base-300">
          {sorted.map((alert) => {
            const isRelevant = !!(selectedRouteId && alert.routeIds.includes(selectedRouteId));
            const style = effectStyle(alert.effect, isRelevant);

            return (
              <div
                key={alert.id}
                className={`p-4 border-l-4 ${style.border} ${isRelevant ? 'bg-error/5' : 'hover:bg-base-200/50'} transition-colors`}
              >
                {/* Top row: icon + effect badge + ZET link */}
                <div className="flex items-center gap-2 mb-2">
                  {style.icon}
                  <span className={`badge badge-sm ${style.badge}`}>
                    {serviceAlertEffectLabel(alert.effect, t)}
                  </span>
                  {alert.url && (
                    <a
                      href={alert.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-xs text-base-content/40 hover:text-primary underline underline-offset-2 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      zet.hr ↗
                    </a>
                  )}
                </div>

                {/* Title */}
                {alert.header && (
                  <p className="font-semibold text-sm mb-1 leading-snug">{alert.header}</p>
                )}

                {/* Description */}
                {alert.description && (
                  <p className="text-xs text-base-content/65 mb-1 leading-relaxed">
                    {alert.description}
                  </p>
                )}

                {/* Date range */}
                <DateRange since={alert.activeSince} until={alert.activeUntil} />

                {/* Affected route badges */}
                {alert.routeIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {alert.routeIds.map((rid) => {
                      const route = routesById.get(rid);
                      if (!route) return null;
                      return (
                        <button
                          key={rid}
                          onClick={() => {
                            onRouteClick?.(rid, route.type);
                            onClose();
                          }}
                          className="badge badge-sm font-bold gap-1 hover:opacity-80 transition-opacity cursor-pointer text-white"
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
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <BadgeWithPanel
      variant="fullScreen"
      open={open}
      onOpenChange={setOpen}
      badgeClassName={`badge gap-1.5 shadow cursor-pointer transition-all ${hasRelevant ? 'badge-error hover:badge-outline' : 'badge-warning hover:badge-outline'}`}
      title="Obavijesti o prometu"
      panelContent={panelContent}
    >
      <AlertTriangle className="w-3 h-3" />
      {alerts.length} {alerts.length === 1 ? 'obavijest' : 'obavijesti'}
    </BadgeWithPanel>
  );
}
