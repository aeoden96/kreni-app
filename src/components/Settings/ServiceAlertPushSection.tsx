import { BellRing } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '../../stores/settingsStore';
import { disableServiceAlertPush, enableServiceAlertPush } from '../../utils/push';

/**
 * Opt-in toggle for service-alert pushes. Native-only — the caller gates on
 * `isNative()`.
 *
 * The store flag is set from the *result* of the subscribe rather than from the
 * checkbox, so the toggle can never sit in a state FCM does not actually hold:
 * a declined permission or a build without a Firebase config leaves it off and
 * shows why.
 */
export function ServiceAlertPushSection() {
  const { t } = useTranslation();
  const enabled = useSettingsStore((s) => s.serviceAlertPush);
  const setServiceAlertPush = useSettingsStore((s) => s.setServiceAlertPush);

  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<'denied' | 'unavailable' | null>(null);

  const onChange = (checked: boolean) => {
    setBusy(true);
    setProblem(null);

    void (async () => {
      try {
        if (!checked) {
          await disableServiceAlertPush();
          setServiceAlertPush(false);
          return;
        }

        const result = await enableServiceAlertPush(
          t('push.channelName'),
          t('push.channelDescription')
        );
        setServiceAlertPush(result === 'enabled');
        if (result !== 'enabled') setProblem(result);
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title text-lg flex items-center gap-2">
          <BellRing className="w-5 h-5" />
          {t('push.title')}
        </h2>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-base-content/70">{t('push.description')}</p>
            {problem && <p className="text-sm text-warning mt-1">{t(`push.${problem}`)}</p>}
          </div>
          <input
            checked={enabled}
            className="toggle toggle-primary mt-1"
            disabled={busy}
            onChange={(e) => onChange(e.target.checked)}
            type="checkbox"
          />
        </div>
      </div>
    </div>
  );
}
