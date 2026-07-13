import { useTranslation } from 'react-i18next';

import { OnboardingWizard } from '../components/common/OnboardingWizard';
import { BaseMap } from '../components/Map/BaseMap';
import { CityMergedClusterLayer } from '../components/Map/CityMergedClusterLayer';
import { CityPointsClusterProvider } from '../components/Map/CityPointsClusterContext';
import { CityLayersPanel } from '../components/Map/layerPanels/city/CityLayersPanel';
import { MapFavouriteScopeProvider } from '../components/Map/MapFavouriteScopeProvider';
import { MAP_ZOOM_CITY_STATIC_LAYERS_MIN } from '../components/Map/mapZoomConstants';
import { CulturalInstitutionsMap } from '../components/Map/modes/city/CulturalInstitutionsMap';
import { DogParksMap } from '../components/Map/modes/city/DogParksMap';
import { DomesticAnimalZonesMap } from '../components/Map/modes/city/DomesticAnimalZonesMap';
import { DrinkingFountainsExtraMap } from '../components/Map/modes/city/DrinkingFountainsExtraMap';
import { EvacuationAreasMap } from '../components/Map/modes/city/EvacuationAreasMap';
import { FreeWifiMap } from '../components/Map/modes/city/FreeWifiMap';
import { GalleriesMap } from '../components/Map/modes/city/GalleriesMap';
import { GraffitiMap } from '../components/Map/modes/city/GraffitiMap';
import { HealthHomesMap } from '../components/Map/modes/city/HealthHomesMap';
import { HealthInstitutionsMap } from '../components/Map/modes/city/HealthInstitutionsMap';
import { MarketsMap } from '../components/Map/modes/city/MarketsMap';
import { PedestrianZonesMap } from '../components/Map/modes/city/PedestrianZonesMap';
import { PharmaciesMap } from '../components/Map/modes/city/PharmaciesMap';
import { PlaygroundsMap } from '../components/Map/modes/city/PlaygroundsMap';
import { PublicArchitectureCompetitionsMap } from '../components/Map/modes/city/PublicArchitectureCompetitionsMap';
import { PublicFountainsMap } from '../components/Map/modes/city/PublicFountainsMap';
import { PublicGardensMap } from '../components/Map/modes/city/PublicGardensMap';
import { PublicToiletsMap } from '../components/Map/modes/city/PublicToiletsMap';
import { RecyclingYardsMap } from '../components/Map/modes/city/RecyclingYardsMap';
import { SportsFacilitiesMap } from '../components/Map/modes/city/SportsFacilitiesMap';
import { StudentRestaurantsMap } from '../components/Map/modes/city/StudentRestaurantsMap';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSettingsStore } from '../stores/settingsStore';

export function CityLifeMode() {
  const { t } = useTranslation();
  const mapZoom = useSettingsStore((s) => s.mapZoom);
  const { userLocation } = useGeolocation();

  const showStudentRestaurants = useSettingsStore((s) => s.showStudentRestaurants);
  const showGalleries = useSettingsStore((s) => s.showGalleries);
  const showGraffiti = useSettingsStore((s) => s.showGraffiti);
  const showPublicFountains = useSettingsStore((s) => s.showPublicFountains);
  const showPedestrianZones = useSettingsStore((s) => s.showPedestrianZones);
  const showFreeWifi = useSettingsStore((s) => s.showFreeWifi);
  const showPublicToilets = useSettingsStore((s) => s.showPublicToilets);
  const showDogParks = useSettingsStore((s) => s.showDogParks);
  const showPlaygrounds = useSettingsStore((s) => s.showPlaygrounds);
  const showMarkets = useSettingsStore((s) => s.showMarkets);
  const showPublicGardens = useSettingsStore((s) => s.showPublicGardens);
  const showCulturalInstitutions = useSettingsStore((s) => s.showCulturalInstitutions);
  const showPharmacies = useSettingsStore((s) => s.showPharmacies);
  const showHealthHomes = useSettingsStore((s) => s.showHealthHomes);
  const showHealthInstitutions = useSettingsStore((s) => s.showHealthInstitutions);
  const showRecyclingYards = useSettingsStore((s) => s.showRecyclingYards);
  const showSportsFacilities = useSettingsStore((s) => s.showSportsFacilities);
  const showPublicArchitectureCompetitions = useSettingsStore(
    (s) => s.showPublicArchitectureCompetitions
  );
  const showEvacuationAreas = useSettingsStore((s) => s.showEvacuationAreas);
  const showDomesticAnimalZones = useSettingsStore((s) => s.showDomesticAnimalZones);

  return (
    <div className="h-full w-full relative">
      <BaseMap userLocation={userLocation}>
        <MapFavouriteScopeProvider value="city">
          <CityPointsClusterProvider>
            {/* Essentials */}
            <PublicFountainsMap show={showPublicFountains} />
            <DrinkingFountainsExtraMap show={showPublicFountains} />
            <FreeWifiMap show={showFreeWifi} />
            <PedestrianZonesMap show={showPedestrianZones} />
            <PublicToiletsMap show={showPublicToilets} />

            {/* City Life */}
            <StudentRestaurantsMap show={showStudentRestaurants} />
            <MarketsMap show={showMarkets} />
            <PublicGardensMap show={showPublicGardens} />
            <PlaygroundsMap show={showPlaygrounds} />
            <SportsFacilitiesMap show={showSportsFacilities} />
            <GalleriesMap show={showGalleries} />
            <DogParksMap show={showDogParks} />
            <CulturalInstitutionsMap show={showCulturalInstitutions} />
            <GraffitiMap show={showGraffiti} />

            {/* Health */}
            <PharmaciesMap show={showPharmacies} />
            <HealthHomesMap show={showHealthHomes} />
            <HealthInstitutionsMap show={showHealthInstitutions} />

            {/* Transport */}
            <RecyclingYardsMap show={showRecyclingYards} />

            {/* Safety */}
            <EvacuationAreasMap show={showEvacuationAreas} />
            <DomesticAnimalZonesMap show={showDomesticAnimalZones} />
            <PublicArchitectureCompetitionsMap show={showPublicArchitectureCompetitions} />
            <CityMergedClusterLayer />
          </CityPointsClusterProvider>
        </MapFavouriteScopeProvider>
      </BaseMap>

      {/* Map Controls */}
      <OnboardingWizard variant="city" />

      {/* City Layers Panel — top-left badge + panel */}
      <CityLayersPanel />
      {mapZoom <= MAP_ZOOM_CITY_STATIC_LAYERS_MIN && (
        <div className="absolute top-[calc(5rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[1000]">
          <div className="badge badge-neutral gap-2 shadow text-xs sm:text-sm opacity-90 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-50 animate-ping" />
            {t('map.zoomForLayers')}
          </div>
        </div>
      )}
    </div>
  );
}
