import { Moon, Sun } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { getCurrentLanguage, setLanguage } from '../../i18n';
import { useSettingsStore } from '../../stores/settingsStore';

// ─── Static config ─────────────────────────────────────────────────────────────

const LANGUAGES = [
  ['hr', 'Hrvatski'],
  ['en', 'English'],
  ['de', 'Deutsch'],
] as const;

interface SectionData {
  bodyKey: string;
  buttonKey?: string;
  id: string;
  titleKey: string;
}

const SECTIONS: SectionData[] = [
  {
    bodyKey: 'onboarding.welcomeBody',
    buttonKey: 'common.next',
    id: 'welcome',
    titleKey: 'onboarding.welcomeTitle',
  },
  {
    bodyKey: 'onboarding.heroBullet0',
    buttonKey: 'common.next',
    id: 'transit',
    titleKey: 'onboarding.transitTitle0',
  },
  {
    bodyKey: 'onboarding.modeSwitchBody',
    buttonKey: 'common.enterApp',
    id: 'modes',
    titleKey: 'onboarding.modeSwitchTitle',
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

export function GlobalWelcomeWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const globalOnboardingCompleted = useSettingsStore((s) => s.globalOnboardingCompleted);
  const setGlobalOnboardingCompleted = useSettingsStore((s) => s.setGlobalOnboardingCompleted);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const currentLang = getCurrentLanguage();

  if (globalOnboardingCompleted) return null;

  const handleClose = () => {
    setGlobalOnboardingCompleted(true);
    navigate('/');
  };

  const handleScrollToNext = (index: number) => {
    if (index === SECTIONS.length - 1) {
      handleClose();
    } else {
      const nextSection = document.getElementById(`section-${index + 1}`);
      if (nextSection) {
        nextSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const pillButtonClasses =
    'rounded-full px-8 py-3.5 bg-base-content text-base-100 font-semibold shadow-sm hover:scale-105 active:scale-95 transition-transform duration-300 inline-flex items-center justify-center text-sm sm:text-base cursor-pointer';

  return (
    <div className="fixed inset-0 z-[9999] bg-base-100 overflow-y-auto scroll-smooth">
      {/* ── Fixed Header Controls ── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 pt-6 pb-4 bg-gradient-to-b from-base-100 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Language Picker */}
          <div
            aria-label={t('settings.languageTitle')}
            className="inline-flex rounded-full bg-base-200/50 p-1 backdrop-blur-md"
            role="group"
          >
            {LANGUAGES.map(([lng, label]) => (
              <button
                aria-label={label}
                aria-pressed={currentLang === lng}
                className={[
                  'flex h-8 items-center justify-center rounded-full px-4 text-xs font-bold transition-all duration-200',
                  currentLang === lng
                    ? 'bg-base-100 text-base-content shadow-sm'
                    : 'text-base-content/50 hover:text-base-content',
                ].join(' ')}
                key={lng}
                onClick={() => setLanguage(lng)}
                type="button"
              >
                {lng.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Theme Toggle */}
          <button
            aria-label={t('onboarding.themeTitle')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-base-200/50 text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors backdrop-blur-md"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            type="button"
          >
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>

        {/* Skip Button */}
        <button
          className="text-sm font-bold text-base-content/40 hover:text-base-content transition-colors px-2 py-2 pointer-events-auto"
          onClick={handleClose}
          type="button"
        >
          {t('common.close', 'Skip')}
        </button>
      </div>

      {/* ── Scrollable Sections ── */}
      <div className="flex flex-col">
        {SECTIONS.map((section, index) => (
          <section
            className="min-h-[100svh] flex flex-col justify-center items-center px-6 py-24 relative"
            id={`section-${index}`}
            key={section.id}
          >
            <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
              {/* Headline */}
              <ScrollReveal delay={0}>
                <h2 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tighter text-center text-base-content leading-tight">
                  {t(section.titleKey)}
                </h2>
              </ScrollReveal>

              {/* Copy */}
              <ScrollReveal delay={200}>
                <p className="mt-6 text-lg sm:text-xl lg:text-2xl text-base-content/60 text-center max-w-2xl font-medium tracking-tight leading-relaxed">
                  {t(section.bodyKey)}
                </p>
              </ScrollReveal>

              {/* CTA Button */}
              <ScrollReveal className="mt-10 mb-16 sm:mb-20" delay={400}>
                <button
                  className={pillButtonClasses}
                  onClick={() => handleScrollToNext(index)}
                  type="button"
                >
                  {t(section.buttonKey || 'common.next', 'Continue')}
                </button>
              </ScrollReveal>

              {/* Mockup */}
              <ScrollReveal className="w-full" delay={600}>
                <DeviceMockup id={section.id} />
              </ScrollReveal>
            </div>
          </section>
        ))}
      </div>

      {/* Bottom padding for the last section so the user can scroll past it slightly if they want to admire it */}
      <div className="h-[10vh] bg-base-100" />
    </div>
  );
}

/**
 * A clean, CSS-only Android device mockup placeholder with soft shadows.
 * This is designed to look extremely premium and minimal.
 */
function DeviceMockup({ id }: { id: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[340px] aspect-[9/19.5] rounded-[2.5rem] sm:rounded-[3rem] border-[8px] sm:border-[12px] border-base-200 bg-base-100 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden">
      {/* Front camera punch hole */}
      <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-base-300 z-10" />

      {/* Screen Placeholder Content */}
      <div className="flex-1 bg-base-200/30 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mb-6 rounded-2xl sm:rounded-3xl bg-base-300/50" />
        <div className="text-sm sm:text-base font-semibold text-base-content/40 uppercase tracking-widest mb-3">
          {id}
        </div>
        <div className="text-xs sm:text-sm text-base-content/30 leading-relaxed px-2">
          Screenshot from theapplaunchpad will appear here.
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

function ScrollReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, we can disconnect if we only want it to animate once.
          // Apple usually only animates once per scroll down.
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`transition-all duration-1000 ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      } ${className}`}
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
