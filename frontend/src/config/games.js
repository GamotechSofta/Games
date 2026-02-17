/**
 * External games configuration.
 * Add new games here - each opens in a new tab.
 * url: full URL (use {{userId}} to inject logged-in user ID if needed)
 */
export const GAMES = [
  {
    id: 'aviator',
    name: 'Aviator',
    description: 'Crash Game',
    icon: '✈️',
    image: 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771335934/Aviator_Games_aqtqig.svg',
    url: 'https://aviator-jet-theta.vercel.app/?uid=68c3b5afbc7114822c777c1b',
    external: true,
  },
  {
    id: 'upcoming',
    name: 'Upcoming',
    description: 'Coming soon',
    icon: '🎮',
    url: null,
    external: false,
    upcoming: true,
  },
  // Desktop-only upcoming cards (hidden on mobile)
  {
    id: 'upcoming-2',
    name: 'Coming Soon',
    description: 'New game',
    icon: '🃏',
    url: null,
    external: false,
    upcoming: true,
    desktopOnly: true,
  },
  {
    id: 'upcoming-3',
    name: 'Coming Soon',
    description: 'New game',
    icon: '🎰',
    url: null,
    external: false,
    upcoming: true,
    desktopOnly: true,
  },
  {
    id: 'upcoming-4',
    name: 'Coming Soon',
    description: 'New game',
    icon: '🎯',
    url: null,
    external: false,
    upcoming: true,
    desktopOnly: true,
  },
  {
    id: 'upcoming-5',
    name: 'Coming Soon',
    description: 'New game',
    icon: '🪙',
    url: null,
    external: false,
    upcoming: true,
    desktopOnly: true,
  },
];
