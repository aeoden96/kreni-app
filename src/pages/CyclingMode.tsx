import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { CyclosmMapVariant } from '../stores/settingsStore';

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
  const [zagrebLegendOpen, setZagrebLegendOpen] = useState(false);
  const [cyclosmLegendOpen, setCyclosmLegendOpen] = useState(false);

  const showBikeStations = useSettingsStore((s) => s.showBikeStations);
  const showBikeParkings = useSettingsStore((s) => s.showBikeParkings);
  const showBikePaths = useSettingsStore((s) => s.showBikePaths);
  const favouriteNextbikeUids = useSettingsStore((s) => s.favouriteNextbikeStationUids);
  const cyclosmMapVariant = useSettingsStore((s) => s.cyclosmMapVariant);
  const setCyclosmMapVariant = useSettingsStore((s) => s.setCyclosmMapVariant);

  const { lastFetched, stations } = useNextbikeData(showBikeStations);

  const [nextbikeBadgeText, setNextbikeBadgeText] = useState('');

  useEffect(() => {
    if (cyclosmMapVariant !== 'standard') {
      setZagrebLegendOpen(false);
    }
    if (cyclosmMapVariant !== 'full') {
      setCyclosmLegendOpen(false);
    }
  }, [cyclosmMapVariant]);

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

  const showCyclingTopLeft =
    showBikePaths || (showBikeStations && favouriteNextbikeUids.length > 0);

  const mapSourceHeadingId = 'cycling-map-source-heading';
  const mapSourceOptions: {
    id: CyclosmMapVariant;
    labelKey: 'mapSourceOptionCyclosm' | 'mapSourceOptionZagrebHr';
  }[] = [
    { id: 'full', labelKey: 'mapSourceOptionCyclosm' },
    { id: 'standard', labelKey: 'mapSourceOptionZagrebHr' },
  ];
  const currentMapSourceLabel =
    cyclosmMapVariant === 'full'
      ? t('cyclingMode.mapSourceOptionCyclosm')
      : t('cyclingMode.mapSourceOptionZagrebHr');

  return (
    <div className="h-full w-full relative">
      <BaseMap
        cyclosmBasemap={showBikePaths && cyclosmMapVariant === 'full'}
        userLocation={userLocation}
      >
        <BikeStations show={showBikeStations} stations={stations} />
        <BikeParkings show={showBikeParkings} />
        <BikePaths show={showBikePaths && cyclosmMapVariant === 'standard'} />
      </BaseMap>

      {/* Map Controls */}
      <OnboardingWizard variant="cycling" />

      {showCyclingTopLeft && (
        <div className="pointer-events-none absolute top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))] right-[max(0.5rem,calc(6.75rem+env(safe-area-inset-right)))] z-[1100] flex max-w-[20rem] flex-col gap-2 sm:right-[max(1rem,calc(9.25rem+env(safe-area-inset-right)))]">
          {showBikePaths && (
            <div className="pointer-events-auto flex w-full min-w-0 flex-col gap-1.5 rounded-xl border border-base-200 bg-base-100/95 px-3 py-2 shadow-lg backdrop-blur-sm">
              <span
                className="text-xs font-semibold uppercase tracking-wide text-base-content/70"
                id={mapSourceHeadingId}
              >
                {t('cyclingMode.mapSourceLabel')}
              </span>
              <div className="dropdown dropdown-bottom w-full">
                <div
                  aria-controls="cycling-map-source-menu"
                  aria-expanded="false"
                  aria-labelledby={mapSourceHeadingId}
                  className="select select-bordered select-xs h-auto min-h-8 w-full cursor-pointer py-1.5 pl-2 pr-8 text-left font-normal"
                  role="combobox"
                  tabIndex={0}
                >
                  <span className="line-clamp-2 block min-w-0 text-[11px] leading-snug text-base-content">
                    {currentMapSourceLabel}
                  </span>
                </div>
                <ul
                  className="dropdown-content menu menu-xs z-[1200] mt-1 w-full min-w-full max-w-full rounded-box border border-base-200 bg-base-100 p-1 shadow-lg"
                  id="cycling-map-source-menu"
                  tabIndex={0}
                >
                  {mapSourceOptions.map((opt) => (
                    <li key={opt.id}>
                      <button
                        className={`h-auto min-h-0 w-full whitespace-normal rounded-lg py-2 text-left text-[11px] leading-snug ${
                          cyclosmMapVariant === opt.id ? 'active font-semibold' : ''
                        }`}
                        onClick={() => setCyclosmMapVariant(opt.id)}
                        type="button"
                      >
                        {t(`cyclingMode.${opt.labelKey}`)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <FavouriteNextbikePanel show={showBikeStations} stations={stations} />
        </div>
      )}

      <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[1000] flex flex-col items-end gap-2">
        {showBikePaths && cyclosmMapVariant === 'full' && cyclosmLegendOpen && (
          <div className="mb-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-base-200 bg-base-100 p-3 text-xs shadow-xl">
            <p className="mb-1 font-semibold text-base-content">
              {t('cyclingMode.cyclosmLegendTitle')}
            </p>
            <p className="leading-snug text-base-content/80">
              {t('cyclingMode.cyclosmLegendVisitHint')}{' '}
              <a
                className="link link-primary font-medium underline-offset-2"
                href="https://www.cyclosm.org"
                rel="noopener noreferrer"
                target="_blank"
              >
                cyclosm.org
              </a>
            </p>
          </div>
        )}

        {showBikePaths && cyclosmMapVariant === 'standard' && zagrebLegendOpen && (
          <div className="mb-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-base-200 bg-base-100 p-3 text-xs shadow-xl space-y-2">
            <p className="mb-1 font-semibold text-base-content">
              {t('cyclingMode.zagrebPathsLegendTitle')}
            </p>

            <div className="flex items-center gap-2">
              <div className="h-1 w-5 bg-[#eab308]" />
              <span className="text-base-content/80">
                {t('cyclingMode.zagrebPathsLegendItemPb')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-5 border-b-2 border-dashed border-base-100 bg-[#84cc16]" />
              <span className="text-base-content/80">
                {t('cyclingMode.zagrebPathsLegendItemBp')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-5 bg-[#22d3ee]" />
              <span className="text-base-content/80">
                {t('cyclingMode.zagrebPathsLegendItemLane')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-5 bg-[#a855f7]" />
              <span className="text-base-content/80">
                {t('cyclingMode.zagrebPathsLegendItemMixed')}
              </span>
            </div>
          </div>
        )}

        {showBikePaths && cyclosmMapVariant === 'full' && (
          <button
            className="badge badge-success gap-1 shadow cursor-pointer transition-all hover:badge-outline"
            onClick={() => setCyclosmLegendOpen((o) => !o)}
            type="button"
          >
            {t('cyclingMode.legendBadge')}
          </button>
        )}

        {showBikePaths && cyclosmMapVariant === 'standard' && (
          <button
            className="badge badge-warning gap-1 shadow cursor-pointer transition-all hover:badge-outline"
            onClick={() => setZagrebLegendOpen((o) => !o)}
            type="button"
          >
            {t('cyclingMode.zagrebPathsLegendBadge')}
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
