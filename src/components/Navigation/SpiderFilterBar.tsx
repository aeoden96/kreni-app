import { useTransition } from 'react';
import { Map, List } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import { trackEvent } from '../../utils/analytics';

type Props = {
    /** The route path this filter bar belongs to — renders nothing if it doesn't match the current path. */
    routePath: string;
    animationDelay?: number;
};

const pillBase =
    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all duration-300 whitespace-nowrap';
const pillActive = 'bg-primary text-white shadow-lg scale-105';
const pillInactive = 'text-white/40 hover:text-white/60 hover:bg-white/5';

function PillContainer({
    children,
    animationDelay,
}: {
    children: React.ReactNode;
    animationDelay: number;
}) {
    return (
        <div
            className="flex p-0.5 bg-neutral/90 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl animate-spider-reveal overflow-hidden max-w-[calc(100vw-6rem)]"
            style={{ animationDelay: `${animationDelay}ms` }}
        >
            {children}
        </div>
    );
}

export function SpiderFilterBar({ routePath, animationDelay = 0 }: Props) {
    const { pathname } = useLocation();
    const [, startTransition] = useTransition();
    const { t } = useTranslation();

    const {
        appMode,
        setAppMode,
        showBikeStations,
        setShowBikeStations,
        showBikeParkings,
        setShowBikeParkings,
        showBikePaths,
        setShowBikePaths,
        showRoadClosures,
        setShowRoadClosures,
        showPublicGarages,
        setShowPublicGarages,
        showElectricCharging,
        setShowElectricCharging,
        showParkingZones,
        setShowParkingZones,
        showStudentRestaurants,
        setShowStudentRestaurants,
        showPublicFountains,
        setShowPublicFountains,
        showPedestrianZones,
        setShowPedestrianZones,
        showFreeWifi,
        setShowFreeWifi,
    } = useSettingsStore();

    if (pathname !== routePath) return null;

    if (routePath === '/') {
        return (
            <PillContainer animationDelay={animationDelay}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        trackEvent('view_toggled', { view: 'map' });
                        startTransition(() => setAppMode('map'));
                    }}
                    className={`${pillBase} ${appMode === 'map' ? pillActive : pillInactive}`}
                >
                    <Map className="w-3 h-3" />
                    {t('spiderMenu.toggles.map').toUpperCase()}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        trackEvent('view_toggled', { view: 'list' });
                        startTransition(() => setAppMode('list'));
                    }}
                    className={`${pillBase} ${appMode === 'list' ? pillActive : pillInactive}`}
                >
                    <List className="w-3 h-3" />
                    {t('spiderMenu.toggles.list').toUpperCase()}
                </button>
            </PillContainer>
        );
    }

    if (routePath === '/driving') {
        return (
            <PillContainer animationDelay={animationDelay}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowRoadClosures(!showRoadClosures);
                    }}
                    className={`${pillBase} ${showRoadClosures ? pillActive : pillInactive}`}
                >
                    {t('spiderMenu.toggles.closures').toUpperCase()}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowPublicGarages(!showPublicGarages);
                    }}
                    className={`${pillBase} ${showPublicGarages ? pillActive : pillInactive}`}
                >
                    {t('spiderMenu.toggles.garages').toUpperCase()}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowElectricCharging(!showElectricCharging);
                    }}
                    className={`${pillBase} ${showElectricCharging ? pillActive : pillInactive}`}
                >
                    {t('spiderMenu.toggles.ev').toUpperCase()}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowParkingZones(!showParkingZones);
                    }}
                    className={`${pillBase} ${showParkingZones ? pillActive : pillInactive}`}
                >
                    {t('spiderMenu.toggles.zones').toUpperCase()}
                </button>
            </PillContainer>
        );
    }

    if (routePath === '/cycling') {
        return (
            <PillContainer animationDelay={animationDelay}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowBikeStations(!showBikeStations);
                    }}
                    className={`${pillBase} ${showBikeStations ? pillActive : pillInactive}`}
                >
                    {t('spiderMenu.toggles.bikeStations').toUpperCase()}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowBikeParkings(!showBikeParkings);
                    }}
                    className={`${pillBase} ${showBikeParkings ? pillActive : pillInactive}`}
                >
                    {t('spiderMenu.toggles.bikeParkings').toUpperCase()}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowBikePaths(!showBikePaths);
                    }}
                    className={`${pillBase} ${showBikePaths ? pillActive : pillInactive}`}
                >
                    {t('spiderMenu.toggles.bikePaths').toUpperCase()}
                </button>
            </PillContainer>
        );
    }

    if (routePath === '/city') {
        return (
            <PillContainer animationDelay={animationDelay}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowStudentRestaurants(!showStudentRestaurants);
                    }}
                    className={`${pillBase} ${showStudentRestaurants ? pillActive : pillInactive}`}
                >
                    {t('spiderMenu.toggles.studentRestaurants').toUpperCase()}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowPublicFountains(!showPublicFountains);
                    }}
                    className={`${pillBase} ${showPublicFountains ? pillActive : pillInactive}`}
                >
                    {t('spiderMenu.toggles.fountains').toUpperCase()}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowPedestrianZones(!showPedestrianZones);
                    }}
                    className={`${pillBase} ${showPedestrianZones ? pillActive : pillInactive}`}
                >
                    {t('spiderMenu.toggles.pedestrianZones').toUpperCase()}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowFreeWifi(!showFreeWifi);
                    }}
                    className={`${pillBase} ${showFreeWifi ? pillActive : pillInactive}`}
                >
                    {t('spiderMenu.toggles.freeWifi').toUpperCase()}
                </button>
            </PillContainer>
        );
    }

    return null;
}
