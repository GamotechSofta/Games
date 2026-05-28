import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from './locales/en.json';

/** Load non-English locales on demand (saves ~400KB+ on first paint). */
const localeLoaders = {
  hi: () => import('./locales/hi.json'),
  mr: () => import('./locales/mr.json'),
  gu: () => import('./locales/gu.json'),
  ta: () => import('./locales/ta.json'),
  te: () => import('./locales/te.json'),
  bn: () => import('./locales/bn.json'),
  kn: () => import('./locales/kn.json'),
  ml: () => import('./locales/ml.json'),
  pa: () => import('./locales/pa.json'),
};

const loadedLocales = new Set(['en']);

export async function ensureLocaleLoaded(lng) {
  const code = (lng || 'en').split('-')[0].toLowerCase();
  if (code === 'en' || loadedLocales.has(code)) return;
  const loader = localeLoaders[code];
  if (!loader) return;
  const mod = await loader();
  const bundle = mod.default ?? mod;
  i18n.addResourceBundle(code, 'translation', bundle, true, true);
  loadedLocales.add(code);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
    },
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
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },
  });

export default i18n;
