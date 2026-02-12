import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, getBookieAuthHeaders } from '../utils/api';
import {
    FaChartLine,
    FaMoneyBillWave,
    FaChartBar,
    FaSyncAlt,
    FaWallet,
    FaCreditCard,
    FaUserFriends,
    FaLifeRing,
    FaClipboardList,
    FaArrowRight,
    FaExclamationTriangle,
} from 'react-icons/fa';

const PRESETS = [
    {
        id: 'today', label: 'Today', getRange: () => {
            const d = new Date();
            const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
            const from = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return { from, to: from };
        }
    },
    {
        id: 'yesterday', label: 'Yesterday', getRange: () => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
            const from = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return { from, to: from };
        }
    },
    {
        id: 'this_week', label: 'This Week', getRange: () => {
            const d = new Date();
            const day = d.getDay();
            const sun = new Date(d);
            sun.setDate(d.getDate() - day);
            const sat = new Date(sun);
            sat.setDate(sun.getDate() + 6);
            const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
            return { from: fmt(sun), to: fmt(sat) };
        }
    },
    {
        id: 'last_week', label: 'Last Week', getRange: () => {
            const d = new Date();
            const day = d.getDay();
            const sun = new Date(d);
            sun.setDate(d.getDate() - day - 7);
            const sat = new Date(sun);
            sat.setDate(sun.getDate() + 6);
            const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
            return { from: fmt(sun), to: fmt(sat) };
        }
    },
    {
        id: 'this_month', label: 'This Month', getRange: () => {
            const d = new Date();
            const y = d.getFullYear(), m = d.getMonth();
            const last = new Date(y, m + 1, 0);
            const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
            const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
            return { from, to };
        }
    },
    {
        id: 'last_month', label: 'Last Month', getRange: () => {
            const d = new Date();
            const y = d.getFullYear(), m = d.getMonth() - 1;
            const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
            const last = new Date(y, m + 1, 0);
            const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
            return { from, to };
        }
    },
];

