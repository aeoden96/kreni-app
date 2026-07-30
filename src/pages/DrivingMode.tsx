import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OnboardingWizard } from '../components/common/OnboardingWizard';
import { RoadClosuresListModal } from '../components/common/RoadClosuresListModal';
import { BaseMap } from '../components/Map/BaseMap';
import { CityMergedClusterLayer } from '../components/Map/CityMergedClusterLayer';
import { CityPointsClusterProvider } from '../components/Map/CityPointsClusterContext';
import { DrivingLayersPanel } from '../components/Map/layerPanels/driving/DrivingLayersPanel';
import { MapFavouriteScopeProvider } from '../components/Map/MapFavouriteScopeProvider';
import { MAP_ZOOM_CITY_STATIC_LAYERS_MIN } from '../components/Map/mapZoomConstants';
import { ElectricChargingMap } from '../components/Map/modes/driving/ElectricChargingMap';
import { GasStationsMap } from '../components/Map/modes/driving/GasStationsMap';
import { ParkingZonesMap } from '../components/Map/modes/driving/ParkingZonesMap';
import { PublicGaragesMap } from '../components/Map/modes/driving/PublicGaragesMap';
import { RoadClosures } from '../components/Map/modes/driving/RoadClosures';
import { SurveillanceCamerasMap } from '../components/Map/modes/driving/SurveillanceCamerasMap';
import { TaxiStandsMap } from '../components/Map/modes/driving/TaxiStandsMap';
import { useGeolocation } from '../hooks/useGeolocation';
import { useRoadClosures } from '../hooks/useRoadClosures';
import { useSettingsStore } from '../stores/settingsStore';

export function DrivingMode() {
  const { t } = useTranslation();
  const mapZoom = useSettingsStore((s) => s.mapZoom);
  const { userLocation } = useGeolocation();
  const showPublicGarages = useSettingsStore((s) => s.showPublicGarages);
  const showElectricCharging = useSettingsStore((s) => s.showElectricCharging);
  const showGasStations = useSettingsStore((s) => s.showGasStations);
  const showParkingZones = useSettingsStore((s) => s.showParkingZones);
  const showRoadClosures = useSettingsStore((s) => s.showRoadClosures);
  const showSurveillanceCameras = useSettingsStore((s) => s.showSurveillanceCameras);
  const showTaxiStands = useSettingsStore((s) => s.showTaxiStands);
  const [isDrivingLayersOpen, setIsDrivingLayersOpen] = useState(false);
  const {
    closures,
    loading: closuresLoading,
    manualRefreshLocked,
    manualRefreshSecondsLeft,
    refetch: refetchClosures,
    refreshedAtMs,
  } = useRoadClosures(true);

  return (
    <div className="h-full w-full relative">
      <BaseMap userLocation={userLocation}>
        <MapFavouriteScopeProvider value="driving">
          <CityPointsClusterProvider>
            <ParkingZonesMap show={showParkingZones} />
            <PublicGaragesMap show={showPublicGarages} />
            <ElectricChargingMap show={showElectricCharging} />
            <GasStationsMap show={showGasStations} />
            <TaxiStandsMap show={showTaxiStands} />
            <SurveillanceCamerasMap show={showSurveillanceCameras} />
            <CityMergedClusterLayer />
            <RoadClosures closures={closures} show={showRoadClosures} />
          </CityPointsClusterProvider>
        </MapFavouriteScopeProvider>
      </BaseMap>

      {/* Map Controls */}
      <OnboardingWizard variant="driving" />
      <DrivingLayersPanel onOpenChange={setIsDrivingLayersOpen} />
      {mapZoom <= MAP_ZOOM_CITY_STATIC_LAYERS_MIN && (
        <div className="absolute top-[calc(5rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[1000]">
          <div className="badge badge-neutral gap-2 shadow text-xs sm:text-sm opacity-90 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-50 animate-ping" />
            {t('map.zoomForLayers')}
          </div>
        </div>
      )}
      <div className="absolute bottom-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))] right-[max(1rem,env(safe-area-inset-right))] z-[1000] flex flex-col items-end gap-2">
        {closures.length > 0 && !isDrivingLayersOpen && (
          <RoadClosuresListModal
            closures={closures}
            onRefresh={refetchClosures}
            refreshCooldownSecondsLeft={manualRefreshSecondsLeft}
            refreshedAtMs={refreshedAtMs}
            refreshing={closuresLoading}
            refreshLocked={manualRefreshLocked}
          />
        )}
      </div>
    </div>
  );
}
