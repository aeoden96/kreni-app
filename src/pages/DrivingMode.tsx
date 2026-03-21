import { BaseMap } from '../components/Map/BaseMap';
import { OnboardingWizard } from '../components/common/OnboardingWizard';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSettingsStore } from '../stores/settingsStore';
import { PublicGaragesMap } from '../components/Map/PublicGaragesMap';
import { ElectricChargingMap } from '../components/Map/ElectricChargingMap';
import { ParkingZonesMap } from '../components/Map/ParkingZonesMap';
import { RoadClosures } from '../components/Map/RoadClosures';
import { RoadClosuresListModal } from '../components/common/RoadClosuresListModal';
import { useRoadClosures } from '../hooks/useRoadClosures';

export function DrivingMode() {
    const { userLocation } = useGeolocation();
    const showPublicGarages = useSettingsStore(s => s.showPublicGarages);
    const showElectricCharging = useSettingsStore(s => s.showElectricCharging);
    const showParkingZones = useSettingsStore(s => s.showParkingZones);
    const { closures } = useRoadClosures(true);

    return (
        <div className="h-full w-full relative">
            <BaseMap userLocation={userLocation}>
                <ParkingZonesMap show={showParkingZones} />
                <PublicGaragesMap show={showPublicGarages} />
                <ElectricChargingMap show={showElectricCharging} />
                <RoadClosures show={true} closures={closures} />
            </BaseMap>

            {/* Map Controls */}
            <OnboardingWizard variant="driving" />
            <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[1000] flex flex-col items-end gap-2">
                {closures.length > 0 && <RoadClosuresListModal closures={closures} />}
            </div>
        </div>
    );
}
