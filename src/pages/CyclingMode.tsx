import { useState, useEffect } from 'react';
import { BaseMap } from '../components/Map/BaseMap';
import { BikeStations } from '../components/Map/BikeStations';
import { BikeParkings } from '../components/Map/BikeParkings';
import { BikePaths } from '../components/Map/BikePaths';
import { useNextbikeData } from '../hooks/useNextbikeData';
import { OnboardingWizard } from '../components/common/OnboardingWizard';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSettingsStore } from '../stores/settingsStore';

export function CyclingMode() {
    const { userLocation } = useGeolocation();
    const [legendOpen, setLegendOpen] = useState(false);

    const showBikeStations = useSettingsStore(s => s.showBikeStations);
    const showBikeParkings = useSettingsStore(s => s.showBikeParkings);
    const showBikePaths = useSettingsStore(s => s.showBikePaths);

    const { lastFetched } = useNextbikeData(showBikeStations);

    const [timeAgoStr, setTimeAgoStr] = useState<string>('');

    useEffect(() => {
        if (!lastFetched) {
            setTimeAgoStr('');
            return;
        }

        const updateTimeAgo = () => {
            const seconds = Math.floor((Date.now() - lastFetched) / 1000);
            if (seconds < 60) {
                setTimeAgoStr(`${seconds} s`);
            } else {
                setTimeAgoStr(`${Math.floor(seconds / 60)}m ${seconds % 60} s`);
            }
        };

        updateTimeAgo();
        const interval = setInterval(updateTimeAgo, 1000);
        return () => clearInterval(interval);
    }, [lastFetched]);

    return (
        <div className="h-full w-full relative">
            <BaseMap userLocation={userLocation}>
                <BikeStations show={showBikeStations} />
                <BikeParkings show={showBikeParkings} />
                <BikePaths show={showBikePaths} />
            </BaseMap>

            {/* Map Controls */}
            <OnboardingWizard variant="cycling" />
            <div className="absolute bottom-6 right-4 z-[1000] flex flex-col items-end gap-2">
                {showBikePaths && legendOpen && (
                    <div className="bg-base-100 rounded-xl shadow-xl border border-base-200 p-3 w-64 text-xs space-y-2 mb-2">
                        <p className="font-semibold text-base-content mb-1">Legenda Biciklističkih Staza</p>

                        <div className="flex items-center gap-2">
                            <div className="w-5 h-1 bg-[#eab308]"></div>
                            <span className="text-base-content/80">Pješačko-biciklistička staza</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-1 bg-[#84cc16] border-b-2 border-dashed border-base-100"></div>
                            <span className="text-base-content/80">Nasip (Makadam)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-1 bg-[#22d3ee]"></div>
                            <span className="text-base-content/80">Biciklistička traka</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-1 bg-[#a855f7]"></div>
                            <span className="text-base-content/80">Cesta mješovitog prometa</span>
                        </div>
                    </div>
                )}

                {showBikePaths && (
                    <button
                        className="badge badge-warning gap-1 shadow cursor-pointer hover:badge-outline transition-all"
                        onClick={() => setLegendOpen((o) => !o)}
                    >
                        Legenda Staza
                    </button>
                )}

                {showBikeStations && timeAgoStr && (
                    <div className="badge badge-info gap-1 shadow">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                        Podaci osvježeni prije {timeAgoStr}
                    </div>
                )}
            </div>
        </div>
    );
}
