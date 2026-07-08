import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useNetworkStatus } from '../../hooks/useNetworkStatus';

/**
 * Fixed banner shown while the device is offline. Works on web (navigator.onLine)
 * and native (@capacitor/network) via {@link useNetworkStatus}. Sits just above
 * the bottom-anchored GlobalAnnouncement so the two don't overlap.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const { online } = useNetworkStatus();

  if (online) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[2020] flex justify-center px-4"
      role="status"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/20 bg-neutral/95 px-4 py-2.5 text-sm font-medium text-neutral-content shadow-2xl backdrop-blur-md">
        <WifiOff aria-hidden className="h-4 w-4 shrink-0" />
        <span>{t('offline.message')}</span>
      </div>
    </div>
  );
}
