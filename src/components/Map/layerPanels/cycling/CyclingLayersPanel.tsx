import { Bike, Layers, MapPin, ParkingCircle } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { BajsStation } from '../../../../hooks/useNextbikeData';
import type { CyclosmMapVariant } from '../../../../stores/settingsStore';

import { useSettingsStore } from '../../../../stores/settingsStore';
import {
  LayersBadge,
  LayersPanelShell,
  LayerToggleRow,
  SavedPlacesMapBadge,
} from '../LayerPanelShared';
import { MapSavedPlacesPanelDialog } from '../MapSavedPlacesPanelDialog';

const WARNING_THRESHOLD = 2;

type CyclingLayersPanelProps = {
  stations: BajsStation[];
};

type LayerToggle = {
  active: boolean;
  description: string;
  icon: ReactNode;
  id: string;
  label: string;
  set: (value: boolean) => void;
};

type MapChromePanel = 'closed' | 'layers' | 'saved';

export function CyclingLayersPanel({ stations }: CyclingLayersPanelProps) {
  const [chrome, setChrome] = useState<MapChromePanel>('closed');
  const { t } = useTranslation();
  const savedCount = useSettingsStore((s) => s.mapPlaceFavouritesCycling.length);
  const showBikePaths = useSettingsStore((s) => s.showBikePaths);
  const showBikeStations = useSettingsStore((s) => s.showBikeStations);
  const showBikeParkings = useSettingsStore((s) => s.showBikeParkings);

  const activeCount = [showBikePaths, showBikeStations, showBikeParkings].filter(Boolean).length;

  return (
    <>
      <div className="pointer-events-none absolute left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.75rem,env(safe-area-inset-top))] z-[800] flex max-w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-2">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 shrink-0">
          <LayersBadge
            activeCount={activeCount}
            badgeCountClassName="bg-green-600"
            badgeId="cycling-layers-badge"
            icon={<Layers className="w-4 h-4 shrink-0" />}
            label={t('cyclingLayers.badge')}
            onClick={() => setChrome((p) => (p === 'layers' ? 'closed' : 'layers'))}
          />
          <SavedPlacesMapBadge
            badgeCountClassName="bg-green-600"
            badgeId="cycling-saved-places-badge"
            count={savedCount}
            label={t('mapSavedPlaces.badge')}
            onClick={() => setChrome((p) => (p === 'saved' ? 'closed' : 'saved'))}
          />
        </div>
      </div>
      <CyclingLayersPanelContent
        activeCount={activeCount}
        isOpen={chrome === 'layers'}
        onClose={() => setChrome('closed')}
      />
      <MapSavedPlacesPanelDialog
        headerIconClassName="text-emerald-500"
        isOpen={chrome === 'saved'}
        nextbikeStations={stations}
        onClose={() => setChrome('closed')}
        scope="cycling"
      />
    </>
  );
}

function CyclingLayersPanelContent({
  activeCount,
  isOpen,
  onClose,
}: {
  activeCount: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const cyclosmMapVariant = useSettingsStore((s) => s.cyclosmMapVariant);
  const setCyclosmMapVariant = useSettingsStore((s) => s.setCyclosmMapVariant);
  const setShowBikeParkings = useSettingsStore((s) => s.setShowBikeParkings);
  const setShowBikePaths = useSettingsStore((s) => s.setShowBikePaths);
  const setShowBikeStations = useSettingsStore((s) => s.setShowBikeStations);
  const showBikeParkings = useSettingsStore((s) => s.showBikeParkings);
  const showBikePaths = useSettingsStore((s) => s.showBikePaths);
  const showBikeStations = useSettingsStore((s) => s.showBikeStations);

  const mapSourceHeadingId = 'cycling-map-source-heading-panel';
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

  const items: LayerToggle[] = [
    {
      active: showBikePaths,
      description: t('cyclingLayers.bikePaths.desc'),
      icon: <MapPin className="w-5 h-5 text-emerald-500" />,
      id: 'bike_paths',
      label: t('cyclingLayers.bikePaths.label'),
      set: setShowBikePaths,
    },
    {
      active: showBikeStations,
      description: t('cyclingLayers.bikeStations.desc'),
      icon: <Bike className="w-5 h-5 text-nextbike dark:text-nextbike-bright" />,
      id: 'bike_stations',
      label: t('cyclingLayers.bikeStations.label'),
      set: setShowBikeStations,
    },
    {
      active: showBikeParkings,
      description: t('cyclingLayers.bikeParkings.desc'),
      icon: <ParkingCircle className="w-5 h-5 text-emerald-600" />,
      id: 'bike_parkings',
      label: t('cyclingLayers.bikeParkings.label'),
      set: setShowBikeParkings,
    },
  ];

  function handleResetAll() {
    setShowBikePaths(false);
    setShowBikeStations(false);
    setShowBikeParkings(false);
  }

  if (!isOpen) return null;

  return (
    <LayersPanelShell
      activeCount={activeCount}
      closeLabel={t('common.close')}
      headerIcon={<Layers className="w-4 h-4 text-emerald-500" />}
      onClose={onClose}
      onReset={handleResetAll}
      panelLabel={t('cyclingLayers.panelTitle')}
      resetLabel={t('cyclingLayers.resetAll')}
      warningDescription={t('cyclingLayers.tooManyDesc')}
      warningThreshold={WARNING_THRESHOLD}
      warningTitle={t('cyclingLayers.tooManyTitle')}
    >
      <div className="city-layers-panel-body flex flex-col py-2">
        <div className="flex flex-col">
          {items.map((item) => (
            <LayerToggleRow
              active={item.active}
              description={item.description}
              icon={item.icon}
              id={item.id}
              inputIdPrefix="cycling-layer-toggle"
              key={item.id}
              label={item.label}
              set={item.set}
            />
          ))}
        </div>
        {showBikePaths ? (
          <div className="mt-2 border-t border-black/[0.06] px-4 pt-3 dark:border-white/[0.08]">
            <span
              className="text-[10px] font-extrabold uppercase tracking-[0.1em] dark:text-emerald-400/85 text-emerald-800/85"
              id={mapSourceHeadingId}
            >
              {t('cyclingMode.mapSourceLabel')}
            </span>
            <div className="dropdown dropdown-top mt-1.5 w-full">
              <div
                aria-controls="cycling-map-source-menu-panel"
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
                className="dropdown-content menu menu-xs z-[1] mb-1 w-full min-w-full max-w-full rounded-box border border-base-200 bg-base-100 p-1 shadow-lg"
                id="cycling-map-source-menu-panel"
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
        ) : null}
      </div>
    </LayersPanelShell>
  );
}
