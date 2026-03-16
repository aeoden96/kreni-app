import { forwardRef, useImperativeHandle, useState } from 'react';
import { BadgeWithPanel } from './BadgeWithPanel';
import { ServiceAlerts } from './ServiceAlerts';
import type { Route } from '../../utils/gtfs';
import type { ParsedServiceAlert } from '../../utils/realtime';
import type { FeedStatistics } from '../../utils/realtime';

export interface RealtimeStatusPanelProps {
  alerts: ParsedServiceAlert[];
  routesById: Map<string, Route>;
  selectedRouteId: string | null;
  onRouteClick: (routeId: string, routeType: number) => void;
  realtimeStats: FeedStatistics | null;
  timeAgoStr: string;
  feedAgeStr: string;
  workerTimestamp: string | null;
  fetchLatencyMs: number | null;
  lastUpdate: number | null;
  cacheStatus: string | null;
}

export interface RealtimeStatusPanelHandle {
  closeLegends: () => void;
}

const legendPopoverClass =
  'absolute bottom-16 right-0 bg-base-100 rounded-xl shadow-xl border border-base-200 p-3 w-52 text-xs space-y-2';

const detailsPopoverClass =
  'absolute right-0 bottom-8 z-[1100] bg-base-100 rounded-xl shadow-xl border border-base-200 p-3 w-72 text-xs';

function LegendPanelContent() {
  return (
    <>
      <p className="font-semibold text-base-content mb-1">Legenda</p>

      {/* Tram */}
      <div className="flex items-center gap-2">
        <div style={{ position: 'relative', width: 22, height: 22, flexShrink: 0 }}>
          <svg style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(0deg)', transformOrigin: '11px 11px' }} width="22" height="22" viewBox="0 0 22 22">
            <polygon points="11,1 8,6 14,6" fill="#2337ff" stroke="white" strokeWidth="1" strokeLinejoin="round" />
          </svg>
          <svg style={{ position: 'absolute', top: 0, left: 0 }} width="22" height="22" viewBox="0 0 22 22">
            <circle cx="11" cy="11" r="7" fill="#2337ff" fillOpacity="0.95" stroke="white" strokeWidth="2" />
            <text x="11" y="14" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white" fontFamily="system-ui,sans-serif">T1</text>
          </svg>
        </div>
        <span className="text-base-content/80">Tramvaj (GPS, smjer poznat)</span>
      </div>
      <div className="flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="7" fill="#2337ff" fillOpacity="0.85" stroke="white" strokeWidth="2" />
          <text x="10" y="13" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white" fontFamily="system-ui,sans-serif">T1</text>
        </svg>
        <span className="text-base-content/80">Tramvaj (u mirovanju)</span>
      </div>

      <div className="divider my-0.5" />

      {/* Bus */}
      <div className="flex items-center gap-2">
        <div style={{ position: 'relative', width: 22, height: 22, flexShrink: 0 }}>
          <svg style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(45deg)', transformOrigin: '11px 11px' }} width="22" height="22" viewBox="0 0 22 22">
            <polygon points="11,1 8,6 14,6" fill="#d97706" stroke="white" strokeWidth="1" strokeLinejoin="round" />
          </svg>
          <svg style={{ position: 'absolute', top: 0, left: 0 }} width="22" height="22" viewBox="0 0 22 22">
            <circle cx="11" cy="11" r="7" fill="#d97706" fillOpacity="0.95" stroke="white" strokeWidth="2" />
            <text x="11" y="14" textAnchor="middle" fontSize="6" fontWeight="bold" fill="white" fontFamily="system-ui,sans-serif">109</text>
          </svg>
        </div>
        <span className="text-base-content/80">Autobus (GPS, smjer poznat)</span>
      </div>
      <div className="flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="7" fill="#d97706" fillOpacity="0.85" stroke="white" strokeWidth="2" />
          <text x="10" y="13" textAnchor="middle" fontSize="6" fontWeight="bold" fill="white" fontFamily="system-ui,sans-serif">109</text>
        </svg>
        <span className="text-base-content/80">Autobus (u mirovanju)</span>
      </div>

      <div className="divider my-0.5" />

      {/* Stops */}
      <div className="flex items-center gap-2">
        <div style={{ position: 'relative', width: 18, height: 18, flexShrink: 0 }}>
          <svg style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(45deg)', transformOrigin: '9px 9px' }} width="18" height="18" viewBox="0 0 18 18">
            <polygon points="9,1 6,4 12,4" fill="#2563eb" stroke="white" strokeWidth="1" strokeLinejoin="round" />
          </svg>
          <svg style={{ position: 'absolute', top: 0, left: 0 }} width="18" height="18" viewBox="0 0 18 18">
            <circle cx="9" cy="9" r="5" fill="#2563eb" fillOpacity="0.9" stroke="white" strokeWidth="1.5" />
          </svg>
        </div>
        <span className="text-base-content/80">Tramvajska stanica</span>
      </div>
      <div className="flex items-center gap-2">
        <div style={{ position: 'relative', width: 18, height: 18, flexShrink: 0 }}>
          <svg style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(0deg)', transformOrigin: '9px 9px' }} width="18" height="18" viewBox="0 0 18 18">
            <polygon points="9,1 6,4 12,4" fill="#d97706" stroke="white" strokeWidth="1" strokeLinejoin="round" />
          </svg>
          <svg style={{ position: 'absolute', top: 0, left: 0 }} width="18" height="18" viewBox="0 0 18 18">
            <circle cx="9" cy="9" r="5" fill="#d97706" fillOpacity="0.9" stroke="white" strokeWidth="1.5" />
          </svg>
        </div>
        <span className="text-base-content/80">Autobusna stanica</span>
      </div>
      <div className="flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="5" fill="#475569" fillOpacity="0.9" stroke="white" strokeWidth="1.5" />
        </svg>
        <span className="text-base-content/80">Mješovita stanica</span>
      </div>
      <div className="flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="7" fill="#ff6b6b" fillOpacity="1" stroke="white" strokeWidth="2" />
        </svg>
        <span className="text-base-content/80">Odabrana stanica</span>
      </div>
    </>
  );
}

