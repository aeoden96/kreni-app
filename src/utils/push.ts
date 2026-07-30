import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { LocalNotifications } from '@capacitor/local-notifications';

import { isNative } from './platform';

/**
 * Service-alert push notifications, subscribed by *topic* rather than by device
 * token.
 *
 * The sender (`src/push.ts` in the proxy Worker) publishes each newly parsed
 * service alert to one FCM topic and keeps no device registry at all — no token
 * store, no user ids, nothing to leak or migrate. The whole client side of that
 * design is the `subscribeToTopic` call below, so this module is deliberately
 * thin: a permission, a channel, and a topic.
 *
 * Everything is guarded by {@link isNative}. The web/PWA build ships the same
 * `dist/`, and the plugin lazily imports the Firebase JS SDK for its web
 * implementation — calling into it from a browser would load ~200 KB and then
 * fail for want of a Firebase config, so the browser must never reach it.
 *
 * Failures are reported, not thrown. A build without `google-services.json`
 * (which is every CI build today — the file arrives via a secret once the
 * Firebase project exists) has no initialised `FirebaseApp`, so these calls
 * reject. That has to read as "push is unavailable" in Settings rather than as
 * an unhandled rejection.
 */

/**
 * Must match `ANDROID_CHANNEL_ID` in the Worker's push payload. FCM drops a
 * notification whose `android_channel_id` does not exist on the device, so the
 * channel is created before the first subscribe rather than on first delivery.
 */
const CHANNEL_ID = 'service-alerts';

/** Must match the topic the Worker publishes alerts to. */
const TOPIC = 'service-alerts';

/** Registered once per process; `addListener` would otherwise stack duplicates. */
let foregroundListenerAttached = false;

type PushEnableResult =
  /** The user declined POST_NOTIFICATIONS (Android 13+). */
  | 'denied'
  /** Subscribed; the device will receive service-alert pushes. */
  | 'enabled'
  /** Plugin/Firebase unavailable — no `google-services.json`, or a web build. */
  | 'unavailable';

/**
 * Unsubscribe from the alerts topic. The OS permission is left alone on purpose
 * — departure reminders use it too, and only the user can revoke it anyway.
 */
export async function disableServiceAlertPush(): Promise<void> {
  if (!isNative()) return;
  try {
    await FirebaseMessaging.unsubscribeFromTopic({ topic: TOPIC });
  } catch {
    // Nothing actionable: either it was never subscribed or Firebase is absent.
    // The persisted toggle is the source of truth and a later launch retries.
  }
}

/**
 * Request notification permission, create the channel, and subscribe to the
 * alerts topic. Idempotent: FCM treats a repeat subscribe as a no-op, so this is
 * safe to call on every launch.
 */
export async function enableServiceAlertPush(
  channelName: string,
  channelDescription: string
): Promise<PushEnableResult> {
  if (!isNative()) return 'unavailable';

  try {
    const status = await FirebaseMessaging.checkPermissions();
    const display =
      status.receive === 'granted'
        ? 'granted'
        : (await FirebaseMessaging.requestPermissions()).receive;
    if (display !== 'granted') return 'denied';

    await FirebaseMessaging.createChannel({
      description: channelDescription,
      id: CHANNEL_ID,
      importance: 4, // HIGH — heads-up, matching the reminders channel
      name: channelName,
      visibility: 1, // public
    });

    await FirebaseMessaging.subscribeToTopic({ topic: TOPIC });
    return 'enabled';
  } catch {
    // Firebase is not configured in this build, or the plugin is missing.
    return 'unavailable';
  }
}

/**
 * Show pushes that arrive while the app is in the foreground.
 *
 * Android only auto-posts an FCM `notification` payload to the tray when the app
 * is backgrounded. In the foreground the SDK hands the message to the app
 * instead, so without this listener a delivered alert is silently dropped — the
 * message arrives, `notificationReceived` fires with nobody listening, and the
 * user sees nothing. Re-posting it as a local notification on the same channel
 * makes foreground and background behave identically.
 *
 * Idempotent, and safe to call before the topic subscription exists.
 */
export async function startForegroundPushDisplay(): Promise<void> {
  if (!isNative() || foregroundListenerAttached) return;
  foregroundListenerAttached = true;

  try {
    await FirebaseMessaging.addListener('notificationReceived', ({ notification }) => {
      const title = notification?.title;
      const body = notification?.body;
      // A data-only message has nothing to show; the Worker always sends both,
      // but a malformed or test payload must not post an empty notification.
      if (!title && !body) return;

      void LocalNotifications.schedule({
        notifications: [
          {
            body: body ?? '',
            channelId: CHANNEL_ID,
            // Distinct from the reminders id space (slot * 10 + weekday), and
            // rotating so a second alert does not overwrite the first.
            id: Date.now() % 100000,
            smallIcon: 'ic_launcher_monochrome',
            title: title ?? '',
          },
        ],
      });
    });
  } catch {
    // No Firebase in this build — same "push unavailable" story as elsewhere.
    foregroundListenerAttached = false;
  }
}
