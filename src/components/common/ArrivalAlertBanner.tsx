import { Bell, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '../../stores/settingsStore';
import { isNative } from '../../utils/platform';

/**
 * Top banner shown while a "get off here" arrival alert is active, so the user
 * can cancel it from anywhere. Native-only (the alert is a native-only feature).
 */
export function ArrivalAlertBanner() {
  const { t } = useTranslation();
  const activeArrivalAlert = useSettingsStore((s) => s.activeArrivalAlert);
  const clearArrivalAlert = useSettingsStore((s) => s.clearArrivalAlert);

  if (!isNative() || !activeArrivalAlert) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[2020] flex justify-center px-4"
      role="status"
      style={{ top: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/20 bg-primary/95 px-4 py-2.5 text-sm font-medium text-primary-content shadow-2xl backdrop-blur-md">
        <Bell aria-hidden className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {t('arrivalAlerts.activeBanner', { stop: activeArrivalAlert.stopName })}
        </span>
        <button
          aria-label={t('common.cancel')}
          className="btn btn-circle btn-ghost btn-xs -mr-1"
          onClick={clearArrivalAlert}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