export const RealtimeStatusPanel = forwardRef<
  RealtimeStatusPanelHandle,
  RealtimeStatusPanelProps
>(function RealtimeStatusPanel(props, ref) {
  const {
    alerts,
    routesById,
    selectedRouteId,
    onRouteClick,
    realtimeStats,
    timeAgoStr,
    feedAgeStr,
    workerTimestamp,
    fetchLatencyMs,
    lastUpdate,
    cacheStatus,
  } = props;

  const [legendOpen, setLegendOpen] = useState(false);
  const [realtimeDetailsOpen, setRealtimeDetailsOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    closeLegends: () => {
      setLegendOpen(false);
      setRealtimeDetailsOpen(false);
    },
  }));

  const handleLegendOpenChange = (open: boolean) => {
    setLegendOpen(open);
    if (open) setRealtimeDetailsOpen(false);
  };

  const handleDetailsOpenChange = (open: boolean) => {
    setRealtimeDetailsOpen(open);
    if (open) setLegendOpen(false);
  };

  const detailsPanelContent = (
    <div className="text-[13px] text-base-content/80 space-y-2">
      <div>
        <div className="flex justify-between"><span className="font-medium">Vrijeme feeda ZET-a</span><span>{realtimeStats?.lastUpdate ? realtimeStats.lastUpdate.toLocaleString() : '—'}</span></div>
        <div className="text-[11px] text-base-content/60">Označava kada je feed posljednji put ažuriran od strane ZET-a.</div>
        {realtimeStats?.lastUpdate && (
          <div className="mt-1 text-[11px] text-base-content/60 flex justify-between">
            <span>Starost feeda</span>
            <span>{feedAgeStr || '—'}</span>
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between"><span className="font-medium">Vrijeme proxy servisa</span><span>{workerTimestamp ? (isNaN(Date.parse(workerTimestamp)) ? workerTimestamp : new Date(workerTimestamp).toLocaleString()) : '—'}</span></div>
        <div className="text-[11px] text-base-content/60">Pokazuje kada je proxy preuzeo feed.</div>
      </div>

      <div>
        <div className="flex justify-between"><span className="font-medium">Fetch latency</span><span>{fetchLatencyMs != null ? `${fetchLatencyMs} ms` : '—'}</span></div>
        <div className="text-[11px] text-base-content/60">Mjeri vrijeme prijenosa između klijenta i proxy servisa.</div>
      </div>

      <div>
        <div className="flex justify-between"><span className="font-medium">Vrijeme sinkronizacije (klijent)</span><span>{lastUpdate ? new Date(lastUpdate).toLocaleString() : '—'}</span></div>
        <div className="text-[11px] text-base-content/60">Vrijeme kada je ova aplikacija primila i obradila feed.</div>
        {realtimeStats && (
          <div className="mt-1 text-[11px] text-base-content/60">
            <div className="flex justify-between"><span>Entities</span><span>{realtimeStats.totalEntities}</span></div>
            <div className="flex justify-between"><span>Vehicle positions</span><span>{realtimeStats.vehiclePositions}</span></div>
            <div className="flex justify-between"><span>Trip updates</span><span>{realtimeStats.tripUpdates}</span></div>
            <div className="flex justify-between"><span>Service alerts</span><span>{realtimeStats.serviceAlerts}</span></div>
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between"><span className="font-medium">Status predmemorije</span><span>{cacheStatus ?? '—'}</span></div>
        <div className="text-[11px] text-base-content/60"><span className="font-semibold">HIT</span> = posluženo iz predmemorije, <span className="font-semibold">MISS</span> = dohvaćeno iz izvornog feeda.</div>
      </div>
    </div>
  );

  return (
    <div className="absolute bottom-6 right-4 z-[1000] flex flex-col items-end gap-2">
      <ServiceAlerts
        alerts={alerts}
        routesById={routesById}
        selectedRouteId={selectedRouteId}
        onRouteClick={onRouteClick}
      />

      <div className="flex items-end flex-col gap-2">
        <BadgeWithPanel
          variant="popover"
          open={legendOpen}
          onOpenChange={handleLegendOpenChange}
          badgeClassName="badge badge-primary gap-1 shadow cursor-pointer hover:badge-outline transition-all"
          ariaLabel="Legenda"
          panelContent={<LegendPanelContent />}
          popoverClassName={legendPopoverClass}
        >
          <span className="w-2 h-2 rounded-full bg-white" />
          Legenda
        </BadgeWithPanel>

        <BadgeWithPanel
          variant="popover"
          open={realtimeDetailsOpen}
          onOpenChange={handleDetailsOpenChange}
          badgeClassName="badge badge-success gap-1 shadow cursor-pointer hover:badge-outline transition-all"
          panelContent={
            <>
              <p className="font-semibold text-sm mb-2">Tehnički detalji</p>
              {detailsPanelContent}
            </>
          }
          popoverClassName={detailsPopoverClass}
        >
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          ZET podaci osvježeni prije {timeAgoStr || '...'}
        </BadgeWithPanel>
      </div>
    </div>
  );
});
