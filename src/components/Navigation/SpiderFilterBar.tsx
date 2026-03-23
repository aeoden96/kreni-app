import { List, Map } from 'lucide-react';
import { useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useSettingsStore } from '../../stores/settingsStore';
import { trackEvent } from '../../utils/analytics';

type Props = {
  animationDelay?: number;
  /** The route path this filter bar belongs to — renders nothing if it doesn't match the current path. */
  routePath: string;
};

const pillBase =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all duration-300 whitespace-nowrap';
const pillActive = 'bg-primary text-white shadow-lg scale-105';
const pillInactive = 'text-white/40 hover:text-white/60 hover:bg-white/5';

export function SpiderFilterBar({ animationDelay = 0, routePath }: Props) {
  const { pathname } = useLocation();
  const [, startTransition] = useTransition();
  const { t } = useTranslation();

  const {
    appMode,
    setAppMode,
    setShowBikeParkings,
    setShowBikePaths,
    setShowBikeStations,
    setShowElectricCharging,
    setShowFreeWifi,
    setShowParkingZones,
    setShowPedestrianZones,
    setShowPublicFountains,
    setShowPublicGarages,
    setShowStudentRestaurants,
    showBikeParkings,
    showBikePaths,
    showBikeStations,
    showElectricCharging,
    showFreeWifi,
    showParkingZones,
    showPedestrianZones,
    showPublicFountains,
    showPublicGarages,
    showStudentRestaurants,
  } = useSettingsStore();

  if (pathname !== routePath) return null;

  if (routePath === '/') {
    return (
      <PillContainer animationDelay={animationDelay}>
        <button
          className={`${pillBase} ${appMode === 'map' ? pillActive : pillInactive}`}
          onClick={(e) => {
            e.stopPropagation();
            trackEvent('view_toggled', { view: 'map' });
            startTransition(() => setAppMode('map'));
          }}
        >
          <Map className="w-3 h-3" />
          {t('spiderMenu.toggles.map').toUpperCase()}
        </button>
        <button
          className={`${pillBase} ${appMode === 'list' ? pillActive : pillInactive}`}
          onClick={(e) => {
            e.stopPropagation();
            trackEvent('view_toggled', { view: 'list' });
            startTransition(() => setAppMode('list'));
          }}
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
          className={`${pillBase} ${showPublicGarages ? pillActive : pillInactive}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowPublicGarages(!showPublicGarages);
          }}
        >
          {t('spiderMenu.toggles.garages').toUpperCase()}
        </button>
        <button
          className={`${pillBase} ${showElectricCharging ? pillActive : pillInactive}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowElectricCharging(!showElectricCharging);
          }}
        >
          {t('spiderMenu.toggles.ev').toUpperCase()}
        </button>
        <button
          className={`${pillBase} ${showParkingZones ? pillActive : pillInactive}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowParkingZones(!showParkingZones);
          }}
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
          className={`${pillBase} ${showBikeStations ? pillActive : pillInactive}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowBikeStations(!showBikeStations);
          }}
        >
          {t('spiderMenu.toggles.bikeStations').toUpperCase()}
        </button>
        <button
          className={`${pillBase} ${showBikeParkings ? pillActive : pillInactive}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowBikeParkings(!showBikeParkings);
          }}
        >
          {t('spiderMenu.toggles.bikeParkings').toUpperCase()}
        </button>
        <button
          className={`${pillBase} ${showBikePaths ? pillActive : pillInactive}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowBikePaths(!showBikePaths);
          }}
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
          className={`${pillBase} ${showStudentRestaurants ? pillActive : pillInactive}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowStudentRestaurants(!showStudentRestaurants);
          }}
        >
          {t('spiderMenu.toggles.studentRestaurants').toUpperCase()}
        </button>
        <button
          className={`${pillBase} ${showPublicFountains ? pillActive : pillInactive}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowPublicFountains(!showPublicFountains);
          }}
        >
          {t('spiderMenu.toggles.fountains').toUpperCase()}
        </button>
        <button
          className={`${pillBase} ${showPedestrianZones ? pillActive : pillInactive}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowPedestrianZones(!showPedestrianZones);
          }}
        >
          {t('spiderMenu.toggles.pedestrianZones').toUpperCase()}
        </button>
        <button
          className={`${pillBase} ${showFreeWifi ? pillActive : pillInactive}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowFreeWifi(!showFreeWifi);
          }}
        >
          {t('spiderMenu.toggles.freeWifi').toUpperCase()}
        </button>
      </PillContainer>
    );
  }

  return null;
}

function PillContainer({
  animationDelay,
  children,
}: {
  animationDelay: number;
  children: React.ReactNode;
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
