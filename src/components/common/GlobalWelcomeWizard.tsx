import { Globe, Layers, Map, Moon, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import wizardBanner from '../../../docs/readme-assets/banner.png';
import { useSettingsStore } from '../../stores/settingsStore';

export function GlobalWelcomeWizard() {
  const { i18n, t } = useTranslation();
  const globalOnboardingCompleted = useSettingsStore((s) => s.globalOnboardingCompleted);
  const setGlobalOnboardingCompleted = useSettingsStore((s) => s.setGlobalOnboardingCompleted);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const [step, setStep] = useState(0);

  if (globalOnboardingCompleted) return null;

  const handleClose = () => {
    setGlobalOnboardingCompleted(true);
  };

  const next = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const back = () => {
    setStep(Math.max(step - 1, 0));
  };

  const changeLang = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="modal modal-open z-[9999] backdrop-blur-sm">
      <div className="modal-box max-w-md p-0 overflow-y-auto overflow-x-hidden max-h-[90svh] relative flex flex-col">
        <div className="w-full h-32 sm:h-48 bg-base-200 relative flex items-center justify-center overflow-hidden shrink-0">
          <div aria-hidden className="pointer-events-none absolute -inset-3">
            <img
              alt=""
              className="h-full w-full object-cover blur-[3px] brightness-[0.85] contrast-[1.05] sm:blur-[4px]"
              decoding="async"
              src={wizardBanner}
            />
          </div>
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-base-200/75 via-base-200/15 to-transparent
              dark:from-base-200/85 dark:via-base-100/10 dark:to-transparent"
          />
          {step === 0 && (
            <Globe className="relative z-10 h-24 w-24 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]" />
          )}
          {step === 1 && (
            <Sun className="relative z-10 h-24 w-24 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]" />
          )}
          {step === 2 && (
            <Layers className="relative z-10 h-24 w-24 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]" />
          )}
        </div>

        {step > 0 && (
          <button
            className="btn btn-sm btn-circle absolute left-2 top-2 border-none bg-base-100/90 text-base-content shadow-sm hover:bg-base-200"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="p-6 flex-1 flex flex-col justify-between">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-base-300/80 flex items-center justify-center shrink-0">
              {step === 0 && <Map className="w-6 h-6 text-base-content/80" />}
              {step === 1 && <Moon className="w-6 h-6 text-base-content/80" />}
              {step === 2 && <Layers className="w-6 h-6 text-base-content/80" />}
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">
                {step === 0 && t('onboarding.welcomeTitle')}
                {step === 1 && t('onboarding.themeTitle')}
                {step === 2 && t('onboarding.navTitle')}
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                {step === 0 && t('onboarding.welcomeBody')}
                {step === 1 && t('onboarding.themeBody')}
                {step === 2 && t('onboarding.navBody')}
              </p>
            </div>
          </div>

          {step === 0 && (
            <div className="mb-6 flex flex-col gap-2">
              <button
                className={`btn border-base-content/35 ${
                  i18n.language === 'hr'
                    ? 'border-transparent bg-base-content text-base-100 hover:brightness-110'
                    : 'btn-outline bg-transparent text-base-content hover:bg-base-200 dark:hover:bg-base-300'
                }`}
                onClick={() => changeLang('hr')}
              >
                Hrvatski
              </button>
              <button
                className={`btn border-base-content/35 ${
                  i18n.language === 'en'
                    ? 'border-transparent bg-base-content text-base-100 hover:brightness-110'
                    : 'btn-outline bg-transparent text-base-content hover:bg-base-200 dark:hover:bg-base-300'
                }`}
                onClick={() => changeLang('en')}
              >
                English
              </button>
              <button
                className={`btn border-base-content/35 ${
                  i18n.language === 'de'
                    ? 'border-transparent bg-base-content text-base-100 hover:brightness-110'
                    : 'btn-outline bg-transparent text-base-content hover:bg-base-200 dark:hover:bg-base-300'
                }`}
                onClick={() => changeLang('de')}
              >
                Deutsch
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="mb-6 flex flex-col gap-2">
              <button
                className={`btn border-base-content/35 ${
                  theme === 'light'
                    ? 'border-transparent bg-base-content text-base-100 hover:brightness-110'
                    : 'btn-outline bg-transparent text-base-content hover:bg-base-200 dark:hover:bg-base-300'
                }`}
                onClick={() => setTheme('light')}
              >
                Light
              </button>
              <button
                className={`btn border-base-content/35 ${
                  theme === 'dark'
                    ? 'border-transparent bg-base-content text-base-100 hover:brightness-110'
                    : 'btn-outline bg-transparent text-base-content hover:bg-base-200 dark:hover:bg-base-300'
                }`}
                onClick={() => setTheme('dark')}
              >
                Dark
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="w-full flex justify-center mb-6 max-h-48 sm:max-h-64 overflow-hidden rounded-xl bg-base-300">
              <video
                autoPlay
                className="w-full h-full object-contain"
                loop
                muted
                playsInline
                src={import.meta.env.BASE_URL + 'onboarding/switch_views.webm'}
              />
            </div>
          )}

          <div className="flex items-center gap-2 justify-center mb-6">
            {[0, 1, 2].map((i) => (
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-8 bg-base-content/70' : 'w-2 bg-base-300'
                }`}
                key={i}
              />
            ))}
          </div>

          <div className="flex justify-between gap-3">
            {step === 0 ? (
              <button
                className="btn btn-outline flex-1 border-base-content/35 bg-transparent text-base-content hover:bg-base-200 dark:hover:bg-base-300"
                onClick={handleClose}
              >
                {t('common.close')}
              </button>
            ) : (
              <button
                className="btn btn-outline flex-1 border-base-content/35 bg-transparent text-base-content hover:bg-base-200 dark:hover:bg-base-300"
                onClick={back}
              >
                {t('common.back')}
              </button>
            )}

            <button
              className="btn flex-1 border-0 text-white shadow-md hover:opacity-95"
              onClick={next}
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {step < 2 ? t('common.next') : t('common.done')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
