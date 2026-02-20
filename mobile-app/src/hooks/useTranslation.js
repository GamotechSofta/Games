import { useCallback, useSyncExternalStore } from 'react';
import i18n from '../i18n/config';

function subscribe(callback) {
  i18n.on('languageChanged', callback);
  return () => i18n.off('languageChanged', callback);
}

function getSnapshot() {
  return i18n.language || 'en';
}

/**
 * Local useTranslation that uses our i18n instance directly.
 * Use this instead of react-i18next's useTranslation to avoid "Property 'useTranslation' doesn't exist" in RN/Hermes.
 */
export function useTranslation(ns) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const t = useCallback(
    (key, options) => {
      return i18n.t(key, { ns: ns || 'translation', ...options });
    },
    [lang, ns]
  );
  return { t, i18n, ready: !!i18n.isInitialized };
}
