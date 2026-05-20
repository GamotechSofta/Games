import { toMarketImageSlug } from './marketCardThemes';

/**
 * Market name (slug) → background image filename in /public/images/markets/
 * Aliases match API market names (e.g. "Puna Bazar" → puna-bazar).
 */
export const MARKET_IMAGE_FILES = {
  'milan-morning': 'milan-morning.png',
  'rajdhani-morning': 'rajdhani-morning.png',
  'shridevi': 'shridevi.png',
  'milan-day': 'milan-day.png',
  'puna-bazar': 'puna-bazar.png',
  'puna-bazaar': 'puna-bazar.png',
  'kalyan': 'kalyan.png',
  'radha-night': 'radha-night.png',
  'shridevi-night': 'shridevi-night.png',
  'milan-night': 'milan-night.png',
  'bombay-day': 'bombay-day.png',
  'kalyan-night': 'kalyan-night.png',
  'bombay-night': 'bombay-night.png',
  'time-bazar': 'time-bazar.png',
  'prabhat': 'prabhat.png',
  'shakti-day': 'shakti-day.png',
  'kalyan-morning': 'kalyan-morning.png',
  'rajdhani-night': 'rajdhani-night.png',
  'madhur-day': 'madhur-day.png',
  'madhur-night': 'madhur-night.png',
  'main-bazar': 'main-bazar.png',
  'main-bazaar': 'main-bazar.png',
  'ratan-khatri': 'ratan-khatri.png',
  'dhanlaxmi': 'dhanlaxmi.png',
};

export const getMarketImagePath = (marketName) => {
  const slug = toMarketImageSlug(marketName);
  if (!slug) return null;
  const file = MARKET_IMAGE_FILES[slug];
  if (file) return `/images/markets/${file}`;
  return `/images/markets/${slug}.png`;
};
