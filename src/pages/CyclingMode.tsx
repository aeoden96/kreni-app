import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OnboardingWizard } from '../components/common/OnboardingWizard';
import { BaseMap } from '../components/Map/BaseMap';
import { BikeParkings } from '../components/Map/BikeParkings';
import { BikePaths } from '../components/Map/BikePaths';
import { BikeStations } from '../components/Map/BikeStations';
import { FavouriteNextbikePanel } from '../components/Map/FavouriteNextbikePanel';
import { useGeolocation } from '../hooks/useGeolocation';
import { NEXTBIKE_CACHE_TTL_MS, useNextbikeData } from '../hooks/useNextbikeData';
import { useSettingsStore } from '../stores/settingsStore';

export function CyclingMode() {
  const { t } = useTranslation();
  const { userLocation } = useGeolocation();
  const [legendOpen, setLegendOpen] = useState(false);

  const showBikeStations = useSettingsStore((s) => s.showBikeStations);
  const showBikeParkings = useSettingsStore((s) => s.showBikeParkings);
  const showBikePaths = useSettingsStore((s) => s.showBikePaths);

  const { lastFetched, stations } = useNextbikeData(showBikeStations);

  const [nextbikeBadgeText, setNextbikeBadgeText] = useState('');

  useEffect(() => {
    if (!lastFetched) {
      setNextbikeBadgeText('');
      return;
    }

    const tick = () => {
      const msLeft = lastFetched + NEXTBIKE_CACHE_TTL_MS - Date.now();
      const seconds = Math.ceil(msLeft / 1000);
      if (seconds <= 0) {
        setNextbikeBadgeText(t('cyclingMode.nextbikeRefreshing'));
      } else {
        setNextbikeBadgeText(t('cyclingMode.nextbikeRefreshIn', { seconds }));
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lastFetched, t]);

  return (
    <div className="h-full w-full relative">
      <FavouriteNextbikePanel show={showBikeStations} stations={stations} />
      <BaseMap userLocation={userLocation}>
        <BikeStations show={showBikeStations} stations={stations} />
        <BikeParkings show={showBikeParkings} />
        <BikePaths show={showBikePaths} />
      </BaseMap>

      {/* Map Controls */}
      <OnboardingWizard variant="cycling" />
      <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[1000] flex flex-col items-end gap-2">
        {showBikePaths && legendOpen && (
          <div className="bg-base-100 rounded-xl shadow-xl border border-base-200 p-3 w-64 text-xs space-y-2 mb-2">
            <p className="font-semibold text-base-content mb-1">Legenda Biciklističkih Staza</p>

            <div className="flex items-center gap-2">
              <div className="w-5 h-1 bg-[#eab308]" />
              <span className="text-base-content/80">Pješačko-biciklistička staza</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-1 bg-[#84cc16] border-b-2 border-dashed border-base-100" />
              <span className="text-base-content/80">Nasip (Makadam)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-1 bg-[#22d3ee]" />
              <span className="text-base-content/80">Biciklistička traka</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-1 bg-[#a855f7]" />
              <span className="text-base-content/80">Cesta mješovitog prometa</span>
            </div>
          </div>
        )}

        {showBikePaths && (
          <button
            className="badge badge-warning gap-1 shadow cursor-pointer hover:badge-outline transition-all"
            onClick={() => setLegendOpen((o) => !o)}
          >
            Legenda Staza
          </button>
        )}

        {showBikeStations && nextbikeBadgeText && (
          <div className="badge badge-info gap-1 shadow">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {nextbikeBadgeText}
          </div>
        )}
      </div>
    </div>
  );
}
