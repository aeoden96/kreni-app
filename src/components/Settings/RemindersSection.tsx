import { Bell, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { DepartureReminder } from '../../types/reminder';

import { useInitialData } from '../../hooks/useInitialData';
import { useSettingsStore } from '../../stores/settingsStore';
import { ReminderEditorModal } from './ReminderEditorModal';

/** JS day (0 = Sun … 6 = Sat) → i18n short-label key, in Mon-first order. */
const DAY_KEYS: Record<number, string> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const pad = (n: number) => n.toString().padStart(2, '0');

/** Editor state: null = closed, 'new' = create, or the reminder being edited. */
type EditorState = 'new' | DepartureReminder | null;

export function RemindersSection() {
  const { t } = useTranslation();
  const { routesById, stopsById } = useInitialData();
  const reminders = useSettingsStore((s) => s.reminders);
  const toggleReminder = useSettingsStore((s) => s.toggleReminder);
  const removeReminder = useSettingsStore((s) => s.removeReminder);

  const [editor, setEditor] = useState<EditorState>(null);

  const daysSummary = (weekdays: number[]) =>
    DAY_ORDER.filter((d) => weekdays.includes(d))
      .map((d) => t(`reminders.weekday.${DAY_KEYS[d]}`))
      .join(', ');

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex items-center justify-between gap-2">
          <h2 className="card-title text-lg flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {t('reminders.title')}
          </h2>
          <button
            className="btn btn-primary btn-sm gap-1"
            onClick={() => setEditor('new')}
            type="button"
          >
            <Plus className="w-4 h-4" />
            {t('reminders.add')}
          </button>
        </div>

        <p className="text-sm text-base-content/60">{t('reminders.description')}</p>

        {reminders.length === 0 ? (
          <p className="text-sm text-base-content/50 py-2">{t('reminders.empty')}</p>
        ) : (
          <ul className="divide-y divide-base-200">
            {reminders.map((r) => {
              const stopName = stopsById.get(r.stopId)?.name ?? r.stopId;
              const route = r.routeId ? routesById.get(r.routeId) : null;
              return (
                <li className="flex items-center gap-3 py-3" key={r.id}>
                  <input
                    aria-label={t('reminders.toggleAria')}
                    checked={r.enabled}
                    className="toggle toggle-primary"
                    onChange={() => toggleReminder(r.id)}
                    type="checkbox"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {route ? `${route.shortName} · ` : ''}
                      {stopName}
                    </p>
                    <p className="text-xs text-base-content/60 truncate">
                      {pad(r.hour)}:{pad(r.minute)} · {daysSummary(r.weekdays)}
                    </p>
                  </div>
                  <button
                    aria-label={t('reminders.edit')}
                    className="btn btn-ghost btn-circle btn-sm"
                    onClick={() => setEditor(r)}
                    type="button"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    aria-label={t('reminders.delete')}
                    className="btn btn-ghost btn-circle btn-sm text-error"
                    onClick={() => removeReminder(r.id)}
                    type="button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editor !== null && (
        <ReminderEditorModal
          editing={editor === 'new' ? null : editor}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
