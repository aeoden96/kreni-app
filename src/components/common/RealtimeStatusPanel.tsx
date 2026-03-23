import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Route } from '../../utils/gtfs';
import type { ParsedServiceAlert } from '../../utils/realtime';
import type { FeedStatistics } from '../../utils/realtime';

import { REALTIME_POLL_INTERVAL } from '../../config';
import { BadgeWithPanel } from './BadgeWithPanel';
import { RealtimeFeedToggleIcon } from './RealtimeFeedToggleIcon';
import { RealtimeLegendToggleIcon } from './RealtimeLegendToggleIcon';
import { ServiceAlerts } from './ServiceAlerts';

export interface RealtimeStatusPanelHandle {
  closeLegends: () => void;
}

interface RealtimeStatusPanelProps {
  alerts: ParsedServiceAlert[];
  cacheAgeSeconds: null | number;
  cacheStatus: 'HIT' | 'MISS' | null;
  feedAgeStr: string;
  fetchLatencyMs: null | number;
  lastUpdate: null | number;
  /** Estimated wall-clock time (ms) when the next poll runs; null while a fetch is in flight or polling off */
  nextPollAtMs: null | number;
  onRouteClick: (routeId: string, routeType: number) => void;
  /** True while fetchAll is running */
  realtimeLoading: boolean;
  realtimeStats: FeedStatistics | null;
  routesById: Map<string, Route>;
  selectedRouteId: null | string;
  timeAgoStr: string;
  workerTimestamp: null | string;
}

const legendPopoverClass =
  'absolute bottom-10 right-0 bg-base-100 rounded-xl shadow-xl border border-base-200 p-3 w-52 text-xs space-y-2';

const detailsPopoverClass =
  'absolute right-0 bottom-10 z-[1100] bg-base-100 rounded-xl shadow-xl border border-base-200 p-3 w-72 text-xs';

