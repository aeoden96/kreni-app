import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '../stores/settingsStore';
import { startArrivalWatch, stopArrivalWatch } from '../utils/arrivalAlerts';
import { hapticImpact } from '../utils/haptics';
import {
  createArrivalAlertChannel,
  ensureNotificationPermission,
  fireArrivalNotification,
} from '../utils/notifications';
import { isNative } from '../utils/platform';

/**
 * Reconciles the foreground-service GPS watch with the persisted
 * `activeArrivalAlert` — attaching a watcher when an alert is active and no
 * watcher is running (including after a force-stop/relaunch), and removing it
 * when the alert clears. When the user comes within range, fires the heads-up
 * notification + a haptic and clears the alert (one active alert at a time).
 *
 * Mount once from AppLayout. Native-only; no-ops on web.
 */
export function useArrivalAlertSync(): void {
  const activeArrivalAlert = useSettingsStore((s) => s.activeArrivalAlert);
  const clearArrivalAlert = useSettingsStore((s) => s.clearArrivalAlert);
  const { t } = useTranslation();

  // Id of the currently attached watcher (empty when none). A ref so the effect
  // can tear it down without re-running on every id change.
  const watcherIdRef = useRef('');

  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;

    void (async () => {
      await createArrivalAlertChannel(
        t('arrivalAlerts.channelName'),
        t('arrivalAlerts.channelDescription')
      );

      // Alert cleared → stop any running watch.
      if (!activeArrivalAlert) {
        if (watcherIdRef.current !== '') {
          const id = watcherIdRef.current;
          watcherIdRef.current = '';
          await stopArrivalWatch(id);
        }
        return;
      }

      // Alert active but already watching → nothing to do.
      if (watcherIdRef.current !== '') return;

      // Make sure the heads-up notification can be shown when we fire.
      await ensureNotificationPermission();
      if (cancelled) return;

      const id = await startArrivalWatch(
        activeArrivalAlert,
        {
          backgroundMessage: t('arrivalAlerts.trackingMessage', {
            stop: activeArrivalAlert.stopName,
          }),
          backgroundTitle: t('arrivalAlerts.trackingTitle'),
        },
        () => {
          void fireArrivalNotification({
            body: t('arrivalAlerts.notificationBody', { stop: activeArrivalAlert.stopName }),
            title: t('arrivalAlerts.notificationTitle'),
          });
          hapticImpact('heavy');
          clearArrivalAlert();
        }
      );
      if (cancelled) {
        // Effect re-ran/unmounted while attaching — don't leak the watcher.
        await stopArrivalWatch(id);
        return;
      }
      watcherIdRef.current = id;
    })();

    return () => {
      cancelled = true;
    };
  }, [activeArrivalAlert, clearArrivalAlert, t]);
}
