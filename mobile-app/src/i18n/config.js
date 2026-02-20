import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { storage } from '../utils/storage';

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

const LANGUAGE_KEY = 'i18nextLng';

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: 'en',
  supportedLngs: ['en', 'hi', 'mr', 'gu', 'ta', 'te', 'bn', 'kn', 'ml', 'pa'],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

// Persist language choice (load on init)
storage.getItem(LANGUAGE_KEY).then((lng) => {
  if (lng && resources[lng]) i18n.changeLanguage(lng);
});

i18n.on('languageChanged', (lng) => {
  storage.setItem(LANGUAGE_KEY, lng);
});

export default i18n;
