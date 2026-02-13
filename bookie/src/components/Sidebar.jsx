import React, { useRef, useEffect } from 'react';
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
    const navRef = useRef(null);

    // Restore scroll position on mount
    useEffect(() => {
        const savedScroll = sessionStorage.getItem('sidebar-scroll');
        if (savedScroll && navRef.current) {
            navRef.current.scrollTop = parseInt(savedScroll, 10);
        }
    }, []);

    const handleScroll = (e) => {
        sessionStorage.setItem('sidebar-scroll', e.target.scrollTop);
    };

    const menuGroups = [
        {
            title: "Navigation",
            items: [
                { path: '/dashboard', label: 'Dashboard', icon: FaTachometerAlt },
                { path: '/my-users', label: 'My Players', icon: FaUsers },
                { path: '/markets', label: 'Markets', icon: FaChartBar },
                { path: '/add-user', label: 'Add Player', icon: FaUserPlus },
                { path: '/referral-link', label: 'Referral Link', icon: FaLink },
            ]
        },
        {
            title: "Management",
            items: [
                { path: '/bet-history', label: 'Bet History', icon: FaHistory },
                { path: '/top-winners', label: 'Top Winners', icon: FaTrophy },
                { path: '/reports', label: 'Report History', icon: FaChartLine },
            ]
        },
        {
            title: "Financials",
            items: [
                { path: '/revenue', label: 'Revenue Log', icon: FaMoneyBillWave },
                { path: '/payments', label: 'Payment Requests', icon: FaCreditCard },
                { path: '/wallet', label: 'Wallet Manager', icon: FaWallet },
            ]
        },
        {
            title: "Configuration",
            items: [
                { path: '/help-desk', label: 'Support Desk', icon: FaLifeRing },
                { path: '/settings', label: 'System Settings', icon: FaCog },
            ]
        }
    ];

    const isActive = (path) => {
        if (path === '/my-users' || path === '/markets') {
            return location.pathname === path || location.pathname.startsWith(path + '/');
        }
        if (path === '/reports') return location.pathname === '/reports';
        if (path === '/revenue') return location.pathname === '/revenue' || location.pathname.startsWith('/revenue/');
        return location.pathname === path;
    };

    const handleNav = (path) => {
        navigate(path);
        onClose?.();
    };

    return (
        <aside
            className={`fixed left-0 top-0 h-screen w-64 sm:w-[280px] bg-[#020617] border-r border-white/5 flex flex-col z-50 overflow-hidden shadow-[10px_0_30px_-15px_rgba(0,0,0,0.5)]
                transform transition-all duration-300 ease-in-out
                lg:translate-x-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
        >
            {/* Header: Logo */}
            <div className="px-6 py-8 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 rotate-3 group overflow-hidden">
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <span className="text-black font-black text-2xl relative z-10">B</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight leading-none uppercase">
                                Bookie<span className="text-amber-500">Panel</span>
                            </h2>
                            <p className="text-[9px] text-slate-500 font-bold tracking-[0.2em] mt-1.5 uppercase">Management Control</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
                    >
                        <FaTimes className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Menu Sections */}
            <nav
                ref={navRef}
                onScroll={handleScroll}
                className="flex-1 px-3 space-y-7 overflow-y-auto custom-scrollbar py-4"
            >
                {menuGroups.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-2">
                        <h3 className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{group.title}</h3>
                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const active = isActive(item.path);
                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => handleNav(item.path)}
                                        className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300
                                            ${active
                                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-[#020617] shadow-lg shadow-amber-500/20 active:scale-[0.98]'
                                                : 'text-slate-400 hover:bg-white/[0.03] hover:text-white'
                                            }
                                        `}
                                    >
                                        <div className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-300
                                            ${active ? 'bg-black/20 text-black' : 'bg-slate-800/50 group-hover:bg-slate-700/50 group-hover:text-amber-400 text-slate-500'}
                                        `}>
                                            <item.icon className="w-4.5 h-4.5" />
                                        </div>
                                        <span className={`text-sm tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                                        {active && (
                                            <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-black/40 animate-pulse" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* User Profile & Logout Section */}
            <div className="p-4 mt-auto border-t border-white/5 bg-black/40 backdrop-blur-md">
                <div className="bg-[#0F172A] rounded-2xl p-4 border border-white/5 shadow-inner">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5 relative">
                            <span className="text-amber-500 font-bold text-lg">{user?.username?.charAt(0).toUpperCase() || 'B'}</span>
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-[#0F172A]"></span>
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{user?.username || 'Bookie User'}</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate uppercase tracking-wider">Active Account</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500 group transition-all duration-300 border border-red-500/20"
                    >
                        <FaSignOutAlt className="w-3.5 h-3.5 text-red-500 group-hover:text-white transition-colors" />
                        <span className="text-xs font-black text-red-500 group-hover:text-white uppercase tracking-wider">Logout Session</span>
                    </button>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(100, 116, 139, 0.2);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(100, 116, 139, 0.4);
                }
            `}} />
        </aside>
    );
};

export default Sidebar;
