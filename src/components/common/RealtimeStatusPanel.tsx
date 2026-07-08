import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { FeedStatistics } from '../../utils/realtime';

import { REALTIME_POLL_INTERVAL } from '../../config';
import { useRealtimeFreshness } from '../../hooks/useRealtimeFreshness';
import { BadgeWithPanel } from './BadgeWithPanel';
import { RealtimeFeedToggleIcon } from './RealtimeFeedToggleIcon';

export interface RealtimeStatusPanelHandle {
  closeLegends: () => void;
}

interface RealtimeStatusPanelProps {
  cacheAgeSeconds: null | number;
  cacheStatus: 'HIT' | 'MISS' | null;
  fetchLatencyMs: null | number;
  lastUpdate: null | number;
  /** Estimated wall-clock time (ms) when the next poll runs; null while a fetch is in flight or polling off */
  nextPollAtMs: null | number;
  /** True while fetchAll is running */
  realtimeLoading: boolean;
  realtimeStats: FeedStatistics | null;
  workerTimestamp: null | string;
}

const detailsPopoverClass =
  'absolute right-0 bottom-10 z-[1100] bg-base-100 rounded-xl shadow-xl border border-base-200 p-3 w-72 text-xs';

export const RealtimeStatusPanel = forwardRef<RealtimeStatusPanelHandle, RealtimeStatusPanelProps>(
  function RealtimeStatusPanel(props, ref) {
    const {
      cacheAgeSeconds,
      cacheStatus,
      fetchLatencyMs,
      lastUpdate,
      nextPollAtMs,
      realtimeLoading,
      realtimeStats,
      workerTimestamp,
    } = props;

    // Owned here (a leaf) rather than in the page shell: the two 1 s ticker
    // intervals inside this hook update state every second, and keeping that
    // churn local avoids re-rendering the map subtree once per second. This
    // panel only renders when the mode has realtime, so hasRealtime is true.
    const { feedAgeStr, timeAgoStr } = useRealtimeFreshness(true, lastUpdate, realtimeStats);

    const { t } = useTranslation();
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
        setRealtimeDetailsOpen(false);
      },
    }));

    const handleDetailsOpenChange = (open: boolean) => {
      setRealtimeDetailsOpen(open);
      if (open) {
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

    const realtimeBtnClass = [
      'btn btn-circle btn-sm btn-success shadow border-none min-h-8 min-w-8 relative transition-[box-shadow,transform,filter] duration-200',
      realtimeDetailsOpen
        ? 'btn-active ring-2 ring-success/80 ring-offset-2 ring-offset-base-100 scale-105'
        : 'hover:brightness-110 active:scale-95',
    ].join(' ');

    return (
      <div className="flex shrink-0 items-center gap-2">
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
