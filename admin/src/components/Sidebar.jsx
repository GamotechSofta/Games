import React, { useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    FaTachometerAlt,
    FaChartBar,
    FaHistory,
    FaChartLine,
    FaCreditCard,
    FaWallet,
    FaLifeRing,
    FaSignOutAlt,
    FaUsers,
    FaUserFriends,
    FaEdit,
    FaTimes,
    FaClipboardList,
    FaCoins,
    FaCog,
    FaMoneyBillWave,
    FaUserShield,
    FaGamepad,
    FaHeadset,
} from 'react-icons/fa';

const MENU_GROUPS = [
    {
        title: 'Navigation',
        items: [
            { path: '/dashboard', label: 'Dashboard', icon: FaTachometerAlt },
            { path: '/all-users', label: 'All Players', icon: FaUserFriends },
            { path: '/bookie-management', label: 'Bookie Accounts', icon: FaUsers },
            { path: '/markets', label: 'Markets', icon: FaChartBar },
        ],
    },
    {
        title: 'Management',
        items: [
            { path: '/add-result', label: 'Add Result', icon: FaEdit },
            { path: '/update-rate', label: 'Update Rate', icon: FaCoins },
            { path: '/bet-history', label: 'Bet History', icon: FaHistory },
            { path: '/reports', label: 'Report', icon: FaChartLine },
            { path: '/game-management', label: 'Games', icon: FaGamepad },
            { path: '/logs', label: 'Logs', icon: FaClipboardList },
        ],
    },
    {
        title: 'Financials',
        items: [
            { path: '/revenue', label: 'Revenue', icon: FaMoneyBillWave },
            { path: '/payment-management', label: 'Transactions', icon: FaCreditCard },
            { path: '/daily-settlement', label: 'Daily Settlement', icon: FaMoneyBillWave },
            { path: '/wallet', label: 'Wallet', icon: FaWallet },
        ],
    },
    {
        title: 'Configuration',
        items: [
            { path: '/help-desk', label: 'Help Desk', icon: FaLifeRing },
            { path: '/settings', label: 'Settings', icon: FaCog },
            { path: '/specific-admin', label: 'Specific Admin', icon: FaUserShield, superAdminOnly: true },
            { path: '/telecaller-management', label: 'Telecallers', icon: FaHeadset, superAdminOnly: true },
        ],
    },
];

const Sidebar = ({ onLogout, isOpen = true, onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const navRef = useRef(null);

    const admin = (() => {
        try {
            return JSON.parse(localStorage.getItem('admin') || '{}');
        } catch {
            return {};
        }
    })();
    const role = admin.role || 'super_admin';
    const allowedTabs = Array.isArray(admin.allowedTabs) ? admin.allowedTabs : [];

    const menuGroups = useMemo(() => {
        const filterItem = (item) => {
            if (item.superAdminOnly && role !== 'super_admin') return false;
            if (role === 'specific_admin') return allowedTabs.includes(item.path);
            return true;
        };

        return MENU_GROUPS.map((group) => ({
            ...group,
            items: group.items.filter(filterItem),
        })).filter((group) => group.items.length > 0);
    }, [role, allowedTabs]);

    useEffect(() => {
        const savedScroll = sessionStorage.getItem('admin-sidebar-scroll');
        if (savedScroll && navRef.current) {
            navRef.current.scrollTop = parseInt(savedScroll, 10);
        }
    }, []);

    const handleScroll = (e) => {
        sessionStorage.setItem('admin-sidebar-scroll', e.target.scrollTop);
    };

    const isActive = (path) => {
        if (path === '/specific-admin' || path === '/telecaller-management') return location.pathname === path;
        if (path === '/all-users' || path === '/markets') {
            return location.pathname === path || location.pathname.startsWith(`${path}/`);
        }
        if (path === '/add-result') {
            return location.pathname === path || location.pathname.startsWith(`${path}/`);
        }
        if (path === '/reports') return location.pathname === '/reports';
        if (path === '/revenue') {
            return location.pathname === '/revenue' || location.pathname.startsWith('/revenue/');
        }
        if (path === '/daily-settlement') return location.pathname === '/daily-settlement';
        return location.pathname === path;
    };

    const handleNav = (path) => {
        navigate(path);
        onClose?.();
    };

    const panelTitle = role === 'specific_admin' ? 'Specific Admin' : 'Super Admin';

    return (
        <aside
            className={`fixed left-0 top-0 h-screen w-60 sm:w-64 bg-gray-800/95 backdrop-blur-sm border-r border-gray-700/50 flex flex-col z-[60] overflow-hidden shadow-2xl
                transform transition-transform duration-200 ease-in-out
                lg:translate-x-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
            style={{ touchAction: 'manipulation' }}
        >
            <div className="px-4 py-4 shrink-0 border-b border-gray-700/80 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-yellow-500/10 blur-3xl rounded-full -mr-14 -mt-14 pointer-events-none" />
                <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/25 shrink-0">
                            <span className="text-black font-black text-xl">A</span>
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-yellow-500 tracking-tight leading-none truncate">
                                {panelTitle}
                            </h2>
                            <p className="text-[11px] text-gray-400 truncate mt-1">
                                {admin.username || 'Admin'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose?.(); }}
                        className="lg:hidden p-2 rounded-lg hover:bg-gray-700 text-gray-400 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                        aria-label="Close menu"
                    >
                        <FaTimes className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <nav
                ref={navRef}
                onScroll={handleScroll}
                className="flex-1 px-2 sm:px-3 space-y-4 overflow-y-auto custom-scrollbar pt-3 pb-3"
            >
                {menuGroups.map((group) => (
                    <div key={group.title} className="space-y-1">
                        <h3 className="px-3 text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] leading-none">
                            {group.title}
                        </h3>
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const active = isActive(item.path);
                                return (
                                    <button
                                        key={item.path}
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNav(item.path); }}
                                        className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 min-h-[44px] cursor-pointer select-none
                                            ${active
                                                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg shadow-yellow-500/20'
                                                : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                                            }`}
                                    >
                                        <div className={`w-9 h-9 flex items-center justify-center rounded-lg shrink-0 transition-colors
                                            ${active ? 'bg-black/10 text-black' : 'bg-gray-700/50 text-gray-400 group-hover:text-yellow-400'}
                                        `}>
                                            <item.icon className="w-4 h-4" />
                                        </div>
                                        <span className={`text-sm truncate ${active ? 'font-bold' : 'font-medium'}`}>
                                            {item.label}
                                        </span>
                                        {active && (
                                            <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-black/30" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="p-3 border-t border-gray-700/50 shrink-0 bg-gray-900/40">
                <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLogout?.(); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500 group transition-all duration-200 border border-red-500/30 hover:border-red-500 min-h-[44px] cursor-pointer"
                >
                    <FaSignOutAlt className="w-3.5 h-3.5 text-red-400 group-hover:text-white transition-colors" />
                    <span className="text-xs font-bold text-red-400 group-hover:text-white uppercase tracking-wider">
                        Logout
                    </span>
                </button>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(107, 114, 128, 0.5);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(156, 163, 175, 0.6);
                }
            `}} />
        </aside>
    );
};

export default Sidebar;