function LegendPanelContent() {
  const { t } = useTranslation();
  return (
    <>
      <p className="font-semibold text-base-content mb-1">{t('realtimePanel.legendTitle')}</p>

      {/* Tram */}
      <div className="flex items-center gap-2">
        <div style={{ flexShrink: 0, height: 22, position: 'relative', width: 22 }}>
          <svg
            height="22"
            style={{
              left: 0,
              position: 'absolute',
              top: 0,
              transform: 'rotate(0deg)',
              transformOrigin: '11px 11px',
            }}
            viewBox="0 0 22 22"
            width="22"
          >
            <polygon
              fill="#2337ff"
              points="11,1 8,6 14,6"
              stroke="white"
              strokeLinejoin="round"
              strokeWidth="1"
            />
          </svg>
          <svg
            height="22"
            style={{ left: 0, position: 'absolute', top: 0 }}
            viewBox="0 0 22 22"
            width="22"
          >
            <circle
              cx="11"
              cy="11"
              fill="#2337ff"
              fillOpacity="0.95"
              r="7"
              stroke="white"
              strokeWidth="2"
            />
            <text
              fill="white"
              fontFamily="system-ui,sans-serif"
              fontSize="7"
              fontWeight="bold"
              textAnchor="middle"
              x="11"
              y="14"
            >
              T1
            </text>
          </svg>
        </div>
        <span className="text-base-content/80">{t('realtimePanel.legend.tramGpsKnown')}</span>
      </div>
      <div className="flex items-center gap-2">
        <svg height="20" viewBox="0 0 20 20" width="20">
          <circle
            cx="10"
            cy="10"
            fill="#2337ff"
            fillOpacity="0.85"
            r="7"
            stroke="white"
            strokeWidth="2"
          />
          <text
            fill="white"
            fontFamily="system-ui,sans-serif"
            fontSize="7"
            fontWeight="bold"
            textAnchor="middle"
            x="10"
            y="13"
          >
            T1
          </text>
        </svg>
        <span className="text-base-content/80">{t('realtimePanel.legend.tramStopped')}</span>
      </div>

      <div className="divider my-0.5" />

      {/* Bus */}
      <div className="flex items-center gap-2">
        <div style={{ flexShrink: 0, height: 22, position: 'relative', width: 22 }}>
          <svg
            height="22"
            style={{
              left: 0,
              position: 'absolute',
              top: 0,
              transform: 'rotate(45deg)',
              transformOrigin: '11px 11px',
            }}
            viewBox="0 0 22 22"
            width="22"
          >
            <polygon
              fill="#d97706"
              points="11,1 8,6 14,6"
              stroke="white"
              strokeLinejoin="round"
              strokeWidth="1"
            />
          </svg>
          <svg
            height="22"
            style={{ left: 0, position: 'absolute', top: 0 }}
            viewBox="0 0 22 22"
            width="22"
          >
            <circle
              cx="11"
              cy="11"
              fill="#d97706"
              fillOpacity="0.95"
              r="7"
              stroke="white"
              strokeWidth="2"
            />
            <text
              fill="white"
              fontFamily="system-ui,sans-serif"
              fontSize="6"
              fontWeight="bold"
              textAnchor="middle"
              x="11"
              y="14"
            >
              109
            </text>
          </svg>
        </div>
        <span className="text-base-content/80">{t('realtimePanel.legend.busGpsKnown')}</span>
      </div>
      <div className="flex items-center gap-2">
        <svg height="20" viewBox="0 0 20 20" width="20">
          <circle
            cx="10"
            cy="10"
            fill="#d97706"
            fillOpacity="0.85"
            r="7"
            stroke="white"
            strokeWidth="2"
          />
          <text
            fill="white"
            fontFamily="system-ui,sans-serif"
            fontSize="6"
            fontWeight="bold"
            textAnchor="middle"
            x="10"
            y="13"
          >
            109
          </text>
        </svg>
        <span className="text-base-content/80">{t('realtimePanel.legend.busStopped')}</span>
      </div>

      <div className="divider my-0.5" />

      {/* Stops */}
      <div className="flex items-center gap-2">
        <div style={{ flexShrink: 0, height: 18, position: 'relative', width: 18 }}>
          <svg
            height="18"
            style={{
              left: 0,
              position: 'absolute',
              top: 0,
              transform: 'rotate(45deg)',
              transformOrigin: '9px 9px',
            }}
            viewBox="0 0 18 18"
            width="18"
          >
            <polygon
              fill="#2563eb"
              points="9,1 6,4 12,4"
              stroke="white"
              strokeLinejoin="round"
              strokeWidth="1"
            />
          </svg>
          <svg
            height="18"
            style={{ left: 0, position: 'absolute', top: 0 }}
            viewBox="0 0 18 18"
            width="18"
          >
            <circle
              cx="9"
              cy="9"
              fill="#2563eb"
              fillOpacity="0.9"
              r="5"
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>
        </div>
        <span className="text-base-content/80">{t('realtimePanel.legend.stopTram')}</span>
      </div>
      <div className="flex items-center gap-2">
        <div style={{ flexShrink: 0, height: 18, position: 'relative', width: 18 }}>
          <svg
            height="18"
            style={{
              left: 0,
              position: 'absolute',
              top: 0,
              transform: 'rotate(0deg)',
              transformOrigin: '9px 9px',
            }}
            viewBox="0 0 18 18"
            width="18"
          >
            <polygon
              fill="#d97706"
              points="9,1 6,4 12,4"
              stroke="white"
              strokeLinejoin="round"
              strokeWidth="1"
            />
          </svg>
          <svg
            height="18"
            style={{ left: 0, position: 'absolute', top: 0 }}
            viewBox="0 0 18 18"
            width="18"
          >
            <circle
              cx="9"
              cy="9"
              fill="#d97706"
              fillOpacity="0.9"
              r="5"
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>
        </div>
        <span className="text-base-content/80">{t('realtimePanel.legend.stopBus')}</span>
      </div>
      <div className="flex items-center gap-2">
        <svg height="18" viewBox="0 0 18 18" width="18">
          <circle
            cx="9"
            cy="9"
            fill="#475569"
            fillOpacity="0.9"
            r="5"
            stroke="white"
            strokeWidth="1.5"
          />
        </svg>
        <span className="text-base-content/80">{t('realtimePanel.legend.stopMixed')}</span>
      </div>
      <div className="flex items-center gap-2">
        <svg height="18" viewBox="0 0 18 18" width="18">
          <circle
            cx="9"
            cy="9"
            fill="#ff6b6b"
            fillOpacity="1"
            r="7"
            stroke="white"
            strokeWidth="2"
          />
        </svg>
        <span className="text-base-content/80">{t('realtimePanel.legend.stopSelected')}</span>
      </div>
    </>
  );
}

