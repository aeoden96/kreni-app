import { useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useSettingsStore } from '../../stores/settingsStore';

type Props = {
  animationDelay?: number;
  routePath: string;
};

// Mirrors the NavLink glass style, just at pill scale.
const pillBase =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-black tracking-widest ' +
  'transition-all duration-300 whitespace-nowrap ' +
  'backdrop-blur-md border border-white/10 bg-neutral/90 shadow-md';

// Active: ring matches each route's accent — passed in via `activeRingClass`.
const pillActive = (ringClass: string) =>
  `${ringClass} ring-offset-1 ring-offset-neutral/90 ring-2 scale-105 text-white`;

const pillInactive = 'text-white/50 hover:text-white/80 hover:bg-neutral';

const filterBarWrapper = 'ml-2 pl-3 animate-spider-reveal';

// Each route's accent ring colour — mirrors SpiderRouteList's activeRing values.
const ringByPath: Record<string, string> = {
  '/': 'ring-primary',
  '/city': 'ring-purple-500',
  '/cycling': 'ring-green-500', // ring-success if you have it in Tailwind config
  '/driving': 'ring-orange-500',
  '/train': 'ring-red-500',
};

type FilterBarWrapperProps = {
  animationDelay: number;
  children: React.ReactNode;
};

type FilterPillProps = {
  active: boolean;
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  ringClass: string;
};

export function SpiderFilterBar({ animationDelay = 0, routePath }: Props) {
  const { pathname } = useLocation();
  const [, startTransition] = useTransition();
  const { t } = useTranslation();

  const {
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

  const ringClass = ringByPath[routePath] ?? 'ring-primary';

  // ── /city ──────────────────────────────────────────────────────────────────
  if (routePath === '/city') {
    return (
      <FilterBarWrapper animationDelay={animationDelay}>
        {[
          { active: showFreeWifi, label: t('spiderMenu.toggles.freeWifi'), set: setShowFreeWifi },
          {
            active: showPublicFountains,
            label: t('spiderMenu.toggles.fountains'),
            set: setShowPublicFountains,
          },
          {
            active: showStudentRestaurants,
            label: t('spiderMenu.toggles.studentRestaurants'),
            set: setShowStudentRestaurants,
          },
          {
            active: showPedestrianZones,
            label: t('spiderMenu.toggles.pedestrianZones'),
            set: setShowPedestrianZones,
          },
        ].map(({ active, label, set }) => (
          <FilterPill
            active={active}
            key={label}
            label={label}
            onClick={() => startTransition(() => set(!active))}
            ringClass={ringClass}
          />
        ))}
      </FilterBarWrapper>
    );
  }

  // ── /cycling ───────────────────────────────────────────────────────────────
  if (routePath === '/cycling') {
    return (
      <FilterBarWrapper animationDelay={animationDelay}>
        {[
          {
            active: showBikePaths,
            label: t('spiderMenu.toggles.bikePaths'),
            set: setShowBikePaths,
          },
          {
            active: showBikeStations,
            label: t('spiderMenu.toggles.bikeStations'),
            set: setShowBikeStations,
          },
          {
            active: showBikeParkings,
            label: t('spiderMenu.toggles.bikeParkings'),
            set: setShowBikeParkings,
          },
        ].map(({ active, label, set }) => (
          <FilterPill
            active={active}
            key={label}
            label={label}
            onClick={() => startTransition(() => set(!active))}
            ringClass={ringClass}
          />
        ))}
      </FilterBarWrapper>
    );
  }

  // ── /driving ───────────────────────────────────────────────────────────────
  if (routePath === '/driving') {
    return (
      <FilterBarWrapper animationDelay={animationDelay}>
        {[
          {
            active: showParkingZones,
            label: t('spiderMenu.toggles.zones'),
            set: setShowParkingZones,
          },
          {
            active: showPublicGarages,
            label: t('spiderMenu.toggles.garages'),
            set: setShowPublicGarages,
          },
          {
            active: showElectricCharging,
            label: t('spiderMenu.toggles.ev'),
            set: setShowElectricCharging,
          },
        ].map(({ active, label, set }) => (
          <FilterPill
            active={active}
            key={label}
            label={label}
            onClick={() => startTransition(() => set(!active))}
            ringClass={ringClass}
          />
        ))}
      </FilterBarWrapper>
    );
  }

  return null;
}

function FilterBarWrapper({ animationDelay, children }: FilterBarWrapperProps) {
  return (
    <div className={`${filterBarWrapper} py-2`} style={{ animationDelay: `${animationDelay}ms` }}>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function FilterPill({ active, icon, label, onClick, ringClass }: FilterPillProps) {
  return (
    <button
      className={`${pillBase} ${active ? pillActive(ringClass) : pillInactive}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {icon}
      {label}
    </button>
  );
}
