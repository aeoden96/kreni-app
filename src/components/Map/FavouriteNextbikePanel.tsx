import { X } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { BajsStation } from '../../hooks/useNextbikeData';

import { useSettingsStore } from '../../stores/settingsStore';

interface FavouriteNextbikePanelProps {
  show: boolean;
  stations: BajsStation[];
}

export function FavouriteNextbikePanel({ show, stations }: FavouriteNextbikePanelProps) {
  const { t } = useTranslation();
  const favouriteUids = useSettingsStore((s) => s.favouriteNextbikeStationUids);
  const toggleFavouriteNextbikeStation = useSettingsStore((s) => s.toggleFavouriteNextbikeStation);

  const byUid = useMemo(() => {
    const m = new Map<number, BajsStation>();
    for (const s of stations) {
      m.set(s.uid, s);
    }
    return m;
  }, [stations]);

  if (!show || favouriteUids.length === 0) return null;

  const headingId = 'fav-nextbike-heading';

  return (
    <section
      aria-labelledby={headingId}
      className="pointer-events-auto w-full min-w-0 rounded-xl border border-base-200 bg-base-100/95 px-2.5 py-2 shadow-lg backdrop-blur-sm"
    >
      <h2
        className="mb-1 truncate px-0.5 text-xs font-semibold uppercase tracking-wide text-base-content/70"
        id={headingId}
      >
        {t('cyclingMode.favouriteNextbikeTitle')}
      </h2>
      <ul className="max-h-28 space-y-1 overflow-y-auto overscroll-contain pr-0.5">
        {favouriteUids.map((uid) => {
          const st = byUid.get(uid);
          const count = st?.bikes_available_to_rent;
          return (
            <li
              className="flex items-center gap-1 rounded-lg bg-base-200/50 py-1 pl-1.5 pr-1 text-xs leading-tight"
              key={uid}
            >
              <span className="min-w-0 flex-1 truncate font-medium text-base-content">
                {st?.name ?? t('cyclingMode.favouriteNextbikeUnknown')}
              </span>
              <span className="shrink-0 font-bold tabular-nums text-info">
                {count !== undefined
                  ? t('cyclingMode.favouriteNextbikeRentableBikes', { count })
                  : '—'}
              </span>
              <button
                aria-label={t('search.favouriteRemove')}
                className="btn btn-ghost btn-circle btn-xs !min-h-0 h-5 w-5 min-w-0 shrink-0 p-0 text-base-content/50 hover:text-error"
                onClick={() => toggleFavouriteNextbikeStation(uid)}
                title={t('search.favouriteRemove')}
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
