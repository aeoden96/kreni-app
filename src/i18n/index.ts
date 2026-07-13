import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de';
import en from './locales/en';
import hr from './locales/hr';

export type SupportedLanguage = 'de' | 'en' | 'hr';

const STORAGE_KEY = 'language';
const FALLBACK: SupportedLanguage = 'hr';

function detectLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (isSupportedLanguage(stored)) return stored;

  const browserLang = navigator.language.slice(0, 2).toLowerCase();
  if (isSupportedLanguage(browserLang)) return browserLang;

  return FALLBACK;
}

function isSupportedLanguage(value: null | string): value is SupportedLanguage {
  return value === 'hr' || value === 'en' || value === 'de';
}

const detectedLanguage = detectLanguage();
document.documentElement.lang = detectedLanguage;

i18n.use(initReactI18next).init({
  fallbackLng: FALLBACK,
  interpolation: { escapeValue: false },
  lng: detectedLanguage,
  resources: { de, en, hr },
});

export function getCurrentLanguage(): SupportedLanguage {
  const lng = i18n.language?.slice(0, 2).toLowerCase() ?? '';
  return isSupportedLanguage(lng) ? lng : FALLBACK;
}

export function setLanguage(lang: SupportedLanguage): void {
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  void i18n.changeLanguage(lang);
}

export default i18n;
