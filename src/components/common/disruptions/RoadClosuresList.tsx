/**
 * Scrollable list body + refresh footer for road closures.
 * Extracted from RoadClosuresListModal so both the /driving modal and the
 * transit Disruptions panel share one rendering.
 */

import type { TFunction } from 'i18next';

import { Clock, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ROAD_CLOSURES_CACHE_DURATION_MS, type RoadClosure } from '../../../hooks/useRoadClosures';
import i18n from '../../../i18n';
import {
  formatRoadClosureInstant,
  roadClosureDirectionLabel,
  roadClosureReasonLabel,
} from '../../../utils/roadClosureDisplay';

interface RoadClosuresListProps {
  closures: RoadClosure[];
}

interface RoadClosuresRefreshFooterProps {
  onRefresh: () => void;
  refreshCooldownSecondsLeft: null | number;
  refreshedAtMs: null | number;
  refreshing: boolean;
  refreshLocked: boolean;
}

export function RoadClosuresList({ closures }: RoadClosuresListProps) {
  const { t } = useTranslation();
  const locale = i18n.language;
  const sorted = useMemo(() => sortClosures(closures), [closures]);

  return (
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
  );
}

export function RoadClosuresRefreshFooter({
  onRefresh,
  refreshCooldownSecondsLeft,
  refreshedAtMs,
  refreshing,
  refreshLocked,
}: RoadClosuresRefreshFooterProps) {
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

function roadClosuresNextCheckLabel(t: TFunction, refreshedAtMs: number): string {
  const nextAt = refreshedAtMs + ROAD_CLOSURES_CACHE_DURATION_MS;
  const remainingMs = nextAt - Date.now();
  const minutes = Math.ceil(remainingMs / 60_000);
  if (minutes < 1) {
    return t('roadClosures.listFooterNextLessThanMinute');
  }
  return t('roadClosures.listFooterNextMinutes', { count: minutes });
}

function sortClosures(list: RoadClosure[]): RoadClosure[] {
  return [...list].sort((a, b) => {
    const ta = a.endDate ? Date.parse(a.endDate) : Number.POSITIVE_INFINITY;
    const tb = b.endDate ? Date.parse(b.endDate) : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return a.streetName.localeCompare(b.streetName, undefined, { sensitivity: 'base' });
  });
}
