import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseMap } from '../components/Map/BaseMap';
import { OnboardingWizard } from '../components/common/OnboardingWizard';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSettingsStore } from '../stores/settingsStore';
import { PublicGaragesMap } from '../components/Map/PublicGaragesMap';
import { ElectricChargingMap } from '../components/Map/ElectricChargingMap';
import { ParkingZonesMap } from '../components/Map/ParkingZonesMap';
import { RoadClosures } from '../components/Map/RoadClosures';
import { useRoadClosures, ROAD_CLOSURES_CACHE_TTL_MS } from '../hooks/useRoadClosures';

export function DrivingMode() {
    const { t } = useTranslation();
    const { userLocation } = useGeolocation();
    const showPublicGarages = useSettingsStore(s => s.showPublicGarages);
    const showElectricCharging = useSettingsStore(s => s.showElectricCharging);
    const showParkingZones = useSettingsStore(s => s.showParkingZones);
    const showRoadClosures = useSettingsStore(s => s.showRoadClosures);
    const { closures, lastFetched } = useRoadClosures(showRoadClosures);

    const [closuresBadgeText, setClosuresBadgeText] = useState('');

    useEffect(() => {
        if (!showRoadClosures || !lastFetched) {
            setClosuresBadgeText('');
            return;
        }

        const tick = () => {
            const msLeft = lastFetched + ROAD_CLOSURES_CACHE_TTL_MS - Date.now();
            if (msLeft <= 0) {
                setClosuresBadgeText(t('roadClosures.refreshBadgeRefreshing'));
                return;
            }
            const seconds = Math.ceil(msLeft / 1000);
            if (seconds < 60) {
                setClosuresBadgeText(t('roadClosures.refreshBadgeSeconds', { count: seconds }));
                return;
            }
            const minutes = Math.ceil(seconds / 60);
            if (minutes < 60) {
                setClosuresBadgeText(t('roadClosures.refreshBadgeMinutes', { count: minutes }));
                return;
            }
            const hours = Math.ceil(minutes / 60);
            setClosuresBadgeText(t('roadClosures.refreshBadgeHours', { count: hours }));
        };

        tick();
        const interval = window.setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [showRoadClosures, lastFetched, t]);

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
            <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[1000] flex flex-col items-end gap-2">
                {showRoadClosures && closuresBadgeText && (
                    <div className="badge badge-info gap-1 shadow text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        {closuresBadgeText}
                    </div>
                )}
            </div>
        </div>
    );
}
