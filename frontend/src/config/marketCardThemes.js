/** Rotating accent themes (matches reference market cards grid). */
export const MARKET_CARD_THEMES = [
  {
    id: 'green',
    border: 'rgba(34, 197, 94, 0.32)',
    accent: 'rgba(74, 222, 128, 0.75)',
    glow: 'rgba(34, 197, 94, 0.12)',
    placeholder: 'linear-gradient(135deg, #0f2918 0%, #14532d 50%, #052e16 100%)',
  },
  {
    id: 'red',
    border: 'rgba(239, 68, 68, 0.32)',
    accent: 'rgba(248, 113, 113, 0.75)',
    glow: 'rgba(239, 68, 68, 0.12)',
    placeholder: 'linear-gradient(135deg, #2a0f0f 0%, #7f1d1d 50%, #1a0505 100%)',
  },
  {
    id: 'gold',
    border: 'rgba(234, 179, 8, 0.32)',
    accent: 'rgba(250, 204, 21, 0.75)',
    glow: 'rgba(234, 179, 8, 0.12)',
    placeholder: 'linear-gradient(135deg, #2a2208 0%, #854d0e 50%, #1a1505 100%)',
  },
  {
    id: 'blue',
    border: 'rgba(59, 130, 246, 0.32)',
    accent: 'rgba(96, 165, 250, 0.75)',
    glow: 'rgba(59, 130, 246, 0.12)',
    placeholder: 'linear-gradient(135deg, #0f1729 0%, #1e3a8a 50%, #0c1222 100%)',
  },
  {
    id: 'purple',
    border: 'rgba(168, 85, 247, 0.32)',
    accent: 'rgba(192, 132, 252, 0.75)',
    glow: 'rgba(168, 85, 247, 0.12)',
    placeholder: 'linear-gradient(135deg, #1a0f29 0%, #6b21a8 50%, #12051a 100%)',
  },
];

export const getMarketCardTheme = (index) => MARKET_CARD_THEMES[index % MARKET_CARD_THEMES.length];

/** Slug for image file: markets/milan-morning.jpg — replace when you add real images. */
export const toMarketImageSlug = (name) =>
  (name || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export { getMarketImagePath as getMarketImageUrl } from './marketImages';
