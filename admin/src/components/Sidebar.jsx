import React, { useRef, useEffect } from 'react';
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
} from 'react-icons/fa';

const ALL_MENU_ITEMS = [
    { path: '/dashboard', label: 'Dashboard', icon: FaTachometerAlt },
    { path: '/all-users', label: 'All Players', icon: FaUserFriends },
    { path: '/bookie-management', label: 'Bookie Accounts', icon: FaUsers },
    { path: '/markets', label: 'Markets', icon: FaChartBar },
    { path: '/add-result', label: 'Add Result', icon: FaEdit },
    { path: '/update-rate', label: 'Update Rate', icon: FaCoins },
    { path: '/bet-history', label: 'Bet History', icon: FaHistory },
    { path: '/reports', label: 'Report', icon: FaChartLine },
    { path: '/revenue', label: 'Revenue', icon: FaMoneyBillWave },
    { path: '/payment-management', label: 'Payments', icon: FaCreditCard },
    { path: '/game-management', label: 'Games', icon: FaGamepad },
    { path: '/daily-settlement', label: 'Daily Settlement', icon: FaMoneyBillWave },
    { path: '/wallet', label: 'Wallet', icon: FaWallet },
    { path: '/help-desk', label: 'Help Desk', icon: FaLifeRing },
    { path: '/logs', label: 'Logs', icon: FaClipboardList },
    { path: '/settings', label: 'Settings', icon: FaCog },
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

    const menuItems = (() => {
        if (role === 'specific_admin') {
            return ALL_MENU_ITEMS.filter((item) => allowedTabs.includes(item.path));
        }
        const items = [...ALL_MENU_ITEMS];
        if (role === 'super_admin') {
            items.push({ path: '/specific-admin', label: 'Specific Admin', icon: FaUserShield });
        }
        return items;
    })();

    // Restore scroll position on mount
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
        if (path === '/specific-admin') {
            return location.pathname === path;
        }
        if (path === '/all-users' || path === '/markets') {
            return location.pathname === path || location.pathname.startsWith(path + '/');
        }
        if (path === '/add-result') {
            return location.pathname === path || location.pathname.startsWith(path + '/');
        }
        if (path === '/reports') {
            return location.pathname === '/reports';
        }
        if (path === '/revenue') {
            return location.pathname === '/revenue' || location.pathname.startsWith('/revenue/');
        }
        if (path === '/daily-settlement') {
            return location.pathname === '/daily-settlement';
        }
        return location.pathname === path;
    };

    const handleNav = (path) => {
        navigate(path);
        onClose?.();
    };

    return (
        <aside
            className={`fixed left-0 top-0 h-screen w-60 sm:w-64 bg-gray-800/95 backdrop-blur-sm border-r border-gray-700/50 flex flex-col z-[60] overflow-y-auto shadow-2xl
                transform transition-transform duration-200 ease-in-out
                lg:translate-x-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
            style={{ touchAction: 'manipulation' }}
        >
            {/* Logo + Close (mobile) */}
            <div className="p-3 sm:p-4 border-b border-gray-700 shrink-0 flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-yellow-500">
                    {role === 'specific_admin' ? 'Specific Admin' : 'Super Admin'}
                </h2>
                <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose?.(); }}
                    className="lg:hidden p-2 rounded-lg hover:bg-gray-700 text-gray-400 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Close menu"
                >
                    <FaTimes className="w-4 h-4" />
                </button>
            </div>

            {/* Menu Items */}
            <nav
                ref={navRef}
                onScroll={handleScroll}
                className="flex-1 p-2 sm:p-3 space-y-0.5 overflow-y-auto"
            >
                {menuItems.map((item) => (
                    <button
                        key={item.path}
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNav(item.path); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 sm:px-3 sm:py-3 rounded-lg transition-all duration-200 text-xs sm:text-sm min-h-[44px] cursor-pointer select-none ${isActive(item.path)
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold shadow-lg shadow-yellow-500/20'
                            : 'text-gray-300 hover:bg-gray-700/50 hover:text-white hover:-translate-y-0.5'
                            }`}
                    >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* Logout */}
            <div className="p-2 sm:p-3 border-t border-gray-700/50 shrink-0">
                <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLogout?.(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold transition-all duration-200 text-xs sm:text-sm glow-red hover:-translate-y-0.5 min-h-[44px] cursor-pointer"
                >
                    <FaSignOutAlt className="w-4 h-4 shrink-0" />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