export const RealtimeStatusPanel = forwardRef<RealtimeStatusPanelHandle, RealtimeStatusPanelProps>(
  function RealtimeStatusPanel(props, ref) {
    const {
      alerts,
      cacheAgeSeconds,
      cacheStatus,
      feedAgeStr,
      fetchLatencyMs,
      lastUpdate,
      nextPollAtMs,
      onRouteClick,
      realtimeLoading,
      realtimeStats,
      routesById,
      selectedRouteId,
      timeAgoStr,
      workerTimestamp,
    } = props;

    const { t } = useTranslation();
    const [legendOpen, setLegendOpen] = useState(false);
    const [realtimeDetailsOpen, setRealtimeDetailsOpen] = useState(false);
    const [nowTick, setNowTick] = useState(() => Date.now());

    useEffect(() => {
      if (!realtimeDetailsOpen || nextPollAtMs == null) return;
      // Sync immediately so the display is accurate the moment a new poll is
      // scheduled (not 1 s later when the interval first fires).
      setNowTick(Date.now());
      const id = window.setInterval(() => setNowTick(Date.now()), 1000);
      return () => clearInterval(id);
    }, [realtimeDetailsOpen, nextPollAtMs]);

    // Reset the clock immediately whenever the page becomes visible (handles
    // bfcache restore and tab switching where nowTick may be stale).
    useEffect(() => {
      const onVisible = () => {
        if (document.visibilityState === 'visible') setNowTick(Date.now());
      };
      document.addEventListener('visibilitychange', onVisible);
      return () => document.removeEventListener('visibilitychange', onVisible);
    }, []);

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
      if (open) {
        setLegendOpen(false);
        setNowTick(Date.now());
      }
    };

    const nextPingRemainMs = nextPollAtMs != null ? Math.max(0, nextPollAtMs - nowTick) : null;
    let nextPingLabel = '—';
    if (nextPollAtMs != null && nextPingRemainMs != null) {
      nextPingLabel = nextPingRemainMs < 1000 ? '<1 s' : `${Math.ceil(nextPingRemainMs / 1000)} s`;
    }
    const nextPingClock = nextPollAtMs != null ? new Date(nextPollAtMs).toLocaleTimeString() : null;

    // Preserve the last scheduled-ping snapshot so we can freeze it (dimmed)
    // while a fetch is in progress, instead of switching to a different string.
    const [lastNextPing, setLastNextPing] = useState<null | { clock: string; label: string }>(null);
    useEffect(() => {
      if (nextPollAtMs != null) {
        setLastNextPing({ clock: nextPingClock ?? '—', label: nextPingLabel });
      }
    }, [nextPingLabel, nextPingClock, nextPollAtMs]);

    const detailsPanelContent = useMemo(
      () => (
        <div className="text-[13px] text-base-content/80 space-y-2">
          <div>
            <div className="flex justify-between">
              <span className="font-medium">{t('realtimePanel.tech.zetFeedTime')}</span>
              <span>
                {realtimeStats?.lastUpdate ? realtimeStats.lastUpdate.toLocaleString() : '—'}
              </span>
            </div>
            <div className="text-[11px] text-base-content/60">
              {t('realtimePanel.tech.zetFeedTimeHint')}
            </div>
            {realtimeStats?.lastUpdate && (
              <div className="mt-1 text-[11px] text-base-content/60 flex justify-between">
                <span>{t('realtimePanel.tech.feedAge')}</span>
                <span>{feedAgeStr || '—'}</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between">
              <span className="font-medium">{t('realtimePanel.tech.proxyTime')}</span>
              <span>
                {workerTimestamp
                  ? isNaN(Date.parse(workerTimestamp))
                    ? workerTimestamp
                    : new Date(workerTimestamp).toLocaleString()
                  : '—'}
              </span>
            </div>
            <div className="text-[11px] text-base-content/60">
              {t('realtimePanel.tech.proxyTimeHint')}
            </div>
          </div>

          <div>
            <div className="flex justify-between">
              <span className="font-medium">{t('realtimePanel.tech.fetchLatency')}</span>
              <span>{fetchLatencyMs != null ? `${fetchLatencyMs} ms` : '—'}</span>
            </div>
            <div className="text-[11px] text-base-content/60">
              {t('realtimePanel.tech.fetchLatencyHint')}
            </div>
          </div>

          <div>
            <div className="flex justify-between">
              <span className="font-medium">{t('realtimePanel.tech.nextPing')}</span>
              <span className={nextPollAtMs == null && realtimeLoading ? 'opacity-40' : undefined}>
                {nextPollAtMs != null
                  ? t('realtimePanel.tech.nextPingScheduled', {
                      clock: nextPingClock ?? '—',
                      remain: nextPingLabel,
                    })
                  : lastNextPing != null
                    ? t('realtimePanel.tech.nextPingScheduled', {
                        clock: lastNextPing.clock,
                        remain: lastNextPing.label,
                      })
                    : '—'}
              </span>
            </div>
            <div className="text-[11px] text-base-content/60">
              {t('realtimePanel.tech.nextPingHint')}
            </div>
          </div>

          <div>
            <div className="flex justify-between">
              <span className="font-medium">{t('realtimePanel.tech.clientSync')}</span>
              <span>{lastUpdate ? new Date(lastUpdate).toLocaleString() : '—'}</span>
            </div>
            <div className="text-[11px] text-base-content/60">
              {t('realtimePanel.tech.clientSyncHint')}
            </div>
            {realtimeStats && (
              <div className="mt-1 text-[11px] text-base-content/60">
                <div className="flex justify-between">
                  <span>{t('realtimePanel.tech.entities')}</span>
                  <span>{realtimeStats.totalEntities}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('realtimePanel.tech.vehiclePositions')}</span>
                  <span>{realtimeStats.vehiclePositions}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('realtimePanel.tech.tripUpdates')}</span>
                  <span>{realtimeStats.tripUpdates}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('realtimePanel.tech.serviceAlerts')}</span>
                  <span>{realtimeStats.serviceAlerts}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between">
              <span className="font-medium">{t('realtimePanel.tech.cacheStatus')}</span>
              <span>{cacheStatus ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('realtimePanel.tech.cacheAge')}</span>
              <span>{cacheAgeSeconds != null ? `${cacheAgeSeconds} s` : '—'}</span>
            </div>
            <div className="text-[11px] text-base-content/60">
              {t('realtimePanel.tech.cacheLegend')}
            </div>
          </div>
        </div>
      ),
      [
        t,
        realtimeStats,
        feedAgeStr,
        workerTimestamp,
        fetchLatencyMs,
        nextPollAtMs,
        nextPingLabel,
        nextPingClock,
        realtimeLoading,
        lastUpdate,
        cacheStatus,
        cacheAgeSeconds,
        lastNextPing,
      ]
    );

    const pollSec = Math.round(REALTIME_POLL_INTERVAL / 1000);

    const legendBtnClass = [
      'btn btn-circle btn-sm btn-primary shadow border-none min-h-8 min-w-8 transition-[box-shadow,transform,filter] duration-200',
      legendOpen
        ? 'btn-active ring-2 ring-primary/70 ring-offset-2 ring-offset-base-100 scale-105'
        : 'hover:brightness-110 active:scale-95',
    ].join(' ');

    const realtimeBtnClass = [
      'btn btn-circle btn-sm btn-success shadow border-none min-h-8 min-w-8 relative transition-[box-shadow,transform,filter] duration-200',
      realtimeDetailsOpen
        ? 'btn-active ring-2 ring-success/80 ring-offset-2 ring-offset-base-100 scale-105'
        : 'hover:brightness-110 active:scale-95',
    ].join(' ');

    return (
      <div className="absolute bottom-6 right-4 z-[1000] flex items-center gap-2">
        <ServiceAlerts
          alerts={alerts}
          onRouteClick={onRouteClick}
          routesById={routesById}
          selectedRouteId={selectedRouteId}
        />

        <BadgeWithPanel
          ariaLabel={t('realtimePanel.showLegendAria')}
          badgeClassName={legendBtnClass}
          onOpenChange={handleLegendOpenChange}
          open={legendOpen}
          panelContent={<LegendPanelContent />}
          popoverClassName={legendPopoverClass}
          title={t('realtimePanel.legendTitle')}
          variant="popover"
        >
          <RealtimeLegendToggleIcon open={legendOpen} />
        </BadgeWithPanel>

        <BadgeWithPanel
          ariaLabel={t('realtimePanel.showDetailsAria')}
          badgeClassName={realtimeBtnClass}
          onOpenChange={handleDetailsOpenChange}
          open={realtimeDetailsOpen}
          panelContent={
            <>
              <p className="font-semibold text-sm mb-2">{t('realtimePanel.detailsHeading')}</p>
              {detailsPanelContent}
            </>
          }
          popoverClassName={detailsPopoverClass}
          title={t('realtimePanel.detailsTitle', {
            pollSec,
            timeAgo: timeAgoStr || '...',
          })}
          variant="popover"
        >
          <RealtimeFeedToggleIcon lastUpdate={lastUpdate} open={realtimeDetailsOpen} />
        </BadgeWithPanel>
      </div>
    );
  }
);
