/**
 * Road closures: badge + full-screen list (same shell as ServiceAlerts).
 */

import { Construction, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { RoadClosure } from '../../hooks/useRoadClosures';

import i18n from '../../i18n';
import { formatRoadClosureInstant, roadClosureReasonLabel } from '../../utils/roadClosureDisplay';
import { BadgeWithPanel } from './BadgeWithPanel';

interface RoadClosuresListModalProps {
  closures: RoadClosure[];
}

export function RoadClosuresListModal({ closures }: RoadClosuresListModalProps) {
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

        <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-base-300">
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
                    {closure.direction === 'BOTH_DIRECTIONS'
                      ? t('roadClosures.bothDirections')
                      : closure.direction}
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

function sortClosures(list: RoadClosure[]): RoadClosure[] {
  return [...list].sort((a, b) => {
    const ta = a.endDate ? Date.parse(a.endDate) : Number.POSITIVE_INFINITY;
    const tb = b.endDate ? Date.parse(b.endDate) : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return a.streetName.localeCompare(b.streetName, undefined, { sensitivity: 'base' });
  });
}
