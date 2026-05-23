/** Base language code from i18n (e.g. en-GB → en). */
export function normalizeLanguageCode(code) {
  if (!code || typeof code !== 'string') return 'en';
  return code.split('-')[0].toLowerCase();
}
