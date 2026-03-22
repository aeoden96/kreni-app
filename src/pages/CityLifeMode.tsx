import { BaseMap } from '../components/Map/BaseMap';
import { OnboardingWizard } from '../components/common/OnboardingWizard';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSettingsStore } from '../stores/settingsStore';
import { StudentRestaurantsMap } from '../components/Map/StudentRestaurantsMap';
import { PublicFountainsMap } from '../components/Map/PublicFountainsMap';
import { PedestrianZonesMap } from '../components/Map/PedestrianZonesMap';
import { FreeWifiMap } from '../components/Map/FreeWifiMap';

export function CityLifeMode() {
    const { userLocation } = useGeolocation();

    const showStudentRestaurants = useSettingsStore(s => s.showStudentRestaurants);
    const showPublicFountains = useSettingsStore(s => s.showPublicFountains);
    const showPedestrianZones = useSettingsStore(s => s.showPedestrianZones);
    const showFreeWifi = useSettingsStore(s => s.showFreeWifi);

    return (
        <div className="h-full w-full relative">
            <BaseMap userLocation={userLocation}>
                <StudentRestaurantsMap show={showStudentRestaurants} />
                <PublicFountainsMap show={showPublicFountains} />
                <PedestrianZonesMap show={showPedestrianZones} />
                <FreeWifiMap show={showFreeWifi} />
            </BaseMap>

            {/* Map Controls */}
            <OnboardingWizard variant="city" />
        </div>
    );
}

