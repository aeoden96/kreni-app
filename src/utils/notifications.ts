import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';

import type { DepartureReminder } from '../types/reminder';

import { isNative } from './platform';

/**
 * On-device recurring departure reminders via @capacitor/local-notifications.
 * All calls no-op on web/PWA (guarded by isNative()). The store is the source of
 * truth; {@link syncReminderNotifications} reconciles the OS schedule with it.
 */

const CHANNEL_ID = 'reminders';

/** Own channel + reserved id so arrival alerts never collide with reminders. */
const ARRIVAL_CHANNEL_ID = 'arrival-alerts';
const ARRIVAL_ALERT_ID = 1_000_000; // far outside the reminder id space (slot*10+weekday)

export interface ReminderContent {
  body: string;
  title: string;
}

type ResolveContent = (reminder: DepartureReminder) => ReminderContent;

/** Create the arrival-alert channel once (Android 8+). Safe to call repeatedly. */
export async function createArrivalAlertChannel(name: string, description: string): Promise<void> {
  if (!isNative()) return;
  await LocalNotifications.createChannel({
    description,
    id: ARRIVAL_CHANNEL_ID,
    importance: 5, // MAX — heads-up, urgent "get off here"
    name,
    visibility: 1, // public
  });
}

/** Create the reminders channel once (Android 8+). Safe to call repeatedly. */
export async function createReminderChannel(name: string, description: string): Promise<void> {
  if (!isNative()) return;
  await LocalNotifications.createChannel({
    description,
    id: CHANNEL_ID,
    importance: 4, // HIGH — heads-up
    name,
    visibility: 1, // public
  });
}

/** Request POST_NOTIFICATIONS (Android 13+). Returns whether it's granted. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false;
  const status = await LocalNotifications.checkPermissions();
  if (status.display === 'granted') return true;
  const requested = await LocalNotifications.requestPermissions();
  return requested.display === 'granted';
}

/** Fire the "get off here" heads-up notification immediately (not scheduled). */
export async function fireArrivalNotification(content: ReminderContent): Promise<void> {
  if (!isNative()) return;
  await LocalNotifications.schedule({
    notifications: [
      {
        body: content.body,
        channelId: ARRIVAL_CHANNEL_ID,
        id: ARRIVAL_ALERT_ID,
        smallIcon: 'ic_launcher_monochrome', // white silhouette
        title: content.title,
      },
    ],
  });
}

/** JS weekday (0 = Sun … 6 = Sat) → Capacitor weekday (1 = Sun … 7 = Sat). */
const toCapacitorWeekday = (jsDay: number): number => jsDay + 1;

/**
 * Reconcile the OS notification schedule with the store: cancel everything we
 * previously scheduled (reminders are the only local notifications this app
 * uses), then reschedule one notification per weekday for each enabled reminder.
 */
export async function syncReminderNotifications(
  reminders: DepartureReminder[],
  resolve: ResolveContent
): Promise<void> {
  if (!isNative()) return;

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({
      notifications: pending.notifications.map((n) => ({ id: n.id })),
    });
  }

  const toSchedule = reminders
    .filter((r) => r.enabled && r.weekdays.length > 0)
    .flatMap((r) => schemasFor(r, resolve(r)));

  if (toSchedule.length > 0) {
    await LocalNotifications.schedule({ notifications: toSchedule });
  }
}

function schemasFor(
  reminder: DepartureReminder,
  content: ReminderContent
): LocalNotificationSchema[] {
  return reminder.weekdays.map((day) => {
    const weekday = toCapacitorWeekday(day);
    return {
      body: content.body,
      channelId: CHANNEL_ID,
      id: reminder.slot * 10 + weekday, // deterministic + cancelable
      // Inexact weekly repeat — avoids the restricted SCHEDULE_EXACT_ALARM permission.
      schedule: {
        allowWhileIdle: true,
        on: { hour: reminder.hour, minute: reminder.minute, weekday },
        repeats: true,
      },
      smallIcon: 'ic_launcher_monochrome', // white silhouette; a colored icon renders as a white square
      title: content.title,
    };
  });
}
