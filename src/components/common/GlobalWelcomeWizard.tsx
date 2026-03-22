import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Sun, Moon, Layers, X, Map } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';

export function GlobalWelcomeWizard() {
  const { t, i18n } = useTranslation();
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
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-base-300"></div>
          {step === 0 && <Globe className="w-24 h-24 text-primary relative z-10" />}
          {step === 1 && <Sun className="w-24 h-24 text-primary relative z-10" />}
          {step === 2 && <Layers className="w-24 h-24 text-primary relative z-10" />}
        </div>

        {step > 0 && (
          <button
            onClick={handleClose}
            className="btn btn-sm btn-circle absolute left-2 top-2 bg-base-100/80 hover:bg-base-200 border-none shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="p-6 flex-1 flex flex-col justify-between">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {step === 0 && <Map className="w-6 h-6 text-primary" />}
              {step === 1 && <Moon className="w-6 h-6 text-primary" />}
              {step === 2 && <Layers className="w-6 h-6 text-primary" />}
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
            <div className="flex flex-col gap-2 mb-6">
              <button
                className={`btn ${i18n.language === 'hr' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => changeLang('hr')}
              >
                Hrvatski
              </button>
              <button
                className={`btn ${i18n.language === 'en' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => changeLang('en')}
              >
                English
              </button>
              <button
                className={`btn ${i18n.language === 'de' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => changeLang('de')}
              >
                Deutsch
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-2 mb-6">
              <button
                className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setTheme('light')}
              >
                Light
              </button>
              <button
                className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setTheme('dark')}
              >
                Dark
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="w-full flex justify-center mb-6 max-h-48 sm:max-h-64 overflow-hidden rounded-xl bg-base-300">
               <video
                 src={import.meta.env.BASE_URL + 'onboarding/switch_views.webm'}
                 muted
                 autoPlay
                 loop
                 playsInline
                 className="w-full h-full object-contain"
               />
            </div>
          )}

          <div className="flex items-center gap-2 justify-center mb-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-primary' : 'w-2 bg-base-300'
                  }`}
              />
            ))}
          </div>

          <div className="flex justify-between gap-3">
            {step === 0 ? (
               <button onClick={handleClose} className="btn btn-outline flex-1">
                 {t('common.close')}
               </button>
            ) : (
              <button onClick={back} className="btn btn-outline flex-1">
                {t('common.back')}
              </button>
            )}
            
            <button onClick={next} className="btn btn-primary flex-1">
              {step < 2 ? t('common.next') : t('common.done')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
