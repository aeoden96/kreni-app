import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import hr from './locales/hr';
import en from './locales/en';
import de from './locales/de';

export type SupportedLanguage = 'hr' | 'en' | 'de';

const STORAGE_KEY = 'language';
const FALLBACK: SupportedLanguage = 'hr';

function isSupportedLanguage(value: string | null): value is SupportedLanguage {
  return value === 'hr' || value === 'en' || value === 'de';
}

function detectLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (isSupportedLanguage(stored)) return stored;

  const browserLang = navigator.language.slice(0, 2).toLowerCase();
  if (isSupportedLanguage(browserLang)) return browserLang;

  return FALLBACK;
}

const detectedLanguage = detectLanguage();
document.documentElement.lang = detectedLanguage;

i18n
  .use(initReactI18next)
  .init({
    resources: { hr, en, de },
    lng: detectedLanguage,
    fallbackLng: FALLBACK,
    interpolation: { escapeValue: false },
  });

export function setLanguage(lang: SupportedLanguage): void {
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  void i18n.changeLanguage(lang);
}

export function getCurrentLanguage(): SupportedLanguage {
  const lng = i18n.language?.slice(0, 2).toLowerCase() ?? '';
  return isSupportedLanguage(lng) ? lng : FALLBACK;
}

export default i18n;
