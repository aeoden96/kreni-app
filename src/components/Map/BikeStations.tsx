import L from 'leaflet';
import { Star } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Marker, Popup } from 'react-leaflet';

import type { BajsStation } from '../../hooks/useNextbikeData';

import { useSettingsStore } from '../../stores/settingsStore';

interface BikeStationsProps {
  show: boolean;
  stations: BajsStation[];
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
               style="background-color: ${isAvailable ? '#0ea5e9' : '#94a3b8'}; border: 2px solid white; ${favRing}">
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
                {station.maintenance && (
                  <div className="text-xs italic text-warning">
                    {t('cyclingMode.nextbikePopupMaintenance')}
                  </div>
                )}
                <div className="mt-0.5 flex items-center justify-between gap-2 border-t border-base-300/50 pt-1.5">
                  <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-0.5 text-xs text-base-content/80">
                    <div>
                      <span className="font-bold text-info">{station.bikes_available_to_rent}</span>
                      <span className="ml-1">{t('cyclingMode.nextbikePopupRentableLabel')}</span>
                    </div>
                    <div>
                      <span className="font-bold text-success">{station.free_racks}</span>
                      <span className="ml-1">{t('cyclingMode.nextbikePopupRacksLabel')}</span>
                    </div>
                  </div>
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
                    <Star className="h-4 w-4" fill={isFav ? 'currentColor' : 'none'} />
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
