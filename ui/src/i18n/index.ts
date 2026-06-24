import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en.json';
import ar from './locales/ar.json';

const resources = {
  en: {
    translation: en,
  },
  ar: {
    translation: ar,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    // Set initial direction based on detected language
    react: {
      useSuspense: false,
    },
  });

// Initialize direction on app start
const currentLanguage = i18n.language || 'en';
const isRTL = currentLanguage === 'ar';
document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
document.documentElement.lang = currentLanguage;

export default i18n; 