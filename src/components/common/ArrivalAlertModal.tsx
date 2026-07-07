import { Bell, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Stop } from '../../utils/gtfs';

import { useSettingsStore } from '../../stores/settingsStore';
import { ensureNotificationPermission } from '../../utils/notifications';

interface Props {
  onClose: () => void;
  stop: Stop;
}

/** Selectable trigger radii, in metres. */
const RADII = [300, 500, 800];

/**
 * Compact sheet to start a "get off here" arrival alert for a stop: pick a
 * trigger radius, then Start. The chosen radius becomes the persisted default.
 */
export function ArrivalAlertModal({ onClose, stop }: Props) {
  const { t } = useTranslation();
  const defaultRadius = useSettingsStore((s) => s.arrivalAlertRadiusMeters);
  const setArrivalAlertRadius = useSettingsStore((s) => s.setArrivalAlertRadius);
  const startArrivalAlert = useSettingsStore((s) => s.startArrivalAlert);

  const [radius, setRadius] = useState(defaultRadius);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const handleStart = async () => {
    const granted = await ensureNotificationPermission();
    if (!granted) {
      setPermissionDenied(true);
      return;
    }
    setArrivalAlertRadius(radius);
    startArrivalAlert({
      lat: stop.lat,
      lon: stop.lon,
      radiusMeters: radius,
      stopId: stop.id,
      stopName: stop.name,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[3200] flex items-end justify-center bg-black/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-base-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modal-fade-in 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-base-300 px-4 py-3">
          <Bell className="h-5 w-5 shrink-0 text-primary" />
          <h2 className="flex-1 text-lg font-bold leading-tight">{t('arrivalAlerts.title')}</h2>
          <button
            aria-label={t('common.close')}
            className="btn btn-circle btn-ghost btn-sm"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-4">
          <p className="text-sm text-base-content/70">
            {t('arrivalAlerts.description', { stop: stop.name })}
          </p>

          <div className="space-y-2">
            <span className="text-sm font-semibold">{t('arrivalAlerts.radiusLabel')}</span>
            <div className="flex flex-wrap gap-2">
              {RADII.map((m) => (
                <button
                  className={`btn btn-sm ${radius === m ? 'btn-primary' : 'btn-outline'}`}
                  key={m}
                  onClick={() => setRadius(m)}
                  type="button"
                >
                  {t('common.metresShort', { metres: m })}
                </button>
              ))}
            </div>
          </div>

          {permissionDenied && (
            <p className="text-sm text-error">{t('arrivalAlerts.permissionDenied')}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-base-300 p-4">
          <button className="btn btn-ghost flex-1" onClick={onClose} type="button">
            {t('common.cancel')}
          </button>
          <button
            className="btn btn-primary flex-1"
            onClick={() => void handleStart()}
            type="button"
          >
            {t('arrivalAlerts.start')}
          </button>
        </div>
      </div>
    </div>
  );
}
