import {
  Bike,
  Building2,
  Car,
  LocateFixed,
  MessageSquare,
  Train,
  TramFront,
  X,
} from 'lucide-react';
import { type ReactNode, useState, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { useNavigationStore } from '../../stores/navigationStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { trackEvent } from '../../utils/analytics';
import { SpiderActionRow } from './SpiderActionRow';
import { SpiderRouteList } from './SpiderRouteList';

const ROUTE_COUNT = 5;
const ACTIONS_BASE_DELAY = ROUTE_COUNT * 50 + 100;
const DIVIDER_DELAY = ROUTE_COUNT * 50;

const routeIcons: Record<string, ReactNode> = {
  '/': <TramFront className="w-5 h-5 sm:w-6 sm:h-6" />,
  '/city': <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />,
  '/cycling': <Bike className="w-5 h-5 sm:w-6 sm:h-6" />,
  '/driving': <Car className="w-5 h-5 sm:w-6 sm:h-6" />,
  '/train': <Train className="w-5 h-5 sm:w-6 sm:h-6" />,
};

/** Icon color for the hub button — matches each route's accent color */
const routeIconColors: Record<string, string> = {
  '/': 'text-primary',
  '/city': 'text-purple-500',
  '/cycling': 'text-success',
  '/driving': 'text-orange-500',
  '/train': 'text-red-500',
};

export function SpiderMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [, startTransition] = useTransition();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const { appMode, setOnboardingCompleted, setOnboardingStep } = useSettingsStore();
  const { isTracking, locating, onLocateClick } = useNavigationStore();

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  const isHeaderMode =
    (location.pathname === '/' && appMode === 'list') || location.pathname === '/settings';

  /** Same footprint as hub trigger (locate + menu buttons align) */
  const triggerSizeClass = isHeaderMode
    ? 'w-8 h-8 min-h-8'
    : 'w-10 h-10 min-h-10 sm:w-14 sm:h-14 sm:min-h-14';

  const currentIcon = routeIcons[location.pathname] ?? routeIcons['/'];
  const currentIconColor = routeIconColors[location.pathname] ?? 'text-white';

  const handleHelp = () => {
    const variant =
      location.pathname === '/'
        ? appMode === 'list'
          ? 'list'
          : 'transit'
        : location.pathname.substring(1);
    setOnboardingStep(0);
    setOnboardingCompleted(variant, false);
    closeMenu();
  };

  const handleSettings = () => {
    startTransition(() => navigate('/settings'));
    closeMenu();
  };

  const handleFeedback = () => {
    trackEvent('feedback_opened', { source: 'spider_menu' });
    startTransition(() => navigate('/feedback'));
    closeMenu();
  };

  return (
    <>
      {isOpen && (
        <div
          aria-hidden
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1999] cursor-pointer"
          onClick={closeMenu}
        />
      )}

      {/* Top-right: locate + hub */}
      <div
        className={`fixed ${isHeaderMode ? 'top-[10px] right-2' : 'top-2 right-2 sm:top-4 sm:right-4'} z-[2000] flex flex-col items-end pointer-events-none`}
      >
        <div
          className={`pointer-events-auto flex flex-col items-end ${isOpen ? 'gap-3' : 'gap-0'}`}
        >
          {/* Locate + Hub row */}
          <div className="flex items-center gap-2">
            {!isOpen && onLocateClick && (
              <button
                className={`btn btn-circle p-0 min-h-0 ${triggerSizeClass} ${isTracking ? 'btn-gps-active' : 'btn-gps-inactive'} shadow-2xl transition-all duration-300 ring-2 ring-white/5`}
                disabled={locating}
                onClick={onLocateClick}
                title={
                  isTracking ? t('spiderMenu.actions.stopTracking') : t('spiderMenu.actions.locate')
                }
              >
                {locating ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <LocateFixed className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </button>
            )}

            {/* Hub button — neutral glass, colored icon */}
            <button
              className={`relative flex items-center justify-center ${triggerSizeClass} rounded-full shadow-2xl transition-all duration-300 ease-in-out border border-white/20 active:scale-95 backdrop-blur-xl bg-neutral/90 hover:bg-neutral`}
              onClick={toggleMenu}
            >
              <div
                className={`absolute transition-all duration-300 ${isOpen ? 'rotate-180 scale-0 opacity-0' : `rotate-0 scale-100 opacity-100 ${currentIconColor}`}`}
              >
                {currentIcon}
              </div>
              <div
                className={`absolute text-white transition-all duration-300 ${isOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-180 scale-0 opacity-0'}`}
              >
                <X className="w-6 h-6" />
              </div>
            </button>
          </div>

          {/* Menu content */}
          {isOpen && (
            <div
              className="flex flex-col items-end gap-3 pointer-events-auto w-fit"
              onClick={() => {
                closeMenu();
              }}
            >
              <SpiderRouteList />

              <div
                className="h-px w-12 bg-white/20 my-1 mr-2 animate-spider-reveal"
                style={{ animationDelay: `${DIVIDER_DELAY}ms` }}
              />

              <SpiderActionRow
                animationBaseDelay={ACTIONS_BASE_DELAY}
                onHelp={handleHelp}
                onSettings={handleSettings}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom-right: feedback (visible when menu is open) */}
      {isOpen && (
        <div
          className="fixed right-3 sm:right-4 z-[2001] animate-spider-reveal pointer-events-auto"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.875rem)' }}
        >
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral/90 text-neutral-content shadow-lg border border-white/10 hover:bg-neutral hover:scale-105 transition-all duration-300 backdrop-blur-xl"
            onClick={handleFeedback}
            type="button"
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[10px] font-black tracking-widest uppercase whitespace-nowrap">
              {t('spiderMenu.actions.feedback')}
            </span>
          </button>
        </div>
      )}
    </>
  );
}
