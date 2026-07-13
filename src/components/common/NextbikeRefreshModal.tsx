/**
 * Bajs / Nextbike: badge + full-screen technical panel (same shell as RoadClosuresListModal).
 */

import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';

import { Bike, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  NEXTBIKE_CACHE_TTL_MS,
  type NextbikeFetchDiffState,
  type NextbikeStationDiff,
} from '../../hooks/useNextbikeData';
import i18n from '../../i18n';
import { BadgeWithPanel } from './BadgeWithPanel';

interface NextbikeRefreshModalProps {
  children: ReactNode;
  diffOverflowCount: number;
  error: Error | null;
  fetchDiffState: NextbikeFetchDiffState;
  lastFetched: number;
  loading: boolean;
  manualCooldownUntil: number;
  onManualRefetch: () => Promise<'cooldown' | 'ok'>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  stationCount: number;
}

export function NextbikeRefreshModal({
  children,
  diffOverflowCount,
  error,
  fetchDiffState,
  lastFetched,
  loading,
  manualCooldownUntil,
  onManualRefetch,
  onOpenChange,
  open,
  stationCount,
}: NextbikeRefreshModalProps) {
  const { t } = useTranslation();
  const locale = i18n.language;
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const now = clock;
  const nextAutoMs = lastFetched > 0 ? Math.max(0, lastFetched + NEXTBIKE_CACHE_TTL_MS - now) : 0;
  const nextAutoSeconds = Math.ceil(nextAutoMs / 1000);

  const manualWaitMs = manualCooldownUntil > 0 ? Math.max(0, manualCooldownUntil - now) : 0;
  const manualCooldownSeconds = Math.ceil(manualWaitMs / 1000);
  const manualLocked = manualWaitMs > 0;

  const panelContent = (onClose: () => void) => (
    <div className="fixed inset-0 z-[3200] flex h-svh min-h-0 flex-col px-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
      <div
        aria-hidden
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'backdrop-fade-in 0.15s ease-out' }}
      />

      <div className="relative z-10 flex min-h-0 flex-1 justify-center">
        <div
          aria-labelledby="nextbike-data-modal-title"
          className="flex h-full min-h-0 w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-base-100 shadow-2xl"
          role="dialog"
          style={{ animation: 'modal-fade-in 0.2s ease-out' }}
        >
          <div className="flex shrink-0 items-center gap-3 border-b border-base-300 p-4">
            <Bike className="h-5 w-5 shrink-0 text-nextbike dark:text-nextbike-bright" />
            <h2 className="flex-1 text-lg font-bold" id="nextbike-data-modal-title">
              {t('cyclingMode.nextbikeDataModalTitle')}
            </h2>
            <button
              aria-label={t('cyclingMode.nextbikeDataModalCloseAria')}
              className="btn btn-circle btn-ghost btn-sm min-h-[44px] min-w-[44px]"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 text-sm">
            <dl className="space-y-3 text-base-content/90">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/55">
                  {t('cyclingMode.nextbikeDataModalLastFetch')}
                </dt>
                <dd className="mt-0.5 font-mono text-xs break-words">
                  {lastFetched > 0
                    ? new Date(lastFetched).toLocaleString(locale, {
                        dateStyle: 'medium',
                        timeStyle: 'medium',
                      })
                    : t('cyclingMode.nextbikeDataModalNever')}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/55">
                  {t('cyclingMode.nextbikeDataModalNextAuto')}
                </dt>
                <dd className="mt-0.5">
                  {lastFetched > 0
                    ? nextAutoSeconds > 0
                      ? t('cyclingMode.nextbikeDataModalNextAutoIn', { seconds: nextAutoSeconds })
                      : t('cyclingMode.nextbikeDataModalNextAutoSoon')
                    : t('cyclingMode.nextbikeDataModalNextAutoUnknown')}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/55">
                  {t('cyclingMode.nextbikeDataModalInterval')}
                </dt>
                <dd className="mt-0.5">
                  {t('cyclingMode.nextbikeDataModalIntervalValue', {
                    seconds: NEXTBIKE_CACHE_TTL_MS / 1000,
                  })}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/55">
                  {t('cyclingMode.nextbikeDataModalStationCount')}
                </dt>
                <dd className="mt-0.5 font-mono tabular-nums">{stationCount}</dd>
              </div>
            </dl>

            <section
              aria-label={t('cyclingMode.nextbikeDiffSectionTitle')}
              className="mt-5 border-t border-base-300 pt-4"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wide text-base-content/55">
                {t('cyclingMode.nextbikeDiffSectionTitle')}
              </h3>
              <p className="mt-1 text-xs text-base-content/60">
                {t('cyclingMode.nextbikeDiffSectionHint')}
              </p>

              {fetchDiffState.status === 'changes' ? (
                <>
                  <ul className="mt-3 space-y-2">
                    {fetchDiffState.items.map((d) => (
                      <StationDiffRow diff={d} key={d.uid} t={t} />
                    ))}
                  </ul>
                  {diffOverflowCount > 0 ? (
                    <p className="mt-2 text-center text-xs text-base-content/55">
                      {t('cyclingMode.nextbikeDiffMore', { count: diffOverflowCount })}
                    </p>
                  ) : null}
                </>
              ) : null}

              {fetchDiffState.status === 'unchanged' ? (
                <p className="mt-3 rounded-lg border border-base-200 bg-base-200/30 px-3 py-2.5 text-xs text-base-content/75">
                  {t('cyclingMode.nextbikeDiffUnchanged')}
                </p>
              ) : null}

              {fetchDiffState.status === 'none' ? (
                <p className="mt-3 rounded-lg border border-dashed border-nextbike/30 bg-nextbike/5 px-3 py-2.5 text-xs text-base-content/70">
                  {t('cyclingMode.nextbikeDiffWaiting')}
                </p>
              ) : null}
            </section>

            {error ? (
              <p className="mt-4 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-xs text-error">
                {error.message}
              </p>
            ) : null}
          </div>

          <footer className="shrink-0 border-t border-base-300/80 bg-base-200/40 px-4 py-3">
            <button
              aria-label={t('cyclingMode.nextbikeDataModalManualRefreshAria')}
              className="btn btn-block gap-2 border-0 bg-nextbike text-white hover:bg-nextbike/90 disabled:bg-nextbike/40"
              disabled={loading || manualLocked}
              onClick={() => void onManualRefetch()}
              title={
                manualLocked
                  ? t('cyclingMode.nextbikeDataModalManualRefreshCooldownTitle', {
                      seconds: manualCooldownSeconds,
                    })
                  : undefined
              }
              type="button"
            >
              <RefreshCw
                aria-hidden
                className={`h-4 w-4 shrink-0 ${loading ? 'animate-spin' : ''}`}
              />
              {manualLocked
                ? t('cyclingMode.nextbikeDataModalManualRefreshWait', {
                    seconds: manualCooldownSeconds,
                  })
                : loading
                  ? t('cyclingMode.nextbikeRefreshing')
                  : t('cyclingMode.nextbikeDataModalManualRefresh')}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );

  return (
    <BadgeWithPanel
      ariaLabel={t('cyclingMode.nextbikeBadgeAria')}
      badgeClassName="badge inline-flex items-center gap-1.5 border-0 bg-nextbike text-white shadow cursor-pointer transition-all hover:brightness-110"
      onOpenChange={onOpenChange}
      open={open}
      panelContent={panelContent}
      title={t('cyclingMode.nextbikeDataModalTitle')}
      variant="fullScreen"
    >
      {children}
    </BadgeWithPanel>
  );
}

