/**
 * Road closures: badge + full-screen list (same shell as ServiceAlerts).
 */

import type { TFunction } from 'i18next';

import { Clock, Construction, RefreshCw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ROAD_CLOSURES_CACHE_DURATION_MS, type RoadClosure } from '../../hooks/useRoadClosures';
import i18n from '../../i18n';
import {
  formatRoadClosureInstant,
  roadClosureDirectionLabel,
  roadClosureReasonLabel,
} from '../../utils/roadClosureDisplay';
import { BadgeWithPanel } from './BadgeWithPanel';

interface RoadClosuresListModalProps {
  closures: RoadClosure[];
  onRefresh: () => void;
  refreshCooldownSecondsLeft: null | number;
  refreshedAtMs: null | number;
  refreshing: boolean;
  refreshLocked: boolean;
}

export function RoadClosuresListModal({
  closures,
  onRefresh,
  refreshCooldownSecondsLeft,
  refreshedAtMs,
  refreshing,
  refreshLocked,
}: RoadClosuresListModalProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const locale = i18n.language;

  const sorted = useMemo(() => sortClosures(closures), [closures]);

  if (closures.length === 0) return null;

  const panelContent = (onClose: () => void) => (
    <div className="fixed inset-0 z-[3200] flex items-start justify-center">
      <div
        aria-hidden
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'backdrop-fade-in 0.15s ease-out' }}
      />

      <div
        aria-labelledby="road-closures-modal-title"
        className="relative w-full max-w-lg mx-2 mt-2 sm:mt-8 max-h-[90dvh] bg-base-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        style={{ animation: 'modal-fade-in 0.2s ease-out' }}
      >
        <div className="p-4 border-b border-base-300 flex items-center gap-3">
          <Construction className="w-5 h-5 text-error shrink-0" />
          <h2 className="text-lg font-bold flex-1" id="road-closures-modal-title">
            {t('roadClosures.listTitle')}
          </h2>
          <span className="badge badge-error badge-sm">{closures.length}</span>
          <button
            aria-label={t('roadClosures.listCloseAria')}
            className="btn btn-ghost btn-circle btn-sm min-h-[44px] min-w-[44px]"
            onClick={onClose}
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-base-300">
          {sorted.map((closure) => {
            const from = formatRoadClosureInstant(closure.startDate, locale);
            const until = formatRoadClosureInstant(closure.endDate, locale);

            return (
              <div
                className="p-4 border-l-4 border-l-error hover:bg-base-200/50 transition-colors"
                key={closure.id}
              >
                <p className="font-semibold text-sm mb-2 leading-snug">{closure.streetName}</p>

                <div className="text-xs text-base-content/70 space-y-1">
                  <p>
                    <span className="font-medium text-base-content">
                      {t('roadClosures.reasonLabel')}
                    </span>{' '}
                    {roadClosureReasonLabel(closure.reason, t)}
                  </p>
                  <p>
                    <span className="font-medium text-base-content">
                      {t('roadClosures.directionLabel')}
                    </span>{' '}
                    {roadClosureDirectionLabel(closure.direction, t)}
                  </p>
                </div>

                {(from || until) && (
                  <div className="mt-3 space-y-1 text-xs text-base-content/70">
                    {from ? (
                      <p>
                        <span className="font-medium text-base-content">
                          {t('roadClosures.closedFrom')}
                        </span>{' '}
                        {from}
                      </p>
                    ) : null}
                    {until ? (
                      <p>
                        <span className="font-medium text-base-content">
                          {t('roadClosures.closedUntil')}
                        </span>{' '}
                        {until}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <RoadClosuresRefreshFooter
          onRefresh={onRefresh}
          refreshCooldownSecondsLeft={refreshCooldownSecondsLeft}
          refreshedAtMs={refreshedAtMs}
          refreshing={refreshing}
          refreshLocked={refreshLocked}
        />
      </div>
    </div>
  );

  return (
    <BadgeWithPanel
      ariaLabel={t('roadClosures.listBadgeAria')}
      badgeClassName="badge badge-error gap-1.5 shadow cursor-pointer hover:badge-outline transition-all"
      onOpenChange={setOpen}
      open={open}
      panelContent={panelContent}
      title={t('roadClosures.listBadgeTitle')}
      variant="fullScreen"
    >
      <Construction className="w-3 h-3" />
      {t('roadClosures.listCount', { count: closures.length })}
    </BadgeWithPanel>
  );
}

function roadClosuresNextCheckLabel(t: TFunction, refreshedAtMs: number): string {
  const nextAt = refreshedAtMs + ROAD_CLOSURES_CACHE_DURATION_MS;
  const remainingMs = nextAt - Date.now();
  const minutes = Math.ceil(remainingMs / 60_000);
  if (minutes < 1) {
    return t('roadClosures.listFooterNextLessThanMinute');
  }
  return t('roadClosures.listFooterNextMinutes', { count: minutes });
}

function RoadClosuresRefreshFooter({
  onRefresh,
  refreshCooldownSecondsLeft,
  refreshedAtMs,
  refreshing,
  refreshLocked,
}: {
  onRefresh: () => void;
  refreshCooldownSecondsLeft: null | number;
  refreshedAtMs: null | number;
  refreshing: boolean;
  refreshLocked: boolean;
}) {
  const { t } = useTranslation();
  const locale = i18n.language;
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="shrink-0 border-t border-base-300/80 bg-base-200/40 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex  gap-3  flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <Clock aria-hidden className="w-3.5 h-3.5 shrink-0 mt-0.5 text-base-content/45" />
          <div className="flex flex-col gap-1 text-xs text-base-content/65 leading-snug min-w-0 flex-1 text-left">
            {refreshedAtMs == null ? (
              <p>{t('roadClosures.listFooterApproximate')}</p>
            ) : (
              <>
                <p className="text-base-content/85 font-medium">
                  {t('roadClosures.listFooterUpdated', {
                    time: new Date(refreshedAtMs).toLocaleString(locale, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }),
                  })}
                </p>
                <p className="text-base-content/60">
                  {roadClosuresNextCheckLabel(t, refreshedAtMs)}
                </p>
              </>
            )}
          </div>
        </div>

        <button
          aria-label={t('roadClosures.listRefreshAria')}
          className="btn btn-ghost btn-sm gap-2 self-end sm:self-center shrink-0 min-h-[44px] min-w-[44px] px-3 sm:min-w-0 sm:px-3"
          disabled={refreshing || refreshLocked}
          onClick={onRefresh}
          title={
            !refreshing && refreshLocked && refreshCooldownSecondsLeft != null
              ? t('roadClosures.listRefreshCooldownTitle', {
                  seconds: refreshCooldownSecondsLeft,
                })
              : undefined
          }
          type="button"
        >
          <RefreshCw
            aria-hidden
            className={`w-4 h-4 shrink-0 ${refreshing ? 'animate-spin' : ''}`}
          />
          <span className="hidden sm:inline text-xs font-medium">
            {t('roadClosures.listRefreshLabel')}
          </span>
        </button>
      </div>
    </footer>
  );
}

function sortClosures(list: RoadClosure[]): RoadClosure[] {
  return [...list].sort((a, b) => {
    const ta = a.endDate ? Date.parse(a.endDate) : Number.POSITIVE_INFINITY;
    const tb = b.endDate ? Date.parse(b.endDate) : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return a.streetName.localeCompare(b.streetName, undefined, { sensitivity: 'base' });
  });
}