const formatRangeLabel = (from, to) => {
    if (!from || !to) return 'Today';
    if (from === to) {
        const d = new Date(from + 'T12:00:00');
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const a = new Date(from + 'T12:00:00');
    const b = new Date(to + 'T12:00:00');
    return `${a.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${b.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

/** Section card wrapper */
const SectionCard = ({ title, description, icon: Icon, children, linkTo, linkLabel }) => (
    <div className="glass-panel rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 group">
        <div className="flex items-start justify-between mb-6">
            <div>
                <h3 className="text-lg font-bold text-gray-100 flex items-center gap-3">
                    {Icon && (
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-colors duration-300">
                            <Icon className="w-5 h-5" />
                        </div>
                    )}
                    {title}
                </h3>
                {description && <p className="text-xs text-slate-400 mt-2 font-medium tracking-wide">{description}</p>}
            </div>
            {linkTo && (
                <Link to={linkTo} className="text-xs font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/5 hover:bg-amber-500/10 transition-all">
                    {linkLabel || 'View'} <FaArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
            )}
        </div>
        <div className="space-y-px">
            {children}
        </div>
    </div>
);

/** Stat row */
const StatRow = ({ label, value, subValue, colorClass = 'text-white' }) => (
    <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 -mx-2 rounded-lg transition-colors">
        <span className="text-sm text-slate-400 font-medium">{label}</span>
        <div className="text-right">
            <span className={`font-bold font-mono text-base ${colorClass}`}>{value}</span>
            {subValue && <span className="text-xs text-slate-500 ml-2 block">{subValue}</span>}
        </div>
    </div>
);

/** Skeleton placeholder */
const SkeletonCard = () => (
    <div className="glass-panel rounded-2xl p-6 animate-pulse">
        <div className="h-4 w-24 bg-white/10 rounded mb-4" />
        <div className="h-8 w-32 bg-white/10 rounded mb-3" />
        <div className="h-4 w-40 bg-white/5 rounded" />
    </div>
);

const Dashboard = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [datePreset, setDatePreset] = useState('today');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [customMode, setCustomMode] = useState(false);
    const [customOpen, setCustomOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const getFromTo = () => {
        if (customMode && customFrom && customTo) return { from: customFrom, to: customTo };
        const preset = PRESETS.find((p) => p.id === datePreset);
        return preset ? preset.getRange() : PRESETS[0].getRange();
    };

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async (rangeOverride, options = {}) => {
        const isRefresh = options.refresh === true;
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError('');
            const { from, to } = rangeOverride || getFromTo();
            const params = new URLSearchParams();
            if (from && to) { params.set('from', from); params.set('to', to); }
            if (isRefresh) params.set('_', String(Date.now()));
            const query = params.toString();
            const url = `${API_BASE_URL}/dashboard/stats${query ? `?${query}` : ''}`;
            const response = await fetch(url, {
                headers: getBookieAuthHeaders(),
                cache: isRefresh ? 'no-store' : 'default',
            });
            const data = await response.json();
            if (data.success) setStats(data.data);
            else if (response.status === 401) {
                logout();
                navigate('/');
            } else setError(data.message || 'Failed to fetch dashboard stats');
        } catch (err) {
            setError('Network error. Please check if the server is running.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => fetchDashboardStats(undefined, { refresh: true });
    const handlePresetSelect = (presetId) => {
        setDatePreset(presetId);
        setCustomMode(false);
        setCustomOpen(false);
        const preset = PRESETS.find((p) => p.id === presetId);
        const range = preset ? preset.getRange() : PRESETS[0].getRange();
        fetchDashboardStats(range);
    };
    const handleCustomToggle = () => { setCustomMode(true); setCustomOpen((o) => !o); };
    const handleCustomApply = () => {
        if (!customFrom || !customTo) return;
        if (new Date(customFrom) > new Date(customTo)) return;
        setCustomMode(true);
        setCustomOpen(false);
        fetchDashboardStats({ from: customFrom, to: customTo });
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

    const pendingPayments = stats?.payments?.pending || 0;
    const pendingDeposits = stats?.payments?.pendingDeposits ?? stats?.payments?.pending ?? 0;
    const pendingWithdrawals = stats?.payments?.pendingWithdrawals ?? 0;
    const helpDeskOpen = stats?.helpDesk?.open || 0;
    const hasActionRequired = pendingPayments > 0 || helpDeskOpen > 0;

    if (loading) {
        return (
            <Layout title="Dashboard">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Overview</h1>
                    <p className="text-slate-400 text-sm mt-2">Loading your dashboard...</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout title="Dashboard">
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                        <FaExclamationTriangle className="w-10 h-10 text-red-500" />
                    </div>
                    <p className="text-red-400 text-xl font-semibold mb-2">{error}</p>
                    <button onClick={() => fetchDashboardStats()} className="mt-6 px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-1">
                        Retry Connection
                    </button>
                </div>
            </Layout>
        );
    }

    const displayLabel = customMode && customFrom && customTo ? formatRangeLabel(customFrom, customTo) : (PRESETS.find((p) => p.id === datePreset)?.label || 'Today');

    return (
        <Layout title="Dashboard">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent flex items-center gap-4">
                            Dashboard Overview
                        </h1>
                        <p className="text-slate-400 text-sm mt-2 font-medium">Complete snapshot of your players and activity.</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="glass-panel-hover inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-50 text-sm font-semibold shadow-lg"
                    >
                        <FaSyncAlt className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
                        Refresh Data
                    </button>
                </div>

                {/* Date Filter */}
                <div className="glass-panel p-2 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-1.5 p-1">
                        {PRESETS.map((p) => {
                            const isActive = !customMode && datePreset === p.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handlePresetSelect(p.id)}
                                    className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 ${isActive ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={handleCustomToggle}
                                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 ${customMode ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                Custom
                            </button>
                            {customOpen && (
                                <div className="absolute top-full left-0 mt-3 p-4 rounded-xl glass-panel border border-white/10 z-50 min-w-[300px] shadow-2xl backdrop-blur-2xl">
                                    <h4 className="text-white font-bold mb-3 text-sm">Select Range</h4>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">From</label>
                                            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white focus:border-amber-500/50 outline-none transition-colors" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">To</label>
                                            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white focus:border-amber-500/50 outline-none transition-colors" />
                                        </div>
                                    </div>
                                    <button type="button" onClick={handleCustomApply} className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors shadow-lg shadow-amber-500/20">
                                        Apply Range
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 mx-2 hidden sm:block">
                        <p className="text-xs text-slate-400">Viewing Data: <span className="text-amber-400 font-bold ml-1">{displayLabel}</span></p>
                    </div>
                </div>
            </div>

            {/* Action Required */}
            {hasActionRequired && (
                <div className="mb-8 p-1 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-500/30 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors"></div>
                    <div className="relative p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 animate-pulse">
                                <FaExclamationTriangle className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Action Required</h3>
                                <p className="text-sm text-amber-200/80">You have pending items that need your attention.</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {pendingPayments > 0 && (
                                <Link to="/payments" className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95">
                                    {pendingPayments} Pending Payment{pendingPayments !== 1 ? 's' : ''} →
                                </Link>
                            )}
                            {helpDeskOpen > 0 && (
                                <Link to="/help-desk" className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/10 transition-all hover:scale-105 active:scale-95">
                                    {helpDeskOpen} Open Ticket{helpDeskOpen !== 1 ? 's' : ''} →
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Primary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Revenue */}
                <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FaMoneyBillWave className="w-16 h-16 text-emerald-500" />
                    </div>
                    <p className="text-xs text-emerald-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Total Revenue
                    </p>
                    <p className="text-3xl font-bold text-white font-mono tracking-tight">{formatCurrency(stats?.revenue?.total)}</p>
                    <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 w-3/4"></div>
                    </div>
                </div>

                {/* Net Profit */}
                <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FaChartLine className="w-16 h-16 text-blue-500" />
                    </div>
                    <p className="text-xs text-blue-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Net Profit
                    </p>
                    <p className="text-3xl font-bold text-white font-mono tracking-tight">{formatCurrency(stats?.revenue?.netProfit)}</p>
                    <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 w-3/5"></div>
                    </div>
                </div>

                {/* Players */}
                <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FaUserFriends className="w-16 h-16 text-purple-500" />
                    </div>
                    <p className="text-xs text-purple-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        Total Users
                    </p>
                    <p className="text-3xl font-bold text-white font-mono tracking-tight">{stats?.users?.total ?? 0}</p>
                    <div className="mt-4 flex items-center gap-4 text-xs text-slate-400 text-nowrap">
                        <span className="text-emerald-400 font-semibold">{stats?.users?.active ?? 0} active</span>
                        <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                        <span className="text-amber-400 font-semibold">{stats?.users?.newToday ?? 0} new</span>
                    </div>
                </div>

                {/* Active Bets */}
                <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FaChartBar className="w-16 h-16 text-amber-500" />
                    </div>
                    <p className="text-xs text-amber-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Total Bets
                    </p>
                    <p className="text-3xl font-bold text-white font-mono tracking-tight">{stats?.bets?.total ?? 0}</p>
                    <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden relative">
                        <div className="h-full bg-amber-500 absolute left-0 top-0" style={{ width: `${stats?.bets?.winRate ?? 0}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Detailed Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                {/* Revenue Details */}
                <SectionCard title="Revenue & Payouts" description="Financial breakdown" icon={FaMoneyBillWave} linkTo="/reports" linkLabel="Full Report">
                    <StatRow label="Total Revenue" value={formatCurrency(stats?.revenue?.total)} colorClass="text-emerald-400" />
                    <StatRow label="Total Payouts" value={formatCurrency(stats?.revenue?.payouts)} colorClass="text-red-400" />
                    <StatRow label="Net Profit" value={formatCurrency(stats?.revenue?.netProfit)} colorClass="text-blue-400" />
                </SectionCard>

                {/* Players */}
                <SectionCard title="Player Activity" description="User engagement stats" icon={FaUserFriends} linkTo="/my-users" linkLabel="All Players">
                    <StatRow label="Total Players" value={stats?.users?.total ?? 0} />
                    <StatRow label="Active Players" value={stats?.users?.active ?? 0} colorClass="text-emerald-400" />
                    <StatRow label="New (Period)" value={stats?.users?.newToday ?? 0} colorClass="text-amber-400" />
                </SectionCard>

                {/* Bets */}
                <SectionCard title="Betting Activity" description="Performance metrics" icon={FaChartBar} linkTo="/bet-history" linkLabel="All Bets">
                    <StatRow label="Total Bets" value={stats?.bets?.total ?? 0} />
                    <StatRow label="Winning Bets" value={stats?.bets?.winning ?? 0} colorClass="text-emerald-400" />
                    <StatRow label="Losing Bets" value={stats?.bets?.losing ?? 0} colorClass="text-red-400" />
                    <StatRow label="Pending Bets" value={stats?.bets?.pending ?? 0} colorClass="text-amber-400" />
                    <StatRow label="Win Rate" value={`${stats?.bets?.winRate ?? 0}%`} colorClass="text-blue-400" />
                </SectionCard>

                {/* Payments */}
                <SectionCard title="Recent & Pending Payments" description="Transaction monitoring" icon={FaCreditCard} linkTo="/payments" linkLabel="Manage">
                    <StatRow label="Deposits" value={formatCurrency(stats?.payments?.totalDeposits)} colorClass="text-emerald-400" />
                    <StatRow label="Withdrawals" value={formatCurrency(stats?.payments?.totalWithdrawals)} colorClass="text-red-400" />
                    <StatRow label="Pending Deposits" value={pendingDeposits} colorClass="text-amber-400" />
                    <StatRow label="Pending Withdrawals" value={pendingWithdrawals} colorClass="text-amber-400" />
                    <StatRow label="Total Pending Actions" value={pendingPayments} colorClass="text-amber-400" />
                </SectionCard>

                {/* Wallet */}
                <SectionCard title="System Wallet" description="Combined user balances" icon={FaWallet} linkTo="/wallet" linkLabel="Wallet">
                    <StatRow label="Total User Balance" value={formatCurrency(stats?.wallet?.totalBalance)} colorClass="text-emerald-400" />
                </SectionCard>

                {/* Help Desk */}
                <SectionCard title="Support Center" description="Ticket status" icon={FaLifeRing} linkTo="/help-desk" linkLabel="Tickets">
                    <StatRow label="Total Tickets" value={stats?.helpDesk?.total ?? 0} />
                    <StatRow label="Open Tickets" value={stats?.helpDesk?.open ?? 0} colorClass="text-red-400" />
                    <StatRow label="In Progress" value={stats?.helpDesk?.inProgress ?? 0} colorClass="text-amber-400" />
                </SectionCard>
            </div>

            {/* Quick Links */}
            <div className="glass-panel rounded-2xl p-8">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                    <FaClipboardList className="w-5 h-5 text-amber-500" />
                    Quick Navigation
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[
                        { to: "/my-users", label: "My Players", color: "hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/30" },
                        { to: "/add-user", label: "Add Player", color: "hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30" },
                        { to: "/referral-link", label: "Referral Link", color: "hover:bg-purple-500/20 hover:text-purple-400 hover:border-purple-500/30" },
                        { to: "/bet-history", label: "Bet History", color: "hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/30" },
                        { to: "/reports", label: "Reports", color: "hover:bg-pink-500/20 hover:text-pink-400 hover:border-pink-500/30" },
                    ].map((link, idx) => (
                        <Link key={idx} to={link.to} className={`px-4 py-4 rounded-xl bg-white/5 border border-white/5 text-slate-300 text-sm font-semibold transition-all hover:-translate-y-1 hover:shadow-lg ${link.color} text-center flex flex-col items-center justify-center gap-2 group`}>
                            <span className="opacity-80 group-hover:opacity-100">{link.label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;
