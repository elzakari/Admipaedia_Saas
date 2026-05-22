import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr', 'ee'],
    debug: process.env.NODE_ENV === 'development',
    saveMissing: false,
    parseMissingKeyHandler: (key: string, defaultValue?: string): string => {
      if (defaultValue) return defaultValue;
      const parts = key.split('.');
      const lastPart = parts[parts.length - 1] || key;
      return lastPart
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    },
    
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      queryStringParams: {
        v: process.env.NODE_ENV === 'development' ? String(Date.now()) : '1'
      }
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    
    react: {
      useSuspense: true,
    }
  });

export default i18n;
