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
import { hapticImpact } from '../../utils/haptics';
import { shareCurrentView } from '../../utils/share';
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

/**
 * Icon color for the hub button — matches each route's accent color.
 * These sit on a near-black `bg-neutral` pill, so every entry has to be a light
 * enough shade to read against it. `text-primary` (daisyUI's dark-theme indigo)
 * was not, hence the explicit blue for transit — the same hue as trams on the map.
 */
const routeIconColors: Record<string, string> = {
  '/': 'text-blue-400',
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

  const { setOnboardingCompleted, setOnboardingStep } = useSettingsStore();
  const { isTracking, locating, onLocateClick } = useNavigationStore();

  const [linkCopied, setLinkCopied] = useState(false);

  const toggleMenu = () => {
    hapticImpact('light');
    setIsOpen((prev) => !prev);
  };
  const closeMenu = () => setIsOpen(false);

  const isHeaderMode = location.pathname === '/settings';

  /**
   * Same footprint as hub trigger (locate + menu buttons align), and the same on
   * every route: the settings header used to shrink these to 32px, which made the
   * controls a different size depending on where you were.
   */
  const triggerSizeClass = 'w-10 h-10 min-h-10 sm:w-14 sm:h-14 sm:min-h-14';

  const currentIcon = routeIcons[location.pathname] ?? routeIcons['/'];
  const currentIconColor = routeIconColors[location.pathname] ?? 'text-white';

  const handleHelp = () => {
    const variant = location.pathname === '/' ? 'transit' : location.pathname.substring(1);
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

  const handleShare = () => {
    trackEvent('share_opened', { source: 'spider_menu' });
    void shareCurrentView(t('app.title'), t('spiderMenu.share.text')).then((result) => {
      // The clipboard fallback (desktop web) has no native UI, so confirm inline.
      if (result === 'copied') {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    });
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
        className={`fixed ${isHeaderMode ? 'top-[max(10px,env(safe-area-inset-top))] right-[max(0.5rem,env(safe-area-inset-right))]' : 'top-[max(0.5rem,env(safe-area-inset-top))] right-[max(0.5rem,env(safe-area-inset-right))] sm:top-[max(1rem,env(safe-area-inset-top))] sm:right-[max(1rem,env(safe-area-inset-right))]'} z-[2000] flex flex-col items-end pointer-events-none`}
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
                onClick={() => {
                  hapticImpact('medium');
                  onLocateClick();
                }}
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

            {/* Hub button — same `btn-gps-inactive` shade as the locate button it
                sits next to (bg-neutral/90 read as flat black beside it, most
                obviously against the light settings header). */}
            <button
              className={`relative flex items-center justify-center ${triggerSizeClass} btn-gps-inactive rounded-full shadow-2xl transition-all duration-300 ease-in-out active:scale-95`}
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
                onShare={handleShare}
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral/90 text-neutral-content shadow-lg border border-white/10 hover:bg-neutral hover:scale-105 transition-all duration-300"
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

      {/* Transient "link copied" confirmation (web clipboard fallback only). */}
      {linkCopied && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[2100] rounded-full bg-neutral/95 text-neutral-content shadow-2xl border border-white/10 px-4 py-2 text-xs font-semibold animate-[modal-fade-in_0.2s_ease-out] pointer-events-none"
          role="status"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
        >
          {t('spiderMenu.share.copied')}
        </div>
      )}
    </>
  );
}
