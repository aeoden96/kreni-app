import { MapPin, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { BajsStation } from '../../hooks/useNextbikeData';
import type { MapFavouriteScope, MapPlaceFavourite } from '../../types/mapPlaceFavourite';

import { useNavigationStore } from '../../stores/navigationStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { enableMapFavouriteLayer } from '../../utils/mapFavouriteLayerToggles';
import { mapSavedPlaceLayerLabelKey } from './mapSavedPlacesLayerLabel';

type Props = {
  nextbikeStations?: BajsStation[];
  scope: MapFavouriteScope;
};

export function MapSavedPlacesTab({ nextbikeStations = [], scope }: Props) {
  const { t } = useTranslation();
  const list = useSettingsStore((s) =>
    scope === 'city'
      ? s.mapPlaceFavouritesCity
      : scope === 'cycling'
        ? s.mapPlaceFavouritesCycling
        : s.mapPlaceFavouritesDriving
  );
  const removeMapPlaceFavourite = useSettingsStore((s) => s.removeMapPlaceFavourite);
  const requestMapFlyTo = useNavigationStore((s) => s.requestMapFlyTo);

  const nextbikeByUid = useMemo(() => {
    const m = new Map<number, BajsStation>();
    for (const st of nextbikeStations) {
      m.set(st.uid, st);
    }
    return m;
  }, [nextbikeStations]);

  const grouped = useMemo(() => {
    const byLayer = new Map<string, MapPlaceFavourite[]>();
    for (const item of list) {
      const cur = byLayer.get(item.layerId) ?? [];
      cur.push(item);
      byLayer.set(item.layerId, cur);
    }
    return [...byLayer.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [list]);

  const isEmpty = list.length === 0;

  function onGo(item: MapPlaceFavourite) {
    enableMapFavouriteLayer(item.layerId);
    requestMapFlyTo({ lat: item.lat, lng: item.lng });
  }

  function layerHeadingClassName() {
    if (scope === 'city') {
      return 'text-[10px] font-extrabold tracking-[0.1em] uppercase pb-1.5 pt-1 dark:text-purple-400/80 text-purple-700/75';
    }
    if (scope === 'cycling') {
      return 'text-[10px] font-extrabold tracking-[0.1em] uppercase pb-1.5 pt-1 dark:text-emerald-400/85 text-emerald-800/85';
    }
    return 'text-[10px] font-extrabold tracking-[0.1em] uppercase pb-1.5 pt-1 dark:text-orange-400/80 text-orange-800/80';
  }

  return (
    <div className="city-layers-panel-body flex flex-col gap-3 px-4 pt-2 pb-4 max-h-[58dvh]">
      {isEmpty ? (
        <div className="py-6 px-2 text-center space-y-2">
          <p className="text-[13px] font-semibold dark:text-white/80 text-black/75">
            {t('mapSavedPlaces.empty')}
          </p>
          <p className="text-[11px] dark:text-white/50 text-black/55 leading-snug">
            {t('mapSavedPlaces.emptyHint')}
          </p>
        </div>
      ) : null}

      {list.length > 0
        ? grouped.map(([layerId, items]) => (
            <div key={layerId}>
              <div className={layerHeadingClassName()}>
                {t(mapSavedPlaceLayerLabelKey(scope, items[0].layerId))}
              </div>
              <div className="flex flex-col gap-1.5">
                {items.map((item) => (
                  <div
                    className="flex flex-col gap-1.5 rounded-xl px-3 py-2.5 dark:bg-white/[0.05] bg-black/[0.04] border border-black/[0.06] dark:border-white/[0.08]"
                    key={item.id}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold leading-snug break-words dark:text-white/90 text-black/85">
                          {item.title}
                        </div>
                        {scope === 'cycling' &&
                        item.layerId === 'nextbikeStations' &&
                        item.sourceId ? (
                          <div className="text-[11px] font-bold tabular-nums text-nextbike dark:text-nextbike-bright mt-0.5">
                            {(() => {
                              const uid = Number(item.sourceId);
                              const st = Number.isFinite(uid) ? nextbikeByUid.get(uid) : undefined;
                              const count = st?.bikes_available_to_rent;
                              return count !== undefined
                                ? t('cyclingMode.favouriteNextbikeRentableBikes', { count })
                                : '—';
                            })()}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          aria-label={t('mapSavedPlaces.go')}
                          className="p-2 rounded-lg dark:hover:bg-white/10 hover:bg-black/10 dark:text-lime-300 text-lime-700"
                          onClick={() => onGo(item)}
                          title={t('mapSavedPlaces.go')}
                          type="button"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                        <button
                          aria-label={t('mapSavedPlaces.remove')}
                          className="p-2 rounded-lg dark:hover:bg-white/10 hover:bg-black/10 dark:text-rose-400 text-rose-600"
                          onClick={() => removeMapPlaceFavourite(scope, item.id)}
                          title={t('mapSavedPlaces.remove')}
                          type="button"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        : null}
    </div>
  );
}
