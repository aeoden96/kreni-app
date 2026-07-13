import type { MapFavouriteLayerId } from '../types/mapPlaceFavourite';

import { useSettingsStore } from '../stores/settingsStore';

/** Turn on the settings toggle for a map layer so a saved place can appear. */
export function enableMapFavouriteLayer(layerId: MapFavouriteLayerId): void {
  const s = useSettingsStore.getState();
  switch (layerId) {
    case 'bikeParkings':
      s.setShowBikeParkings(true);
      break;
    case 'cultural':
      s.setShowCulturalInstitutions(true);
      break;
    case 'dogParks':
      s.setShowDogParks(true);
      break;
    case 'electricCharging':
      s.setShowElectricCharging(true);
      break;
    case 'evacuation':
      s.setShowEvacuationAreas(true);
      break;
    case 'fountains':
    case 'fountainsExtra':
      s.setShowPublicFountains(true);
      break;
    case 'galleries':
      s.setShowGalleries(true);
      break;
    case 'gardens':
      s.setShowPublicGardens(true);
      break;
    case 'gasStations':
      s.setShowGasStations(true);
      break;
    case 'graffiti':
      s.setShowGraffiti(true);
      break;
    case 'healthHomes':
      s.setShowHealthHomes(true);
      break;
    case 'healthInst':
      s.setShowHealthInstitutions(true);
      break;
    case 'markets':
      s.setShowMarkets(true);
      break;
    case 'nextbikeStations':
      s.setShowBikeStations(true);
      break;
    case 'pharmacies':
      s.setShowPharmacies(true);
      break;
    case 'playgrounds':
      s.setShowPlaygrounds(true);
      break;
    case 'publicArchitectureCompetitions':
      s.setShowPublicArchitectureCompetitions(true);
      break;
    case 'publicGarages':
      s.setShowPublicGarages(true);
      break;
    case 'recycling':
      s.setShowRecyclingYards(true);
      break;
    case 'restaurants':
      s.setShowStudentRestaurants(true);
      break;
    case 'sportsFacilities':
      s.setShowSportsFacilities(true);
      break;
    case 'surveillanceCameras':
      s.setShowSurveillanceCameras(true);
      break;
    case 'taxiStands':
      s.setShowTaxiStands(true);
      break;
    case 'toilets':
      s.setShowPublicToilets(true);
      break;
    case 'wifi':
      s.setShowFreeWifi(true);
      break;
  }
}
