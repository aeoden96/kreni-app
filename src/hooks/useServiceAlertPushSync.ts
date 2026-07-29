import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '../stores/settingsStore';
import { isNative } from '../utils/platform';
import { disableServiceAlertPush, enableServiceAlertPush } from '../utils/push';

/**
 * Re-applies the persisted service-alert push preference to FCM on launch.
 *
 * The toggle in Settings already subscribes when the user flips it, so this is
 * purely self-healing: an FCM topic subscription is per-installation and is lost
 * on reinstall, on "clear app data", and whenever the registration token is
 * rotated — none of which the app observes. Re-subscribing on every launch is
 * idempotent and cheap, and it is the only thing that makes the persisted flag
 * true again in practice.
 *
 * The off branch runs too, for the mirror-image case: an unsubscribe attempted
 * while offline never reached FCM, so the device would keep receiving pushes the
 * user has already declined. Retrying it on launch closes that gap.
 *
 * Mount once from AppLayout. Native-only; a no-op in the browser.
 */
export function useServiceAlertPushSync(): void {
  const enabled = useSettingsStore((s) => s.serviceAlertPush);
  const setServiceAlertPush = useSettingsStore((s) => s.setServiceAlertPush);
  const { t } = useTranslation();

  useEffect(() => {
    if (!isNative()) return;

    void (async () => {
      if (!enabled) {
        await disableServiceAlertPush();
        return;
      }

      const result = await enableServiceAlertPush(
        t('push.channelName'),
        t('push.channelDescription')
      );
      // Permission revoked in OS settings since the toggle was flipped, or this
      // build has no Firebase config. Clear the flag so Settings stops claiming
      // pushes are on — silently, because this runs at launch with no UI focus.
      if (result !== 'enabled') setServiceAlertPush(false);
    })();
  }, [enabled, setServiceAlertPush, t]);
}
