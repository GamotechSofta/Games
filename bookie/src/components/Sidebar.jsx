import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    FaTachometerAlt,
    FaChartBar,
    FaUserPlus,
    FaHistory,
    FaTrophy,
    FaChartLine,
    FaCreditCard,
    FaWallet,
    FaLifeRing,
    FaLink,
    FaSignOutAlt,
    FaUsers,
    FaTimes,
    FaMoneyBillWave,
    FaCog,
} from 'react-icons/fa';

const Sidebar = ({ user, onLogout, isOpen = true, onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { path: '/dashboard', label: 'Dashboard', icon: FaTachometerAlt },
        { path: '/my-users', label: 'My Players', icon: FaUsers },
        { path: '/markets', label: 'Markets', icon: FaChartBar },
        { path: '/add-user', label: 'Add Player', icon: FaUserPlus },
        { path: '/referral-link', label: 'My Referral Link', icon: FaLink },
        { path: '/bet-history', label: 'Bet History', icon: FaHistory },
        { path: '/top-winners', label: 'Top Winners', icon: FaTrophy },
        { path: '/reports', label: 'Report', icon: FaChartLine },
        { path: '/revenue', label: 'Revenue', icon: FaMoneyBillWave },
        { path: '/payments', label: 'Payments', icon: FaCreditCard },
        { path: '/wallet', label: 'Wallet', icon: FaWallet },

        { path: '/help-desk', label: 'Help Desk', icon: FaLifeRing },
        { path: '/settings', label: 'Settings', icon: FaCog },
    ];

    const isActive = (path) => {
        if (path === '/my-users' || path === '/markets') {
            return location.pathname === path || location.pathname.startsWith(path + '/');
        }
        if (path === '/reports') {
            return location.pathname === '/reports';
        }
        if (path === '/revenue') {
            return location.pathname === '/revenue' || location.pathname.startsWith('/revenue/');
        }
        return location.pathname === path;
    };

    const handleNav = (path) => {
        navigate(path);
        onClose?.();
    };

    return (
        <aside
            className={`fixed left-0 top-0 h-screen w-64 sm:w-72 bg-[#0B1120]/90 backdrop-blur-xl border-r border-white/5 flex flex-col z-50 overflow-y-auto shadow-2xl
                transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1)
                lg:translate-x-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
        >
            {/* Logo + Close (mobile) */}
            <div className="px-6 py-8 shrink-0 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent tracking-tight">
                        Bookie<span className="font-light text-white/50">Panel</span>
                    </h2>
                    {user?.username && (
                        <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-white/5 rounded-full w-fit">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                            <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">{user.username}</p>
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                    <FaTimes className="w-5 h-5" />
                </button>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-hide py-2">
                {menuItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <button
                            key={item.path}
                            onClick={() => handleNav(item.path)}
                            className={`group relative w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium tracking-wide
                                ${active
                                    ? 'bg-amber-500/10 text-amber-400 shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)] border border-amber-500/20'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                                }
                            `}
                        >
                            {active && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-500 rounded-r-lg shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                            )}
                            <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${active ? 'text-amber-400' : 'text-slate-500 group-hover:text-amber-200'}`} />
                            <span className="truncate">{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-white/5 shrink-0 bg-black/20">
                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 border border-red-500/20 text-red-400 hover:text-red-300 font-semibold transition-all duration-200 group"
                >
                    <FaSignOutAlt className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span>Logout Session</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
