import { FaTachometerAlt, FaHeadset, FaDice } from 'react-icons/fa';

/** Sidebar tabs named by telecaller task */
export const NAV_ITEMS = [
    { path: '/dashboard', label: 'Overview', icon: FaTachometerAlt },
    { path: '/call-players', label: 'Player calls', icon: FaHeadset, description: 'Call list — tap a player for full activity' },
    { path: '/bets', label: 'Bet follow-up', icon: FaDice, description: 'Last bet time per player' },
];
