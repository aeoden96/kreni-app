import {
  Building2,
  Compass,
  Dog,
  FlaskConical,
  HeartPulse,
  Hospital,
  Layers,
  Recycle,
  ShoppingBasket,
  Sprout,
  Tv2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '../../../../stores/settingsStore';
import {
  LayerQuickToggleGrid,
  LayersBadge,
  LayersPanelShell,
  LayerToggleRow,
  MapControlBadgesRow,
  SavedPlacesMapBadge,
} from '../LayerPanelShared';
import { MapSavedPlacesPanelDialog } from '../MapSavedPlacesPanelDialog';

/* ── Constants ──────────────────────────────────────────────────────────── */

/** Show a "too many active" nudge at this threshold. */
const WARNING_THRESHOLD = 3;

/** Pinned quick toggles (order = grid order). Also excluded from the list below. */
const CITY_QUICK_LAYER_IDS = [
  'toilets',
  'gardens',
  'playgrounds',
  'dog_parks',
  'sports_facilities',
  'cultural',
] as const;

/* ── Types ─────────────────────────────────────────────────────────────── */

type LayerGroup = {
  id: string;
  items: LayerToggle[];
  label: string;
};

type LayerToggle = {
  active: boolean;
  description: string;
  icon: ReactNode;
  id: string;
  label: string;
  set: (v: boolean) => void;
};

type MapChromePanel = 'closed' | 'layers' | 'saved';

/* ── Exported components ────────────────────────────────────────────────── */

interface PanelProps {
  activeCount: number;
  isOpen: boolean;
  onClose: () => void;
}

/** Badge + panel wrapper — renders the floating trigger and the panel itself. */
export function CityLayersPanel() {
  const {
    showCulturalInstitutions,
    showDogParks,
    showDomesticAnimalZones,
    showEvacuationAreas,
    showFreeWifi,
    showGalleries,
    showGraffiti,
    showHealthHomes,
    showHealthInstitutions,
    showMarkets,
    showPedestrianZones,
    showPharmacies,
    showPlaygrounds,
    showPublicArchitectureCompetitions,
    showPublicFountains,
    showPublicGardens,
    showPublicToilets,
    showRecyclingYards,
    showSportsFacilities,
    showStudentRestaurants,
  } = useSettingsStore();

  const activeCount = [
    showPublicFountains,
    showFreeWifi,
    showStudentRestaurants,
    showPedestrianZones,
    showPublicToilets,
    showMarkets,
    showPublicGardens,
    showPlaygrounds,
    showSportsFacilities,
    showGalleries,
    showDogParks,
    showCulturalInstitutions,
    showGraffiti,
    showPharmacies,
    showHealthHomes,
    showHealthInstitutions,
    showRecyclingYards,
    showEvacuationAreas,
    showDomesticAnimalZones,
    showPublicArchitectureCompetitions,
  ].filter(Boolean).length;

  const { t } = useTranslation();
  const [chrome, setChrome] = React.useState<MapChromePanel>('closed');
  const savedCount = useSettingsStore((s) => s.mapPlaceFavouritesCity.length);

  return (
    <>
      <MapControlBadgesRow>
        <LayersBadge
          activeCount={activeCount}
          badgeCountClassName="bg-purple-500"
          badgeId="city-layers-badge"
          icon={<Compass className="w-4 h-4 shrink-0" />}
          label={t('cityLayers.badge')}
          onClick={() => setChrome((p) => (p === 'layers' ? 'closed' : 'layers'))}
        />
        <SavedPlacesMapBadge
          badgeCountClassName="bg-purple-500"
          badgeId="city-saved-places-badge"
          count={savedCount}
          label={t('mapSavedPlaces.badge')}
          onClick={() => setChrome((p) => (p === 'saved' ? 'closed' : 'saved'))}
        />
      </MapControlBadgesRow>
      <CityLayersPanelContent
        activeCount={activeCount}
        isOpen={chrome === 'layers'}
        onClose={() => setChrome('closed')}
      />
      <MapSavedPlacesPanelDialog
        headerIconClassName="text-rose-500"
        isOpen={chrome === 'saved'}
        onClose={() => setChrome('closed')}
        scope="city"
      />
    </>
  );
}

/** Scrollable panel content with grouped layer toggles. */
function CityLayersPanelContent({ activeCount, isOpen, onClose }: PanelProps) {
  const { t } = useTranslation();

  const {
    setShowCulturalInstitutions,
    setShowDogParks,
    setShowDomesticAnimalZones,
    setShowEvacuationAreas,
    setShowFreeWifi,
    setShowGalleries,
    setShowGraffiti,
    setShowHealthHomes,
    setShowHealthInstitutions,
    setShowMarkets,
    setShowPedestrianZones,
    setShowPharmacies,
    setShowPlaygrounds,
    setShowPublicArchitectureCompetitions,
    setShowPublicFountains,
    setShowPublicGardens,
    setShowPublicToilets,
    setShowRecyclingYards,
    setShowSportsFacilities,
    setShowStudentRestaurants,
    showCulturalInstitutions,
    showDogParks,
    showDomesticAnimalZones,
    showEvacuationAreas,
    showFreeWifi,
    showGalleries,
    showGraffiti,
    showHealthHomes,
    showHealthInstitutions,
    showMarkets,
    showPedestrianZones,
    showPharmacies,
    showPlaygrounds,
    showPublicArchitectureCompetitions,
    showPublicFountains,
    showPublicGardens,
    showPublicToilets,
    showRecyclingYards,
    showSportsFacilities,
    showStudentRestaurants,
  } = useSettingsStore();

  function handleResetAll() {
    setShowPublicFountains(false);
    setShowFreeWifi(false);
    setShowPedestrianZones(false);
    setShowPublicToilets(false);
    setShowStudentRestaurants(false);
    setShowMarkets(false);
    setShowPublicGardens(false);
    setShowPlaygrounds(false);
    setShowSportsFacilities(false);
    setShowGalleries(false);
    setShowDogParks(false);
    setShowCulturalInstitutions(false);
    setShowGraffiti(false);
    setShowPharmacies(false);
    setShowHealthHomes(false);
    setShowHealthInstitutions(false);
    setShowRecyclingYards(false);
    setShowEvacuationAreas(false);
    setShowDomesticAnimalZones(false);
    setShowPublicArchitectureCompetitions(false);
  }

  const groups: LayerGroup[] = [
    {
      id: 'essentials',
      items: [
        {
          active: showPublicFountains,
          description: t('cityLayers.fountains.desc'),
          icon: <span className="text-base">💧</span>,
          id: 'fountains',
          label: t('cityLayers.fountains.label'),
          set: setShowPublicFountains,
        },
        {
          active: showFreeWifi,
          description: t('cityLayers.wifi.desc'),
          icon: showFreeWifi ? (
            <Wifi className="w-4 h-4 text-purple-400" />
          ) : (
            <WifiOff className="w-4 h-4 opacity-40" />
          ),
          id: 'wifi',
          label: t('cityLayers.wifi.label'),
          set: setShowFreeWifi,
        },
        {
          active: showPedestrianZones,
          description: t('cityLayers.pedestrian.desc'),
          icon: <span className="text-base">🚶</span>,
          id: 'pedestrian',
          label: t('cityLayers.pedestrian.label'),
          set: setShowPedestrianZones,
        },
        {
          active: showPublicToilets,
          description: t('cityLayers.toilets.desc'),
          icon: <span className="text-base">🚻</span>,
          id: 'toilets',
          label: t('cityLayers.toilets.label'),
          set: setShowPublicToilets,
        },
      ],
      label: t('cityLayers.groupEssentials'),
    },
    {
      id: 'city-life',
      items: [
        {
          active: showStudentRestaurants,
          description: t('cityLayers.restaurants.desc'),
          icon: <span className="text-base">🍴</span>,
          id: 'restaurants',
          label: t('cityLayers.restaurants.label'),
          set: setShowStudentRestaurants,
        },
        {
          active: showMarkets,
          description: t('cityLayers.markets.desc'),
          icon: <ShoppingBasket className="w-4 h-4 text-red-400" />,
          id: 'markets',
          label: t('cityLayers.markets.label'),
          set: setShowMarkets,
        },
        {
          active: showPublicGardens,
          description: t('cityLayers.gardens.desc'),
          icon: <Sprout className="w-4 h-4 text-green-400" />,
          id: 'gardens',
          label: t('cityLayers.gardens.label'),
          set: setShowPublicGardens,
        },
        {
          active: showPlaygrounds,
          description: t('cityLayers.playgrounds.desc'),
          icon: <Tv2 className="w-4 h-4 text-sky-400" />,
          id: 'playgrounds',
          label: t('cityLayers.playgrounds.label'),
          set: setShowPlaygrounds,
        },
        {
          active: showSportsFacilities,
          description: t('cityLayers.sportsFacilities.desc'),
          icon: <span className="text-base">🏟️</span>,
          id: 'sports_facilities',
          label: t('cityLayers.sportsFacilities.label'),
          set: setShowSportsFacilities,
        },
        {
          active: showGalleries,
          description: t('cityLayers.galleries.desc'),
          icon: <span className="text-base">🖼️</span>,
          id: 'galleries',
          label: t('cityLayers.galleries.label'),
          set: setShowGalleries,
        },
        {
          active: showDogParks,
          description: t('cityLayers.dogParks.desc'),
          icon: <Dog className="w-4 h-4 text-amber-400" />,
          id: 'dog_parks',
          label: t('cityLayers.dogParks.label'),
          set: setShowDogParks,
        },
        {
          active: showCulturalInstitutions,
          description: t('cityLayers.cultural.desc'),
          icon: <Building2 className="w-4 h-4 text-violet-400" />,
          id: 'cultural',
          label: t('cityLayers.cultural.label'),
          set: setShowCulturalInstitutions,
        },
        {
          active: showGraffiti,
          description: t('cityLayers.graffiti.desc'),
          icon: <span className="text-base">🎨</span>,
          id: 'graffiti',
          label: t('cityLayers.graffiti.label'),
          set: setShowGraffiti,
        },
      ],
      label: t('cityLayers.groupCityLife'),
    },
    {
      id: 'health',
      items: [
        {
          active: showPharmacies,
          description: t('cityLayers.pharmacies.desc'),
          icon: <FlaskConical className="w-4 h-4 text-green-400" />,
          id: 'pharmacies',
          label: t('cityLayers.pharmacies.label'),
          set: setShowPharmacies,
        },
        {
          active: showHealthHomes,
          description: t('cityLayers.healthHomes.desc'),
          icon: <Hospital className="w-4 h-4 text-blue-400" />,
          id: 'health_homes',
          label: t('cityLayers.healthHomes.label'),
          set: setShowHealthHomes,
        },
        {
          active: showHealthInstitutions,
          description: t('cityLayers.healthInst.desc'),
          icon: <HeartPulse className="w-4 h-4 text-red-400" />,
          id: 'health_inst',
          label: t('cityLayers.healthInst.label'),
          set: setShowHealthInstitutions,
        },
      ],
      label: t('cityLayers.groupHealth'),
    },
    {
      id: 'transport',
      items: [
        {
          active: showRecyclingYards,
          description: t('cityLayers.recycling.desc'),
          icon: <Recycle className="w-4 h-4 text-emerald-400" />,
          id: 'recycling',
          label: t('cityLayers.recycling.label'),
          set: setShowRecyclingYards,
        },
      ],
      label: t('cityLayers.groupTransport'),
    },
    {
      id: 'safety',
      items: [
        {
          active: showEvacuationAreas,
          description: t('cityLayers.evacuation.desc'),
          icon: <span className="text-base">⚠️</span>,
          id: 'evacuation',
          label: t('cityLayers.evacuation.label'),
          set: setShowEvacuationAreas,
        },
        {
          active: showDomesticAnimalZones,
          description: t('cityLayers.animalZones.desc'),
          icon: <span className="text-base">🐄</span>,
          id: 'animal_zones',
          label: t('cityLayers.animalZones.label'),
          set: setShowDomesticAnimalZones,
        },
        {
          active: showPublicArchitectureCompetitions,
          description: t('cityLayers.architectureCompetitions.desc'),
          icon: <span className="text-base">🏗️</span>,
          id: 'architecture_competitions',
          label: t('cityLayers.architectureCompetitions.label'),
          set: setShowPublicArchitectureCompetitions,
        },
      ],
      label: t('cityLayers.groupSafety'),
    },
  ];

  if (!isOpen) return null;

  const pinnedSet = new Set<string>(CITY_QUICK_LAYER_IDS);
  const quickItems = pickQuickLayers(groups, CITY_QUICK_LAYER_IDS);
  const listGroups = groupsWithoutPinned(groups, pinnedSet);

  return (
    <LayersPanelShell
      activeCount={activeCount}
      closeLabel={t('common.close')}
      headerIcon={<Layers className="w-4 h-4 text-purple-400" />}
      onClose={onClose}
      onReset={handleResetAll}
      panelLabel={t('cityLayers.panelTitle')}
      resetLabel={t('cityLayers.resetAll')}
      warningDescription={t('cityLayers.tooManyDesc')}
      warningThreshold={WARNING_THRESHOLD}
      warningTitle={t('cityLayers.tooManyTitle')}
    >
      <div className="city-layers-panel-body">
        <LayerQuickToggleGrid
          accentActiveClassName="dark:bg-purple-500/14 bg-purple-500/10 border border-purple-400/45 dark:border-purple-400/40 ring-1 ring-purple-400/25 dark:ring-purple-400/20"
          inputIdPrefix="city-layer-quick"
          items={quickItems}
        />
        {listGroups.map((group) => (
          <div className="py-1" key={group.id}>
            <div className="text-[10px] font-extrabold tracking-[0.1em] uppercase px-4 pb-1 pt-1.5 dark:text-purple-400/80 text-purple-700/75">
              {group.label}
            </div>
            <div className="flex flex-col">
              {group.items.map((item) => (
                <LayerRow key={item.id} {...item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </LayersPanelShell>
  );
}

/* ── Private helpers ────────────────────────────────────────────────────── */

function collectLayersById(groups: LayerGroup[]): Map<string, LayerToggle> {
  const map = new Map<string, LayerToggle>();
  for (const g of groups) {
    for (const item of g.items) {
      map.set(item.id, item);
    }
  }
  return map;
}

function groupsWithoutPinned(groups: LayerGroup[], pinned: ReadonlySet<string>): LayerGroup[] {
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !pinned.has(i.id)),
    }))
    .filter((g) => g.items.length > 0);
}

function LayerRow({ active, description, icon, id, label, set }: LayerToggle) {
  return (
    <LayerToggleRow
      active={active}
      description={description}
      icon={icon}
      id={id}
      label={label}
      set={set}
    />
  );
}

function pickQuickLayers(groups: LayerGroup[], orderedIds: readonly string[]): LayerToggle[] {
  const byId = collectLayersById(groups);
  return orderedIds.map((id) => byId.get(id)).filter((x): x is LayerToggle => x != null);
}
