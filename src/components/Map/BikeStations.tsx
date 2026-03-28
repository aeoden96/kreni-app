import L from 'leaflet';
import { Star } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Marker, Popup } from 'react-leaflet';

import type { BajsStation } from '../../hooks/useNextbikeData';

import { useSettingsStore } from '../../stores/settingsStore';
import { NEXTBIKE_BRAND_HEX } from '../../utils/nextbikeAppLinks';
import { bajsZagrebBikeTypeI18nKey } from '../../utils/nextbikeBikeTypes';

interface BikeStationsProps {
  show: boolean;
  stations: BajsStation[];
}

function bikeTypeNumberClass(typeId: string): string {
  switch (typeId) {
    case '196':
      return 'text-nextbike dark:text-nextbike-bright';
    case '409':
      return 'text-secondary';
    default:
      return 'text-warning';
  }
}

function sortedBikeTypeEntries(bike_types: Record<string, number>): [string, number][] {
  return Object.entries(bike_types).sort(([a], [b]) => Number(a) - Number(b));
}

export const BikeStations = memo(function BikeStations({ show, stations }: BikeStationsProps) {
  const { t } = useTranslation();
  const favouriteUids = useSettingsStore((s) => s.favouriteNextbikeStationUids);
  const toggleFavouriteNextbikeStation = useSettingsStore((s) => s.toggleFavouriteNextbikeStation);

  if (!show || !stations.length) return null;

  return (
    <>
      {stations.map((station) => {
        const isAvailable = station.bikes > 0;
        const isFav = favouriteUids.includes(station.uid);
        const favRing = isFav ? 'box-shadow: 0 0 0 2px #fbbf24, 0 2px 6px rgba(0,0,0,0.25);' : '';
        const iconHtml = `
          <div class="flex items-center justify-center w-6 h-6 rounded-full shadow-md text-white font-bold text-[10px] transition-all"
               style="background-color: ${isAvailable ? NEXTBIKE_BRAND_HEX : '#94a3b8'}; border: 2px solid white; ${favRing}">
            ${station.bikes}
          </div>
        `;

        const icon = L.divIcon({
          className: 'bajs-station-icon',
          html: iconHtml,
          iconAnchor: [12, 12],
          iconSize: [24, 24],
        });

        return (
          <Marker
            icon={icon}
            key={station.uid}
            position={[station.lat, station.lng]}
            zIndexOffset={500}
          >
            <Popup>
              <div className="inline-flex max-w-[min(18rem,calc(100vw-4rem))] min-w-[10rem] flex-col gap-1 p-0.5">
                <div className="text-sm font-semibold leading-tight">{station.name}</div>
                {station.place_number != null ? (
                  <div className="text-[11px] text-base-content/50">
                    {t('cyclingMode.nextbikePopupStationNo', { number: station.place_number })}
                  </div>
                ) : null}
                {station.maintenance && (
                  <div className="text-xs italic text-warning">
                    {t('cyclingMode.nextbikePopupMaintenance')}
                  </div>
                )}
                {station.bike_types && Object.keys(station.bike_types).length > 0 ? (
                  <div className="mt-1.5 flex flex-col gap-1 text-xs">
                    {sortedBikeTypeEntries(station.bike_types).map(([typeId, count]) => {
                      const typeKey = bajsZagrebBikeTypeI18nKey(typeId);
                      return (
                        <div className="flex flex-wrap items-baseline gap-x-1.5" key={typeId}>
                          <span className={`font-bold tabular-nums ${bikeTypeNumberClass(typeId)}`}>
                            {count}
                          </span>
                          <span className="text-base-content/70">
                            {typeKey
                              ? t(typeKey)
                              : t('cyclingMode.nextbikeBikeTypeUnknown', { id: typeId })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                <div className="mt-1 flex items-center justify-end border-t border-base-300/50 pt-1.5">
                  <button
                    aria-label={isFav ? t('search.favouriteRemove') : t('search.favouriteAdd')}
                    aria-pressed={isFav}
                    className={`btn btn-circle btn-sm !h-8 !min-h-0 !w-8 shrink-0 border p-0 ${
                      isFav
                        ? 'border-amber-400/90 bg-amber-500/25 text-amber-600 hover:bg-amber-500/35 dark:text-amber-400'
                        : 'border-base-300 bg-base-200/50 text-base-content/45 hover:border-base-content/25 hover:bg-base-200 hover:text-base-content/70'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavouriteNextbikeStation(station.uid);
                    }}
                    title={isFav ? t('search.favouriteRemove') : t('search.favouriteAdd')}
                    type="button"
                  >
                    <Star className="h-4 w-4" fill={isFav ? '#f59e0b' : 'none'} />
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
});