function StationDiffRow({ diff, t }: { diff: NextbikeStationDiff; t: TFunction }) {
  const showDotBeforeRent = Boolean(diff.bikes && diff.rentable);
  const showDotBeforeRacks = Boolean((diff.bikes || diff.rentable) && diff.free_racks);

  return (
    <li className="rounded-lg border border-base-200 bg-base-200/40 px-3 py-2.5">
      <p className="text-xs font-semibold leading-snug text-base-content">{diff.name}</p>
      <div className="mt-1.5 flex flex-col gap-1.5 text-[11px] leading-snug sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2 sm:gap-y-1">
        {diff.bikes ? (
          <span className="inline-flex flex-wrap items-baseline gap-x-1">
            <TrendArrow from={diff.bikes.from} higherIsBetter to={diff.bikes.to} />
            <span className="text-base-content/60">{t('cyclingMode.nextbikeDiffBikesSuffix')}</span>
          </span>
        ) : null}

        {showDotBeforeRent ? (
          <span aria-hidden className="hidden text-base-content/35 sm:inline">
            ·
          </span>
        ) : null}

        {diff.rentable ? (
          <span className="inline-flex flex-wrap items-baseline gap-x-1">
            <span className="text-base-content/55">
              {t('cyclingMode.nextbikeDiffRentablePrefix')}
            </span>
            <TrendArrow from={diff.rentable.from} higherIsBetter to={diff.rentable.to} />
          </span>
        ) : null}

        {showDotBeforeRacks ? (
          <span aria-hidden className="hidden text-base-content/35 sm:inline">
            ·
          </span>
        ) : null}

        {diff.free_racks ? (
          <span className="inline-flex flex-wrap items-baseline gap-x-1">
            <span className="text-base-content/55">{t('cyclingMode.nextbikeDiffRacksPrefix')}</span>
            <TrendArrow from={diff.free_racks.from} higherIsBetter to={diff.free_racks.to} />
          </span>
        ) : null}
      </div>
    </li>
  );
}

function TrendArrow({
  from,
  higherIsBetter,
  to,
}: {
  from: number;
  higherIsBetter: boolean;
  to: number;
}) {
  return (
    <span className={`tabular-nums ${trendClass(from, to, higherIsBetter)}`}>
      {from} → {to}
    </span>
  );
}

function trendClass(from: number, to: number, higherIsBetter: boolean): string {
  if (to === from) return 'text-base-content/75';
  const up = to > from;
  const good = higherIsBetter === up;
  return good ? 'font-semibold text-success' : 'font-semibold text-error';
}
