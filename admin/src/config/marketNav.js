import { FaChartBar, FaStar, FaCrown } from 'react-icons/fa';

export const MARKET_NAV_ITEMS = [
    { id: 'regular', path: '/markets/regular', label: 'Regular Market', icon: FaChartBar },
    { id: 'starline', path: '/markets/starline', label: 'Starline Market', icon: FaStar },
    { id: 'king', path: '/markets/king', label: 'King Bazaar Market', icon: FaCrown },
];

export function marketTabFromPath(pathname = '') {
    if (pathname.startsWith('/markets/starline')) return 'starline';
    if (pathname.startsWith('/markets/king')) return 'king';
    return 'regular';
}

export function marketListPathFromType(marketType) {
    const t = (marketType || '').toString().toLowerCase();
    if (t === 'startline' || t === 'starline') return '/markets/starline';
    if (t === 'king' || t === 'kingbazaar') return '/markets/king';
    return '/markets/regular';
}

export function isMarketNavPath(pathname = '') {
    return pathname === '/markets' || MARKET_NAV_ITEMS.some((item) => pathname === item.path);
}
