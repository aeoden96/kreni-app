import {
  ArrowRight,
  Bike,
  Building2,
  Car,
  Github,
  Map,
  Moon,
  Play,
  Sun,
  Train,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { getCurrentLanguage, setLanguage, type SupportedLanguage } from '../../i18n';
import { useSettingsStore } from '../../stores/settingsStore';

// ─── Static config ─────────────────────────────────────────────────────────────

interface ModeItem {
  bodyKey: string;
  icon: React.ComponentType<{ className?: string }>;
  key: string;
  path: string;
  titleKey: string;
}

/**
 * Extend this array to add more quick-start destinations.
 */
const MODES: ModeItem[] = [
  {
    bodyKey: 'onboarding.featureTransitBody',
    icon: Map,
    key: 'transit-map',
    path: '/',
    titleKey: 'onboarding.featureTransitTitle',
  },
  {
    bodyKey: 'onboarding.cyclingBody0',
    icon: Bike,
    key: 'cycling',
    path: '/cycling',
    titleKey: 'onboarding.cyclingTitle0',
  },
  {
    bodyKey: 'onboarding.drivingBody0',
    icon: Car,
    key: 'driving',
    path: '/driving',
    titleKey: 'onboarding.drivingTitle0',
  },
  {
    bodyKey: 'onboarding.cityBody0',
    icon: Building2,
    key: 'city',
    path: '/city',
    titleKey: 'onboarding.cityTitle0',
  },
  {
    bodyKey: 'onboarding.trainBody0',
    icon: Train,
    key: 'train',
    path: '/train',
    titleKey: 'onboarding.trainTitle0',
  },
];

const LANGUAGES = [
  ['hr', 'Hrvatski'],
  ['en', 'English'],
  ['de', 'Deutsch'],
] as const;

/**
 * Feature video carousel.
 * Add more entries here as you record new demo clips.
 * `src` is relative to BASE_URL (e.g. "onboarding/cycling.webm").
 * Leave `src` undefined to show a "coming soon" placeholder.
 */
interface FeatureVideo {
  descKey: string;
  id: string;
  src?: string;
  titleKey: string;
}

const FEATURE_VIDEOS: FeatureVideo[] = [
  {
    descKey: 'onboarding.transitBody0',
    id: 'transit',
    src: 'onboarding/switch_views.webm',
    titleKey: 'onboarding.transitTitle0',
  },
  {
    descKey: 'onboarding.transitBody1',
    id: 'stop',
    src: 'onboarding/station_view.webm',
    titleKey: 'onboarding.transitTitle1',
  },
  {
    descKey: 'onboarding.transitBody2',
    id: 'picker',
    src: 'onboarding/spider_selector.webm',
    titleKey: 'onboarding.transitTitle2',
  },
];

// ─── Sub-component: feature video player ──────────────────────────────────────

export function GlobalWelcomeWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const globalOnboardingCompleted = useSettingsStore((s) => s.globalOnboardingCompleted);
  const setGlobalOnboardingCompleted = useSettingsStore((s) => s.setGlobalOnboardingCompleted);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const currentLang = getCurrentLanguage();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const update = () => setPrefersReducedMotion(Boolean(mq.matches));
    update();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  if (globalOnboardingCompleted) return null;

  const handleClose = () => setGlobalOnboardingCompleted(true);

  const handleQuickStart = (path: string) => {
    setGlobalOnboardingCompleted(true);
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-9999 overflow-y-auto bg-linear-to-br from-info/20 via-sky-500/8 to-indigo-600/[0.14] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {/* Backdrop */}
      <div aria-hidden className="fixed inset-0 bg-base-content/40" onClick={handleClose} />

      <div className="relative min-h-svh flex items-start sm:items-center justify-center p-3 sm:p-6  ">
        <div
          aria-labelledby="global-welcome-title"
          aria-modal="true"
          className={[
            'relative w-full max-w-5xl rounded-3xl overflow-hidden',
            'border border-base-content/8',
            'bg-base-100',
            'shadow-[0_32px_80px_-8px_rgba(0,0,0,0.22),0_0_0_1px_rgba(255,255,255,0.03)]',
          ].join(' ')}
          role="dialog"
        >
          {/* Top accent line */}
          <div
            aria-hidden
            className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-info/70 to-transparent"
          />

          {/* Ambient orbs */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -left-20 w-[480px] h-[480px] rounded-full bg-info/[0.06] blur-3xl" />
            <div className="absolute -top-20 right-10   w-[320px] h-[320px] rounded-full bg-blue-500/[0.05] blur-3xl" />
          </div>

          {/* ══════════════════════════════════════════════════════════════════
           *  HERO
           * ══════════════════════════════════════════════════════════════════ */}
          <div className="relative px-6 sm:px-8 lg:px-10 pt-8 sm:pt-10 pb-7">
            {/* Close */}
            <button
              aria-label={t('common.close')}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 btn btn-ghost btn-circle btn-sm opacity-50 hover:opacity-100 transition-opacity"
              onClick={handleClose}
              type="button"
            >
              <X size={18} />
            </button>

            {/* Top: OSS badge + language & theme */}
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 pr-10 sm:pr-12">
              <div className="inline-flex w-fit items-center rounded-full border border-base-content/12 bg-base-200/40 px-3 py-1 text-xs font-semibold text-base-content/80 tracking-wide">
                {t('onboarding.heroBadge', 'Besplatno i open source')}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="welcome-wizard-language">
                  {t('settings.languageTitle')}
                </label>
                <select
                  className={[
                    'h-8 min-h-8 max-w-44 cursor-pointer rounded-xl border border-base-content/12',
                    'bg-base-100 px-2.5 text-xs font-medium text-base-content',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-info/45',
                  ].join(' ')}
                  id="welcome-wizard-language"
                  onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                  value={currentLang}
                >
                  {LANGUAGES.map(([lng, label]) => (
                    <option key={lng} value={lng}>
                      {label}
                    </option>
                  ))}
                </select>

                <div
                  aria-label={t('onboarding.themeTitle')}
                  className="inline-flex rounded-xl border border-base-content/12 bg-base-200/30 p-px"
                  role="group"
                >
                  {(
                    [
                      { icon: Sun, label: t('onboarding.themeLight', 'Svijetlo'), value: 'light' },
                      { icon: Moon, label: t('onboarding.themeDark', 'Tamno'), value: 'dark' },
                    ] as const
                  ).map(({ icon: Icon, label, value }) => (
                    <button
                      aria-label={label}
                      aria-pressed={theme === value}
                      className={[
                        'flex h-7 w-8 items-center justify-center rounded-[10px] transition-colors',
                        theme === value
                          ? 'bg-info text-info-content shadow-sm'
                          : 'text-base-content/45 hover:bg-base-200/80 hover:text-base-content/80',
                      ].join(' ')}
                      key={value}
                      onClick={() => setTheme(value)}
                      title={label}
                      type="button"
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Headline */}
            <h2
              className="mt-4 text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight leading-[1.08] text-base-content max-w-2xl"
              id="global-welcome-title"
            >
              {t('onboarding.welcomeTitle', 'Dobrodošli u Kreni')}
            </h2>

            {/* Sub-headline */}
            <p className="mt-3 text-sm sm:text-base text-base-content/60 leading-relaxed max-w-xl">
              {t(
                'onboarding.welcomeBody',
                'Vaš vodič uživo za zagrebački javni prijevoz, biciklizam i gradske usluge.'
              )}
            </p>

            {/* Bullets — plain text list, not chips */}
            <ul className="mt-3 space-y-1.5">
              {[
                t('onboarding.heroBullet0', 'Prati javni prijevoz uživo — brzo i jednostavno.'),
                t(
                  'onboarding.heroBullet1',
                  'Prebaci se između načina: prijevoz, biciklizam, auto, gradski sadržaj.'
                ),
                t(
                  'onboarding.heroBullet2',
                  'Spremi favorite i imaj nedavne stanice/linije pri ruci.'
                ),
              ].map((bullet) => (
                <li
                  className="flex items-start gap-2.5 text-sm text-base-content/60 leading-snug"
                  key={bullet}
                >
                  <span className="mt-[0.35em] h-1.5 w-1.5 shrink-0 rounded-full bg-info/60" />
                  {bullet}
                </li>
              ))}
            </ul>

            {/* CTAs — no Personalize button here; that panel lives in the sidebar */}
            <div className="mt-6 flex flex-wrap gap-2.5">
              <button
                className="btn btn-info min-h-11 px-5 font-semibold shadow-lg shadow-info/20 hover:shadow-xl hover:shadow-info/25 transition-shadow"
                onClick={handleClose}
                type="button"
              >
                {t('common.enterApp', 'Kreni')}
                <ArrowRight className="h-4 w-4" />
              </button>

              <a
                className="btn btn-ghost min-h-11 border border-base-content/10 hover:border-base-content/20 transition-colors"
                href="https://github.com/aeoden96/kreni-app"
                rel="noreferrer"
                target="_blank"
              >
                <Github className="h-4 w-4" />
                {t('onboarding.githubCta', 'GitHub')}
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-6 sm:mx-8 lg:mx-10 h-px bg-gradient-to-r from-transparent via-base-content/8 to-transparent" />

          {/* ══════════════════════════════════════════════════════════════════
           *  BODY GRID
           * ══════════════════════════════════════════════════════════════════ */}
          <div className="relative px-6 sm:px-8 lg:px-10 py-6 grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,360px)] gap-5 items-start">
            {/* ── Left: mode cards ── */}
            <div className="min-w-0 space-y-5">
              {/* Jump-in label */}
              <div>
                <h3 className="text-sm font-bold text-base-content">
                  {t('onboarding.tourTitle', 'Brzi pregled')}
                </h3>
                <p className="text-xs text-base-content/50 mt-0.5">
                  {t(
                    'onboarding.tourBody',
                    'Odaberi način rada i kreni. Kasnije se možeš uvijek prebaciti.'
                  )}
                </p>
              </div>

              {/* Bento mode cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MODES.map(({ bodyKey, icon: Icon, key, path, titleKey }) => (
                  <button
                    className="group text-left rounded-2xl border border-base-content/8 bg-base-200/25 p-4
                               hover:bg-info/5 hover:border-info/25 hover:shadow-sm
                               transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/50"
                    key={key}
                    onClick={() => handleQuickStart(path)}
                    type="button"
                  >
                    <div className="h-8 w-8 rounded-xl bg-info/10 flex items-center justify-center mb-3 group-hover:bg-info/18 transition-colors">
                      <Icon className="h-4 w-4 text-info" />
                    </div>
                    <div className="text-xs font-semibold text-base-content leading-snug">
                      {t(titleKey)}
                    </div>
                    <p className="mt-1 text-[11px] text-base-content/50 leading-relaxed line-clamp-2">
                      {t(bodyKey)}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Right: feature video showcase ── */}
            <div className="min-w-0 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-base-content">
                  {t('onboarding.featureShowcaseTitle', 'Kako radi')}
                </h3>
                <p className="text-xs text-base-content/50 mt-0.5">
                  {t('onboarding.featureShowcaseBody', 'Ukratki video pregled nekoliko značajki.')}
                </p>
              </div>
              <FeatureShowcase prefersReducedMotion={prefersReducedMotion} />
            </div>
          </div>

          {/* Bottom accent */}
          <div
            aria-hidden
            className="h-px bg-gradient-to-r from-transparent via-base-content/6 to-transparent"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

function FeatureShowcase({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const [hasError, setHasError] = useState<Record<number, boolean>>({});
  const videoRef = useRef<HTMLVideoElement>(null);

  const feature = FEATURE_VIDEOS[active];

  // Restart video when tab changes.
  useEffect(() => {
    videoRef.current?.load();
  }, [active]);

  const showVideo = feature.src && !prefersReducedMotion && !hasError[active];

  return (
    <div className="rounded-2xl border border-base-content/8 bg-base-200/25 overflow-hidden">
      {/* Tab strip */}
      <div className="flex overflow-x-auto overflow-y-hidden scrollbar-none border-b border-base-content/6 px-3 pt-3 gap-1">
        {FEATURE_VIDEOS.map((f, i) => (
          <button
            className={[
              'shrink-0 rounded-t-xl px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap',
              i === active
                ? 'bg-base-100 border border-b-base-100 border-base-content/8 text-base-content -mb-px'
                : 'text-base-content/50 hover:text-base-content/80 hover:bg-base-200/50',
            ].join(' ')}
            key={f.id}
            onClick={() => setActive(i)}
            type="button"
          >
            {t(f.titleKey)}
          </button>
        ))}
      </div>

      {/* Video / placeholder */}
      <div className="bg-base-200/30">
        {showVideo ? (
          <video
            autoPlay
            className="w-full h-auto max-h-[340px] object-contain"
            key={feature.src} /* force remount on src change */
            loop
            muted
            onError={() => setHasError((e) => ({ ...e, [active]: true }))}
            playsInline
            preload="metadata"
            ref={videoRef}
            src={import.meta.env.BASE_URL + feature.src}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-14">
            <div className="h-10 w-10 rounded-2xl bg-base-content/6 flex items-center justify-center">
              <Play className="h-4 w-4 text-base-content/25" />
            </div>
            <span className="text-xs text-base-content/35 font-medium">
              {prefersReducedMotion && feature.src
                ? t('onboarding.previewPausedReducedMotion', 'Preview paused (reduced motion)')
                : t('onboarding.previewUnavailable', 'Preview unavailable')}
            </span>
          </div>
        )}
      </div>

      {/* Active feature description */}
      <div className="px-4 py-3 border-t border-base-content/6">
        <p className="text-xs text-base-content/55 leading-relaxed">{t(feature.descKey)}</p>
      </div>
    </div>
  );
}
