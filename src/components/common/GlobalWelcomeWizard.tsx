import { Bike, Building2, Car, Moon, Sun, TramFront } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { getCurrentLanguage, setLanguage } from '../../i18n';
import { useSettingsStore } from '../../stores/settingsStore';

// ─── Static config ─────────────────────────────────────────────────────────────

const LANGUAGES = [
  ['hr', 'HR'],
  ['en', 'EN'],
  ['de', 'DE'],
] as const;

/** The four ways to get around, shown as an iOS-style feature list. */
const FEATURES = [
  {
    bodyKey: 'onboarding.transitBody0',
    icon: TramFront,
    tint: 'transit',
    titleKey: 'onboarding.transitTitle0',
  },
  {
    bodyKey: 'onboarding.cyclingBody0',
    icon: Bike,
    tint: 'cycling',
    titleKey: 'onboarding.cyclingTitle0',
  },
  {
    bodyKey: 'onboarding.drivingBody0',
    icon: Car,
    tint: 'driving',
    titleKey: 'onboarding.drivingTitle0',
  },
  {
    bodyKey: 'onboarding.cityBody0',
    icon: Building2,
    tint: 'city',
    titleKey: 'onboarding.cityTitle0',
  },
] as const;

// Static class strings (so Tailwind keeps them in the build).
const TINTS: Record<string, string> = {
  city: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  cycling: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  driving: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  transit: 'bg-[#2337ff]/10 text-[#2337ff] dark:text-[#8ea0ff]',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function GlobalWelcomeWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const globalOnboardingCompleted = useSettingsStore((s) => s.globalOnboardingCompleted);
  const setGlobalOnboardingCompleted = useSettingsStore((s) => s.setGlobalOnboardingCompleted);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const currentLang = getCurrentLanguage();

  const finish = () => {
    setGlobalOnboardingCompleted(true);
    navigate('/');
  };

  // Esc skips the whole flow.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (globalOnboardingCompleted) return null;

  return (
    <div
      aria-label={t('onboarding.welcomeTitle')}
      aria-modal="true"
      className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain bg-base-100 text-base-content"
      role="dialog"
    >
      {/* ── Floating header: language · theme · skip ── */}
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:px-8">
        <div className="flex items-center gap-2">
          <div
            aria-label={t('settings.languageTitle')}
            className="inline-flex rounded-full bg-base-100/60 p-0.5 shadow-sm backdrop-blur"
            role="group"
          >
            {LANGUAGES.map(([lng, label]) => (
              <button
                aria-label={label}
                aria-pressed={currentLang === lng}
                className={[
                  'flex h-8 min-w-9 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors',
                  currentLang === lng
                    ? 'bg-base-content text-base-100'
                    : 'text-base-content/60 hover:text-base-content',
                ].join(' ')}
                key={lng}
                onClick={() => setLanguage(lng)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <button
            aria-label={t('onboarding.themeTitle')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-base-100/60 text-base-content/70 shadow-sm backdrop-blur transition-colors hover:text-base-content"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            type="button"
          >
            {theme === 'dark' ? (
              <Moon className="h-[18px] w-[18px]" />
            ) : (
              <Sun className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>

        <button
          className="rounded-full bg-base-100/60 px-3 py-2 text-sm font-medium text-base-content/70 shadow-sm backdrop-blur transition-colors hover:text-base-content"
          onClick={finish}
          type="button"
        >
          {t('onboarding.skip', 'Skip')}
        </button>
      </header>

      <VideoHero onEnter={finish} theme={theme} />
      <ShowcaseSection theme={theme} />
      <FeaturesSection />
      <ModesSection onEnter={finish} />
    </div>
  );
}

function FeaturesSection() {
  const { t } = useTranslation();
  return (
    <section className="px-6 py-24 sm:py-36">
      <div className="mx-auto w-full max-w-3xl">
        <Reveal>
          <h2 className="text-balance text-center text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {t('onboarding.featuresTitle', 'Four ways to get around')}
          </h2>
        </Reveal>
        <div className="mt-16 grid w-full grid-cols-1 gap-x-12 gap-y-12 text-left sm:grid-cols-2">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal className="w-full" delay={i * 90} key={f.titleKey}>
                <div className="flex flex-col gap-3.5">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${TINTS[f.tint]}`}
                  >
                    <Icon className="h-7 w-7" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-lg font-semibold leading-snug">{t(f.titleKey)}</p>
                    <p className="mt-1.5 text-base leading-relaxed text-base-content/55">
                      {t(f.bodyKey)}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Closing section: switch-anytime message + the final "Enter app" call to action. */
function ModesSection({ onEnter }: { onEnter: () => void }) {
  const { t } = useTranslation();
  return (
    <section className="bg-base-200/40 px-6 py-28 pb-[max(7rem,env(safe-area-inset-bottom))] sm:py-40">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
        <Reveal>
          <ModeSwitcherVisual />
        </Reveal>
        <Reveal delay={120}>
          <h2 className="mt-10 text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {t('onboarding.modeSwitchTitle')}
          </h2>
        </Reveal>
        <Reveal delay={200}>
          <p className="mt-4 text-balance text-lg leading-relaxed text-base-content/55">
            {t('onboarding.modeSwitchBody')}
          </p>
        </Reveal>
        <Reveal delay={280}>
          <button
            className="mt-12 h-12 rounded-full bg-[#2337ff] px-10 text-base font-semibold text-white shadow-[0_10px_30px_-10px_rgba(35,55,255,0.6)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] motion-reduce:transition-none"
            onClick={onEnter}
            type="button"
          >
            {t('common.enterApp')}
          </button>
          <p className="mt-4 text-sm text-base-content/45">
            {t('onboarding.welcomeFooterNote', 'No sign-in required')}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

/** Four mode tiles with transit highlighted — evokes switching modes anytime. */
function ModeSwitcherVisual() {
  const modes = [
    { active: true, icon: TramFront },
    { active: false, icon: Bike },
    { active: false, icon: Car },
    { active: false, icon: Building2 },
  ];
  return (
    <div className="flex items-center justify-center gap-3.5">
      {modes.map(({ active, icon: Icon }, i) => (
        <div
          className={[
            'flex h-16 w-16 items-center justify-center rounded-2xl transition-colors',
            active
              ? 'bg-[#2337ff] text-white shadow-[0_10px_24px_-8px_rgba(35,55,255,0.6)]'
              : 'bg-base-200 text-base-content/40',
          ].join(' ')}
          key={i}
        >
          <Icon className="h-7 w-7" strokeWidth={2} />
        </div>
      ))}
    </div>
  );
}

// ─── Sections ──────────────────────────────────────────────────────────────────

/** A big device mockup that slides + scales in, then floats gently, with a glow. */
function PhoneShot({ alt, reverse, src }: { alt: string; reverse: boolean; src: string }) {
  const reduced = usePrefersReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>();
  const visible = inView || reduced;
  return (
    <div
      className="relative w-[260px] shrink-0 sm:w-[320px] lg:w-[380px]"
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : `translateX(${reverse ? 48 : -48}px) scale(0.94)`,
        transition: reduced
          ? undefined
          : 'opacity .85s cubic-bezier(.16,1,.3,1), transform .85s cubic-bezier(.16,1,.3,1)',
      }}
    >
      {/* soft brand glow behind the device */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 blur-3xl"
        style={{
          background: 'radial-gradient(58% 50% at 50% 45%, rgba(35,55,255,0.30), transparent 70%)',
        }}
      />
      <div className="relative">
        <div className="overflow-hidden rounded-[1.8rem] border-[9px] border-base-300 bg-base-300 shadow-[0_16px_36px_-24px_rgba(0,0,0,0.4)]">
          <img
            alt={alt}
            className="block aspect-[1082/2399] w-full object-cover"
            decoding="async"
            loading="lazy"
            src={src}
          />
        </div>
      </div>
    </div>
  );
}

/** Fades + rises its children the first time they scroll into view. */
function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>();
  const visible = inView || reduced;
  return (
    <div
      className={className}
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible || reduced ? 'none' : 'translateY(22px)',
        transition: reduced
          ? undefined
          : 'opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Alternating device-framed product shots (theme-matched screenshots). */
function ShowcaseSection({ theme }: { theme: 'dark' | 'light' }) {
  const { t } = useTranslation();
  const s = theme === 'dark' ? 'dark' : 'light';
  const shots = [
    {
      bodyKey: 'onboarding.transitBody0',
      ext: 'webp',
      img: 'vehicle-view-mobile',
      note: '',
      titleKey: 'onboarding.transitTitle0',
    },
    {
      bodyKey: 'onboarding.transitBody1',
      ext: 'webp',
      img: 'stop-view-mobile',
      note: 'onboarding.transitNote1',
      titleKey: 'onboarding.transitTitle1',
    },
    {
      bodyKey: 'onboarding.transitBody3',
      ext: 'png',
      img: 'plan-journey-mobile',
      note: '',
      titleKey: 'onboarding.transitTitle3',
    },
  ] as const;

  return (
    <section className="overflow-hidden bg-base-200/40 px-6 py-24 sm:py-36">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-28 sm:gap-40">
        {shots.map((shot, i) => (
          <div
            className={[
              'flex flex-col items-center gap-12 sm:gap-20',
              i % 2 === 1 ? 'sm:flex-row-reverse' : 'sm:flex-row',
            ].join(' ')}
            key={shot.img}
          >
            <PhoneShot
              alt={t(shot.titleKey)}
              reverse={i % 2 === 1}
              src={`/onboarding_new/${s}-${shot.img}.${shot.ext}`}
            />
            <div className="flex-1 text-center sm:text-left">
              <Reveal>
                <h3 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                  {t(shot.titleKey)}
                </h3>
                <p className="mx-auto mt-4 max-w-md text-balance text-lg leading-relaxed text-base-content/55 sm:mx-0">
                  {t(shot.bodyKey)}
                </p>
                {shot.note && (
                  <p className="mx-auto mt-3 max-w-md text-balance text-sm leading-relaxed text-base-content/40 sm:mx-0">
                    {t(shot.note)}
                  </p>
                )}
              </Reveal>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Sets its flag true the first time the element scrolls into view. */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

/**
 * Full-bleed live-map hero. Theme-matched, de-paused seamless loop (transcoded
 * from the ZET live map). Bottom-up scrim + text-shadow keep the copy legible
 * over the moving vehicles without washing the whole frame.
 */
function VideoHero({ onEnter, theme }: { onEnter: () => void; theme: 'dark' | 'light' }) {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  const ctaRef = useRef<HTMLButtonElement>(null);
  const s = theme === 'dark' ? 'dark' : 'light';
  const tint = theme === 'dark' ? '0,0,0' : '255,255,255';

  useEffect(() => {
    ctaRef.current?.focus();
  }, []);

  return (
    <section className="relative flex h-svh min-h-[560px] w-full items-center justify-center overflow-hidden">
      <video
        aria-hidden
        autoPlay={!reduced}
        className="absolute inset-0 h-full w-full object-cover"
        key={s}
        loop
        muted
        playsInline
        poster={`/onboarding_new/hero-${s}-poster.jpg`}
      >
        <source src={`/onboarding_new/hero-${s}.webm`} type="video/webm" />
        <source src={`/onboarding_new/hero-${s}.mp4`} type="video/mp4" />
      </video>

      {/* bottom-up scrim only — top & middle of the video stay clean */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(0deg, rgba(${tint},0.52) 0%, rgba(${tint},0.20) 12%, rgba(${tint},0) 34%)`,
        }}
      />

      <div className="relative z-[2] flex max-w-[860px] flex-col items-center px-6 text-center">
        <h1
          className="text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl md:text-7xl"
          style={{ textShadow: `0 1px 1px rgba(${tint},0.85), 0 2px 14px rgba(${tint},0.7)` }}
        >
          {t('onboarding.welcomeTitle')}
        </h1>

        <button
          className="mt-9 h-12 rounded-full bg-base-content px-8 text-base font-semibold text-base-100 shadow-lg transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98] motion-reduce:transition-none"
          onClick={onEnter}
          ref={ctaRef}
          type="button"
        >
          {t('common.enterApp')}
        </button>
      </div>

      {/* scroll cue */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex justify-center"
      >
        <span className="text-sm text-base-content/60 motion-safe:animate-bounce">↓</span>
      </div>
    </section>
  );
}
