/**
 * Compound trigger chip: two independently-tappable segments (alerts | closures)
 * sharing one shell with a divider. Each segment opens the modal on its own tab.
 * An empty feed collapses its segment; when both are empty nothing renders.
 */

import { AlertTriangle, Construction } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { DisruptionTab } from './DisruptionsModal';

interface DisruptionsChipProps {
  alertsCount: number;
  closuresCount: number;
  /** A route is selected and at least one alert affects it → escalate alert colour. */
  hasRelevantAlerts: boolean;
  onOpen: (tab: DisruptionTab) => void;
}

export function DisruptionsChip({
  alertsCount,
  closuresCount,
  hasRelevantAlerts,
  onOpen,
}: DisruptionsChipProps) {
  const { t } = useTranslation();

  const showAlerts = alertsCount > 0;
  const showClosures = closuresCount > 0;
  if (!showAlerts && !showClosures) return null;

  return (
    <div className="badge gap-0 p-0 h-auto shadow overflow-hidden border-base-300/60">
      {showAlerts && (
        <button
          aria-label={t('disruptions.chipAlertsAria', { count: alertsCount })}
          className={`flex items-center gap-1.5 px-2.5 py-1 cursor-pointer transition-colors hover:bg-base-200 ${
            hasRelevantAlerts ? 'text-error' : 'text-warning'
          }`}
          onClick={() => onOpen('alerts')}
          type="button"
        >
          <AlertTriangle className="w-3 h-3" />
          {t('serviceAlerts.count', { count: alertsCount })}
        </button>
      )}

      {showAlerts && showClosures && <span aria-hidden className="w-px self-stretch bg-base-300" />}

      {showClosures && (
        <button
          aria-label={t('disruptions.chipClosuresAria', { count: closuresCount })}
          className="flex items-center gap-1.5 px-2.5 py-1 cursor-pointer transition-colors hover:bg-base-200 text-error"
          onClick={() => onOpen('closures')}
          type="button"
        >
          <Construction className="w-3 h-3 shrink-0" />
          {/* Bare count: the closure list runs to dozens of entries and the
              spelled-out label ("27 zatvorenih cesta") dominated the chip. The
              icon carries the meaning; the aria-label keeps it for screen readers. */}
          {closuresCount}
        </button>
      )}
    </div>
  );
}
