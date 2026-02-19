import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from './locales/en.json';
import hiTranslations from './locales/hi.json';
import mrTranslations from './locales/mr.json';
import guTranslations from './locales/gu.json';
import taTranslations from './locales/ta.json';
import teTranslations from './locales/te.json';
import bnTranslations from './locales/bn.json';
import knTranslations from './locales/kn.json';
import mlTranslations from './locales/ml.json';
import paTranslations from './locales/pa.json';

const resources = {
  en: { translation: enTranslations },
  hi: { translation: hiTranslations },
  mr: { translation: mrTranslations },
  gu: { translation: guTranslations },
  ta: { translation: taTranslations },
  te: { translation: teTranslations },
  bn: { translation: bnTranslations },
  kn: { translation: knTranslations },
  ml: { translation: mlTranslations },
  pa: { translation: paTranslations },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'mr', 'gu', 'ta', 'te', 'bn', 'kn', 'ml', 'pa'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
