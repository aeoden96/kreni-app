import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
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
            className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.5rem,calc(7.25rem+env(safe-area-inset-right)))] z-[1900] w-auto max-w-none rounded-lg border border-base-300 bg-base-100/95 py-1.5 pl-1.5 pr-1 shadow-md backdrop-blur-sm sm:right-[max(1rem,calc(9.25rem+env(safe-area-inset-right)))]"
        >
            <h2 id={headingId} className="mb-1 truncate px-0.5 text-[10px] font-semibold leading-tight text-base-content/90">
                {t('cyclingMode.favouriteNextbikeTitle')}
            </h2>
            <ul className="max-h-28 space-y-0.5 overflow-y-auto overscroll-contain pr-0.5">
                {favouriteUids.map((uid) => {
                    const st = byUid.get(uid);
                    const count = st?.bikes_available_to_rent;
                    return (
                        <li
                            key={uid}
                            className="flex items-center gap-1 rounded bg-base-200/50 py-0.5 pl-1 pr-0.5 text-[10px] leading-tight"
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
                                type="button"
                                className="btn btn-ghost btn-circle btn-xs !min-h-0 h-5 w-5 min-w-0 shrink-0 p-0 text-base-content/50 hover:text-error"
                                title={t('search.favouriteRemove')}
                                aria-label={t('search.favouriteRemove')}
                                onClick={() => toggleFavouriteNextbikeStation(uid)}
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
