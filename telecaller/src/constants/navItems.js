import { FaTachometerAlt, FaHeadset, FaDice, FaPhoneVolume } from 'react-icons/fa';

/** Sidebar tabs named by telecaller task */
export const NAV_ITEMS = [
    { path: '/dashboard', label: 'Overview', icon: FaTachometerAlt },
    {
        path: '/requested-calls',
        label: 'Requested calls',
        icon: FaPhoneVolume,
        description: 'Players who tapped Request a call — answer from this tab only',
        showRequestBadge: true,
    },
    { path: '/call-players', label: 'Player calls', icon: FaHeadset, description: 'Call list — tap a player for full activity' },
    { path: '/bets', label: 'Bet follow-up', icon: FaDice, description: 'Last bet time per player' },
];
