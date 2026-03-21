import { BaseMap } from '../components/Map/BaseMap';
import { OnboardingWizard } from '../components/common/OnboardingWizard';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSettingsStore } from '../stores/settingsStore';
import { PublicGaragesMap } from '../components/Map/PublicGaragesMap';
import { ElectricChargingMap } from '../components/Map/ElectricChargingMap';
import { ParkingZonesMap } from '../components/Map/ParkingZonesMap';
import { RoadClosures } from '../components/Map/RoadClosures';
import { useRoadClosures } from '../hooks/useRoadClosures';

export function DrivingMode() {
    const { userLocation } = useGeolocation();
    const showPublicGarages = useSettingsStore(s => s.showPublicGarages);
    const showElectricCharging = useSettingsStore(s => s.showElectricCharging);
    const showParkingZones = useSettingsStore(s => s.showParkingZones);
    const showRoadClosures = useSettingsStore(s => s.showRoadClosures);
    const { closures } = useRoadClosures(showRoadClosures);

    return (
        <div className="h-full w-full relative">
            <BaseMap userLocation={userLocation}>
                <ParkingZonesMap show={showParkingZones} />
                <PublicGaragesMap show={showPublicGarages} />
                <ElectricChargingMap show={showElectricCharging} />
                <RoadClosures show={showRoadClosures} closures={closures} />
            </BaseMap>

            {/* Map Controls */}
            <OnboardingWizard variant="driving" />
        </div>
    );
}
