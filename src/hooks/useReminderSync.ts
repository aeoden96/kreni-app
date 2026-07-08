import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '../stores/settingsStore';
import { fetchInitialData } from '../utils/gtfs';
import {
  createReminderChannel,
  type ReminderContent,
  syncReminderNotifications,
} from '../utils/notifications';
import { isNative } from '../utils/platform';

/**
 * Keeps the OS-scheduled local notifications reconciled with the persisted
 * `reminders` store — on mount and whenever reminders change. Native-only; the
 * store is the source of truth, so this re-registers pending notifications after
 * a reboot/force-stop (Android clears alarms) and after any edit.
 *
 * Mount once from AppLayout. Stop/route names are resolved from the cached GTFS
 * data, fetched lazily only when there are reminders (no cost otherwise).
 */
export function useReminderSync(): void {
  const reminders = useSettingsStore((s) => s.reminders);
  const { t } = useTranslation();

  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;

    void (async () => {
      await createReminderChannel(t('reminders.channelName'), t('reminders.channelDescription'));

      if (reminders.length === 0) {
        await syncReminderNotifications([], () => ({ body: '', title: '' }));
        return;
      }

      const data = await fetchInitialData('data').catch(() => null);
      if (cancelled) return;

      const stopsById = new Map((data?.stops ?? []).map((s) => [s.id, s]));
      const routesById = new Map((data?.routes ?? []).map((r) => [r.id, r]));

      const resolve = (r: (typeof reminders)[number]): ReminderContent => {
        const stopName = stopsById.get(r.stopId)?.name ?? r.stopId;
        const route = r.routeId ? routesById.get(r.routeId) : null;
        return {
          body: t('reminders.notificationBody', { stop: stopName }),
          title: route ? `${route.shortName} · ${stopName}` : stopName,
        };
      };

      await syncReminderNotifications(reminders, resolve);
    })();

    return () => {
      cancelled = true;
    };
  }, [reminders, t]);
}
