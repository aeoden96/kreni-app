import { Star } from 'lucide-react';
import { type MouseEvent, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { MapFavouriteLayerId } from '../../types/mapPlaceFavourite';

import { MAX_MAP_PLACE_FAVOURITES, useSettingsStore } from '../../stores/settingsStore';
import { makeMapPlaceFavouriteId, parseTitleForFavourite } from '../../utils/mapPlaceFavouriteKey';
import { useMapFavouriteScope } from './useMapFavouriteScope';

type Props = {
  lat: number;
  layerId: MapFavouriteLayerId;
  lng: number;
  sourceId?: string;
  title: unknown;
};

export function MapFavouriteStarButton({ lat, layerId, lng, sourceId, title }: Props) {
  const { t } = useTranslation();
  const scope = useMapFavouriteScope();
  const id = useMemo(
    () => makeMapPlaceFavouriteId(scope, layerId, lng, lat, sourceId),
    [scope, layerId, lng, lat, sourceId]
  );
  const isSaved = useSettingsStore((s) => {
    const list =
      scope === 'city'
        ? s.mapPlaceFavouritesCity
        : scope === 'cycling'
          ? s.mapPlaceFavouritesCycling
          : s.mapPlaceFavouritesDriving;
    return list.some((x) => x.id === id);
  });
  const toggleMapPlaceFavourite = useSettingsStore((s) => s.toggleMapPlaceFavourite);

  const onClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const result = toggleMapPlaceFavourite({
        lat,
        layerId,
        lng,
        scope,
        sourceId,
        title: parseTitleForFavourite(title),
      });
      if (result === 'at_cap') {
        window.alert(t('mapSavedPlaces.atCap', { max: MAX_MAP_PLACE_FAVOURITES }));
      }
    },
    [t, toggleMapPlaceFavourite, layerId, lat, lng, scope, sourceId, title]
  );

  return (
    <button
      aria-label={isSaved ? t('mapSavedPlaces.starRemove') : t('mapSavedPlaces.starSave')}
      className="map-favourite-star-btn flex items-center justify-center w-7 h-7 rounded-lg shrink-0 cursor-pointer transition-colors dark:bg-white/[0.08] dark:hover:bg-white/[0.14] dark:text-amber-300/90 bg-black/[0.06] hover:bg-black/10 text-amber-700/90"
      onClick={onClick}
      type="button"
    >
      <Star
        className={`w-4 h-4 ${isSaved ? 'fill-amber-400 text-amber-500 dark:fill-amber-300 dark:text-amber-200' : 'opacity-80'}`}
        strokeWidth={isSaved ? 0 : 2}
      />
    </button>
  );
}
