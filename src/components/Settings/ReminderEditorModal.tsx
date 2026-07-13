import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { DepartureReminder } from '../../types/reminder';

import { useInitialData } from '../../hooks/useInitialData';
import { useStopRoutes } from '../../hooks/useStopRoutes';
import { useSettingsStore } from '../../stores/settingsStore';
import { ensureNotificationPermission } from '../../utils/notifications';

interface Props {
  /** Existing reminder to edit, or null to create a new one. */
  editing: DepartureReminder | null;
  onClose: () => void;
}

/** Weekdays in Mon-first display order, mapped to JS `Date.getDay()` numbers. */
const WEEKDAYS: { jsDay: number; key: string }[] = [
  { jsDay: 1, key: 'mon' },
  { jsDay: 2, key: 'tue' },
  { jsDay: 3, key: 'wed' },
  { jsDay: 4, key: 'thu' },
  { jsDay: 5, key: 'fri' },
  { jsDay: 6, key: 'sat' },
  { jsDay: 0, key: 'sun' },
];

const pad = (n: number) => n.toString().padStart(2, '0');

export function ReminderEditorModal({ editing, onClose }: Props) {
  const { t } = useTranslation();
  const { routesById, stopsById } = useInitialData();
  const favouriteStopIds = useSettingsStore((s) => s.favouriteStopIds);
  const addReminder = useSettingsStore((s) => s.addReminder);
  const updateReminder = useSettingsStore((s) => s.updateReminder);

  const [stopId, setStopId] = useState<string>(editing?.stopId ?? favouriteStopIds[0] ?? '');
  const [routeId, setRouteId] = useState<null | string>(editing?.routeId ?? null);
  const [hour, setHour] = useState(editing?.hour ?? 8);
  const [minute, setMinute] = useState(editing?.minute ?? 0);
  const [weekdays, setWeekdays] = useState<number[]>(editing?.weekdays ?? [1, 2, 3, 4, 5]);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const { routes } = useStopRoutes(stopId || null, routesById);

  const favouriteStops = useMemo(
    () =>
      favouriteStopIds
        .map((id) => stopsById.get(id))
        .filter((s): s is NonNullable<typeof s> => !!s),
    [favouriteStopIds, stopsById]
  );

  const hasFavourites = favouriteStopIds.length > 0;
  const canSave = !!stopId && weekdays.length > 0;

  const toggleDay = (jsDay: number) =>
    setWeekdays((prev) =>
      prev.includes(jsDay) ? prev.filter((d) => d !== jsDay) : [...prev, jsDay].sort()
    );

  const handleSave = async () => {
    if (!canSave) return;
    if (editing) {
      updateReminder(editing.id, { hour, minute, routeId, stopId, weekdays });
    } else {
      addReminder({ enabled: true, hour, minute, routeId, stopId, weekdays });
    }
    // Ask for the OS permission; the reminder is saved regardless so it works
    // once granted. useReminderSync schedules it after the store update.
    const granted = await ensureNotificationPermission();
    if (!granted) {
      setPermissionDenied(true);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[3200] flex flex-col bg-base-100 pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-base-300 px-4 py-3">
        <button
          aria-label={t('common.close')}
          className="btn btn-circle btn-ghost btn-sm"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold">
          {editing ? t('reminders.editTitle') : t('reminders.addTitle')}
        </h2>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {!hasFavourites ? (
          <p className="text-sm text-base-content/70">{t('reminders.noFavourites')}</p>
        ) : (
          <>
            {/* Stop */}
            <label className="block space-y-1">
              <span className="text-sm font-semibold">{t('reminders.stopLabel')}</span>
              <select
                className="select select-bordered w-full"
                onChange={(e) => {
                  setStopId(e.target.value);
                  setRouteId(null);
                }}
                value={stopId}
              >
                {favouriteStops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Route */}
            <label className="block space-y-1">
              <span className="text-sm font-semibold">{t('reminders.routeLabel')}</span>
              <select
                className="select select-bordered w-full"
                onChange={(e) => setRouteId(e.target.value || null)}
                value={routeId ?? ''}
              >
                <option value="">{t('reminders.anyRoute')}</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.shortName} · {r.longName}
                  </option>
                ))}
              </select>
            </label>

            {/* Time */}
            <label className="block space-y-1">
              <span className="text-sm font-semibold">{t('reminders.timeLabel')}</span>
              <input
                className="input input-bordered w-full"
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map(Number);
                  if (!Number.isNaN(h)) setHour(h);
                  if (!Number.isNaN(m)) setMinute(m);
                }}
                type="time"
                value={`${pad(hour)}:${pad(minute)}`}
              />
            </label>

            {/* Weekdays */}
            <div className="space-y-2">
              <span className="text-sm font-semibold">{t('reminders.daysLabel')}</span>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map(({ jsDay, key }) => {
                  const active = weekdays.includes(jsDay);
                  return (
                    <button
                      className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline'}`}
                      key={key}
                      onClick={() => toggleDay(jsDay)}
                      type="button"
                    >
                      {t(`reminders.weekday.${key}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            {permissionDenied && (
              <p className="text-sm text-error">{t('reminders.permissionDenied')}</p>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 border-t border-base-300 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button className="btn btn-ghost flex-1" onClick={onClose} type="button">
          {t('common.cancel')}
        </button>
        <button
          className="btn btn-primary flex-1"
          disabled={!canSave}
          onClick={() => void handleSave()}
          type="button"
        >
          {t('common.save')}
        </button>
      </div>
    </div>
  );
}
