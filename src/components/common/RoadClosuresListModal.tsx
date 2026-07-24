/**
 * Road closures: badge trigger + full-screen list (driving view).
 * Shares the list body, refresh footer and modal shell with the transit
 * Disruptions panel via components/common/disruptions/*.
 */

import { Construction, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { RoadClosure } from '../../hooks/useRoadClosures';

import { BadgeWithPanel } from './BadgeWithPanel';
import { FullScreenModalCard } from './disruptions/FullScreenModalCard';
import { RoadClosuresList, RoadClosuresRefreshFooter } from './disruptions/RoadClosuresList';

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

  if (closures.length === 0) return null;

  const panelContent = (onClose: () => void) => (
    <FullScreenModalCard ariaLabelledBy="road-closures-modal-title" onClose={onClose}>
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

      <RoadClosuresList closures={closures} />

      <RoadClosuresRefreshFooter
        onRefresh={onRefresh}
        refreshCooldownSecondsLeft={refreshCooldownSecondsLeft}
        refreshedAtMs={refreshedAtMs}
        refreshing={refreshing}
        refreshLocked={refreshLocked}
      />
    </FullScreenModalCard>
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
