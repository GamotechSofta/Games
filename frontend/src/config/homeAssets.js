/** Static home / shared public assets (WebP primary, PNG fallback for older browsers). */
const home = (name) => ({
  webp: `/images/home/${name}.webp`,
  png: `/images/home/${name}.png`,
});

export const HOME_QUICK_LINKS = {
  casino: home('casino-card'),
  markets: home('markets-card'),
  starline: home('starline-card'),
  kingBazaar: home('king-bazaar-card'),
};

/** King Bazaar home category card background (full-bleed inside gold frame). */
export const KING_BAZAAR_BUTTON_BG = '/images/home/king-bazaar-button-bg.png';

/** King Bazaar circular icon on home category card. */
export const KING_BAZAAR_ICON = '/images/home/king-bazaar-icon.png';

export const POPULAR_MARKET_CARD = {
  closed: home('popular-markets-table'),
  open: home('popular-markets-table-open'),
};

export const LOGO = { webp: '/aakdaLogo.webp', png: '/aakdaLogo.png' };
export const FAVICON = { webp: '/favIcon.webp', png: '/favIcon.png' };

/** Prefer WebP; PNG kept as fallback in public/. */
export const assetUrl = (asset) => asset.webp;

export const BID_OPTION_IMAGES = {
  singleDice: { webp: '/singleDice.webp', png: '/singleDice.png' },
  doubleDice: { webp: '/doubleDice.webp', png: '/doubleDice.png' },
  singlePatti: { webp: '/singlePatti.webp', png: '/singlePatti.png' },
  doublePatti: { webp: '/doublepatti.webp', png: '/doublepatti.png' },
  triplePatti: { webp: '/triplePatti.webp', png: '/triplePatti.png' },
  halfSangam: { webp: '/HalfSangam.webp', png: '/HalfSangam.png' },
  fullSangam: { webp: '/fullsangam.webp', png: '/fullsangam.png' },
};
