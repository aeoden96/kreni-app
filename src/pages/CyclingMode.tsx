import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NextbikeAppLogoLink } from '../components/common/NextbikeAppLogoLink';
import { NextbikeRefreshModal } from '../components/common/NextbikeRefreshModal';
import { OnboardingWizard } from '../components/common/OnboardingWizard';
import { BaseMap } from '../components/Map/BaseMap';
import { CityMergedClusterLayer } from '../components/Map/CityMergedClusterLayer';
import { CityPointsClusterProvider } from '../components/Map/CityPointsClusterContext';
import { CyclingLayersPanel } from '../components/Map/layerPanels/cycling/CyclingLayersPanel';
import { MapFavouriteScopeProvider } from '../components/Map/MapFavouriteScopeProvider';
import { BikeParkings } from '../components/Map/modes/cycling/BikeParkings';
import { BikePaths } from '../components/Map/modes/cycling/BikePaths';
import { BikeStations } from '../components/Map/modes/cycling/BikeStations';
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
  const cyclosmMapVariant = useSettingsStore((s) => s.cyclosmMapVariant);

  const {
    diffOverflowCount,
    error,
    fetchDiffState,
    lastFetched,
    loading,
    manualCooldownUntil,
    refetchManual,
    stations,
  } = useNextbikeData(showBikeStations);

  const [nextbikeBadgeText, setNextbikeBadgeText] = useState('');
  const [nextbikeModalOpen, setNextbikeModalOpen] = useState(false);

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

  return (
    <div className="h-full w-full relative">
      <BaseMap
        cyclosmBasemap={showBikePaths && cyclosmMapVariant === 'full'}
        userLocation={userLocation}
      >
        <MapFavouriteScopeProvider value="cycling">
          <CityPointsClusterProvider>
            <BikeStations show={showBikeStations} stations={stations} />
            <BikeParkings show={showBikeParkings} />
            <BikePaths show={showBikePaths && cyclosmMapVariant === 'standard'} />
            <CityMergedClusterLayer />
          </CityPointsClusterProvider>
        </MapFavouriteScopeProvider>
      </BaseMap>

      {/* Map Controls */}
      <OnboardingWizard variant="cycling" />
      <CyclingLayersPanel stations={stations} />

      {/* z-index above Leaflet .leaflet-bottom / .leaflet-top (1000) so map chrome cannot steal clicks */}
      <div className="pointer-events-none absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] z-[1100] flex flex-col gap-2">
        <div className="pointer-events-auto flex flex-col items-end gap-2 self-end">
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
        </div>

        {showBikeStations ? (
          <div className="flex w-full min-w-0 items-end justify-end gap-3">
            {/* Must set pointer-events-auto: parent uses pointer-events-none, and pointer-events inherits */}
            <div className="pointer-events-auto shrink-0 flex justify-end absolute left-0 bottom-0">
              <NextbikeAppLogoLink />
            </div>
            <div className="pointer-events-auto flex min-h-0 shrink-0 flex-col items-end justify-end">
              {nextbikeBadgeText ? (
                <NextbikeRefreshModal
                  diffOverflowCount={diffOverflowCount}
                  error={error}
                  fetchDiffState={fetchDiffState}
                  lastFetched={lastFetched}
                  loading={loading}
                  manualCooldownUntil={manualCooldownUntil}
                  onManualRefetch={refetchManual}
                  onOpenChange={setNextbikeModalOpen}
                  open={nextbikeModalOpen}
                  stationCount={stations.length}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-white" />
                    <span className="leading-none">{nextbikeBadgeText}</span>
                  </span>
                </NextbikeRefreshModal>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
