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
