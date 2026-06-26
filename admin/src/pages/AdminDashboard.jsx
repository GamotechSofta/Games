import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useNavigate, Link } from 'react-router-dom';
import { SkeletonCard } from '../components/Skeleton';
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
    FaArrowDown,
    FaArrowUp,
    FaCoins,
} from 'react-icons/fa';

import { API_BASE_URL, adminFetch, clearAdminAuth } from '../utils/api';

const PRESETS = [
    { id: 'all', label: 'All', getRange: () => ({ from: null, to: null }) },
    { id: 'today', label: 'Today', getRange: () => {
        const d = new Date();
        const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
        const from = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { from, to: from };
    }},
    { id: 'yesterday', label: 'Yesterday', getRange: () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
        const from = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { from, to: from };
    }},
    { id: 'this_week', label: 'This Week', getRange: () => {
        const d = new Date();
        const day = d.getDay();
        const sun = new Date(d);
        sun.setDate(d.getDate() - day);
        const sat = new Date(sun);
        sat.setDate(sun.getDate() + 6);
        const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
        return { from: fmt(sun), to: fmt(sat) };
    }},
    { id: 'last_week', label: 'Last Week', getRange: () => {
        const d = new Date();
        const day = d.getDay();
        const sun = new Date(d);
        sun.setDate(d.getDate() - day - 7);
        const sat = new Date(sun);
        sat.setDate(sun.getDate() + 6);
        const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
        return { from: fmt(sun), to: fmt(sat) };
    }},
    { id: 'this_month', label: 'This Month', getRange: () => {
        const d = new Date();
        const y = d.getFullYear(), m = d.getMonth();
        const last = new Date(y, m + 1, 0);
        const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
        return { from, to };
    }},
    { id: 'last_month', label: 'Last Month', getRange: () => {
        const d = new Date();
        const y = d.getFullYear(), m = d.getMonth() - 1;
        const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const last = new Date(y, m + 1, 0);
        const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
        return { from, to };
    }},
];

/** Value font size by length — scales down so full amount fits without ellipsis */
const valueSizeClass = (value) => {
    const len = String(value ?? '').length;
    if (len > 16) return 'text-[10px] min-[400px]:text-xs sm:text-sm md:text-base';
    if (len > 13) return 'text-xs sm:text-sm md:text-base lg:text-lg';
    if (len > 10) return 'text-sm sm:text-base md:text-lg lg:text-xl';
    if (len > 7) return 'text-base sm:text-lg md:text-xl lg:text-2xl';
    return 'text-lg sm:text-xl md:text-2xl lg:text-3xl';
};

/** Section group — title only, no background box */
const StatsGroup = ({ title, icon: Icon, gridClass = 'grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-3', children }) => (
    <div>
        <h2 className="text-sm font-semibold text-gray-400 flex items-center gap-2 mb-2 sm:mb-3">
            {Icon && <Icon className="w-4 h-4 text-amber-400 shrink-0" />}
            {title}
        </h2>
        <div className={`grid ${gridClass} gap-3 sm:gap-4`}>
            {children}
        </div>
    </div>
);

/** Large KPI card */
const KpiCard = ({ label, value, icon: Icon, tone = 'slate', onClick, to }) => {
    const tones = {
        green: {
            wrap: 'border-emerald-500/40 bg-emerald-950/40 hover:border-emerald-400/70',
            icon: 'bg-emerald-500/20 text-emerald-400',
            value: 'text-emerald-300',
            label: 'text-emerald-100/80',
        },
        red: {
            wrap: 'border-rose-500/40 bg-rose-950/30 hover:border-rose-400/70',
            icon: 'bg-rose-500/20 text-rose-400',
            value: 'text-rose-300',
            label: 'text-rose-100/80',
        },
        blue: {
            wrap: 'border-sky-500/40 bg-sky-950/30 hover:border-sky-400/70',
            icon: 'bg-sky-500/20 text-sky-400',
            value: 'text-sky-300',
            label: 'text-sky-100/80',
        },
        amber: {
            wrap: 'border-amber-500/40 bg-amber-950/30 hover:border-amber-400/70',
            icon: 'bg-amber-500/20 text-amber-400',
            value: 'text-amber-300',
            label: 'text-amber-100/80',
        },
        violet: {
            wrap: 'border-violet-500/40 bg-violet-950/30 hover:border-violet-400/70',
            icon: 'bg-violet-500/20 text-violet-400',
            value: 'text-violet-300',
            label: 'text-violet-100/80',
        },
        slate: {
            wrap: 'border-gray-600/60 bg-gray-800/60 hover:border-gray-500/80',
            icon: 'bg-gray-600/40 text-gray-300',
            value: 'text-white',
            label: 'text-gray-300',
        },
    };
    const t = tones[tone] || tones.slate;
    const displayValue = value ?? '—';
    const inner = (
        <div className={`rounded-xl border p-3.5 sm:p-4 md:p-5 transition-all h-full min-h-[88px] sm:min-h-[96px] flex items-start gap-3 sm:gap-4 ${t.wrap} ${to || onClick ? 'cursor-pointer hover:shadow-md active:scale-[0.99]' : ''}`}>
            {Icon && (
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${t.icon}`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
            )}
            <div className="min-w-0 flex-1 overflow-hidden">
                <p className={`text-[11px] sm:text-xs md:text-sm font-semibold leading-tight truncate ${t.label}`}>{label}</p>
                <p
                    className={`font-bold font-mono tabular-nums mt-1 sm:mt-1.5 leading-tight whitespace-normal break-words ${valueSizeClass(displayValue)} ${t.value}`}
                    title={String(displayValue)}
                >
                    {displayValue}
                </p>
            </div>
        </div>
    );
    if (to) return <Link to={to} className="block h-full">{inner}</Link>;
    return inner;
};

/** Section card wrapper */
const SectionCard = ({ title, icon: Icon, children, linkTo, linkLabel }) => (
    <div className="bg-gray-800/60 rounded-2xl p-5 sm:p-6 border border-gray-700/70 hover:border-gray-600/80 transition-all h-full">
        <div className="flex items-start justify-between mb-4 gap-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
                {Icon && <Icon className="w-4 h-4 text-amber-400 shrink-0" />}
                {title}
            </h3>
            {linkTo && (
                <Link to={linkTo} className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 shrink-0">
                    {linkLabel || 'View'} <FaArrowRight className="w-3 h-3" />
                </Link>
            )}
        </div>
        {children}
    </div>
);

/** Stat row */
const StatRow = ({ label, value, subValue, colorClass = 'text-white' }) => (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-700/50 last:border-0">
        <span className="text-sm text-gray-400">{label}</span>
        <div className="text-right">
            <span className={`font-semibold font-mono ${colorClass}`}>{value}</span>
            {subValue && <span className="text-xs text-gray-500 ml-2">{subValue}</span>}
        </div>
    </div>
);

const AdminDashboard = () => {
    const navigate = useNavigate();
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
        return preset ? preset.getRange() : PRESETS[1].getRange();
    };

    useEffect(() => {
        const admin = localStorage.getItem('admin');
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        if (!admin || !token) {
            if (!admin) clearAdminAuth();
            navigate('/');
            return;
        }
        fetchDashboardStats();
    }, [navigate]);

    const fetchDashboardStats = async (rangeOverride, options = {}) => {
        const isRefresh = options.refresh === true;
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError('');
            const { from, to } = rangeOverride || getFromTo();
            const params = new URLSearchParams();
            if (from != null && to != null && from !== '' && to !== '') {
                params.set('from', from);
                params.set('to', to);
            } else {
                params.set('all', '1');
            }
            if (isRefresh) params.set('_', String(Date.now()));
            const query = params.toString();
            const url = `${API_BASE_URL}/dashboard/stats${query ? `?${query}` : ''}`;
            const response = await adminFetch(url, {
                cache: isRefresh ? 'no-store' : 'default',
            });
            const data = await response.json();
            if (data.success) setStats(data.data);
            else setError('Failed to fetch dashboard stats');
        } catch (err) {
            setError('Network error. Please check if the server is running.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        fetchDashboardStats(undefined, { refresh: true });
    };
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

    const handleLogout = () => {
        clearAdminAuth();
        navigate('/');
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

    const pendingWithdrawals = Number(stats?.payments?.pendingWithdrawals) || 0;
    const helpDeskOpen = stats?.helpDesk?.open || 0;
    const marketsPendingResultList = stats?.marketsPendingResultList || [];
    const starlinePendingList = marketsPendingResultList.filter((m) => (m.marketType || '').toString().toLowerCase() === 'startline');
    const mainPendingList = marketsPendingResultList.filter((m) => (m.marketType || '').toString().toLowerCase() !== 'startline');
    const starlinePendingCount = starlinePendingList.length;
    const mainPendingCount = mainPendingList.length;
    const marketsPendingResult = marketsPendingResultList.length;
    if (loading) {
        return (
            <AdminLayout onLogout={handleLogout} title="Dashboard">
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard Overview</h1>
                    <p className="text-gray-400 text-sm mt-2">Loading your admin overview...</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[...Array(4)].map((_, i) => <SkeletonCard key={`o-${i}`} />)}
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout onLogout={handleLogout} title="Dashboard">
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                        <FaExclamationTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <p className="text-red-400 text-lg font-medium mb-2">{error}</p>
                    <button onClick={fetchDashboardStats} className="mt-4 px-6 py-2 bg-amber-600 hover:bg-amber-500 text-black font-semibold rounded-xl">
                        Retry
                    </button>
                </div>
            </AdminLayout>
        );
    }

    const totalDeposits = Number(stats?.payments?.totalDeposits) || 0;
    const totalWithdrawals = Number(stats?.payments?.totalWithdrawals) || 0;
    const totalProfit = totalDeposits - totalWithdrawals;
    const betAmount = Number(stats?.revenue?.total) || 0;
    const winAmount = Number(stats?.revenue?.payouts) || 0;
    const bettingProfit = Number(stats?.revenue?.netProfit) || 0;
    const hasActions = pendingWithdrawals > 0 || helpDeskOpen > 0 || starlinePendingCount > 0 || mainPendingCount > 0;

    const buildFundsHistorySearch = (type) => {
        const params = new URLSearchParams({ type });
        if (customMode && customFrom && customTo) {
            params.set('from', customFrom);
            params.set('to', customTo);
        } else if (datePreset === 'all') {
            params.set('all', '1');
        } else {
            const preset = PRESETS.find((p) => p.id === datePreset);
            const range = preset ? preset.getRange() : PRESETS[1].getRange();
            if (range.from && range.to) {
                params.set('from', range.from);
                params.set('to', range.to);
            }
        }
        return params.toString();
    };

    return (
        <AdminLayout onLogout={handleLogout} title="Dashboard">
            {/* Header */}
            <div className="mb-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
                    </div>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-all disabled:opacity-60 text-sm"
                    >
                        <FaSyncAlt className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                <div className="rounded-2xl p-3 sm:p-4 border border-gray-700/80 bg-gray-800/50">
                    <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <span className="text-xs sm:text-sm font-semibold text-gray-300 shrink-0 pr-1 sm:pr-2">Date Range</span>
                        {PRESETS.map((p) => {
                            const isActive = !customMode && datePreset === p.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handlePresetSelect(p.id)}
                                    className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors shrink-0 whitespace-nowrap ${
                                        isActive ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={handleCustomToggle}
                            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium shrink-0 whitespace-nowrap transition-colors ${
                                customMode ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                            }`}
                        >
                            Custom
                        </button>
                    </div>
                    {customOpen && (
                        <div className="flex flex-wrap items-end gap-3 w-full mt-3 p-3 rounded-xl bg-gray-900/50 border border-gray-600">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">From</label>
                                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-sm text-white" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">To</label>
                                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-sm text-white" />
                            </div>
                            <button type="button" onClick={handleCustomApply} className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm">
                                Apply
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Required */}
            {hasActions && (
                <div className="mb-6 sm:mb-8 p-3 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/35">
                    <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <span className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5 shrink-0 pr-1 sm:pr-2 whitespace-nowrap">
                            <FaExclamationTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Action Required
                        </span>
                        <Link
                            to="/payment-management"
                            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                                pendingWithdrawals > 0
                                    ? 'bg-amber-500 hover:bg-amber-400 text-black'
                                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
                            }`}
                        >
                            <FaCreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                            {pendingWithdrawals} Withdraw Pending
                        </Link>
                        {helpDeskOpen > 0 && (
                            <Link to="/help-desk" className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-medium text-xs sm:text-sm shrink-0 whitespace-nowrap">
                                {helpDeskOpen} Help Ticket{helpDeskOpen !== 1 ? 's' : ''}
                            </Link>
                        )}
                        {starlinePendingCount > 0 && (
                            <Link to="/markets/starline" className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-medium text-xs sm:text-sm shrink-0 whitespace-nowrap">
                                {starlinePendingCount} Starline Result Pending
                            </Link>
                        )}
                        {mainPendingCount > 0 && (
                            <Link to="/add-result" className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-medium text-xs sm:text-sm shrink-0 whitespace-nowrap">
                                {mainPendingCount} Market Result Pending
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="space-y-5 sm:space-y-6 mb-8">
                <StatsGroup title="Player Funds" icon={FaWallet}>
                    <KpiCard
                        label="Total Deposit"
                        value={formatCurrency(totalDeposits)}
                        icon={FaArrowDown}
                        tone="green"
                        to={`/deposit-withdrawal-history?${buildFundsHistorySearch('deposit')}`}
                    />
                    <KpiCard
                        label="Total Withdrawal"
                        value={formatCurrency(totalWithdrawals)}
                        icon={FaArrowUp}
                        tone="red"
                        to={`/deposit-withdrawal-history?${buildFundsHistorySearch('withdrawal')}`}
                    />
                    <KpiCard
                        label="Total Profit"
                        value={formatCurrency(totalProfit)}
                        icon={FaCoins}
                        tone={totalProfit >= 0 ? 'blue' : 'red'}
                    />
                </StatsGroup>

                <StatsGroup title="Betting" icon={FaChartBar}>
                    <KpiCard
                        label="Total Bet Amount"
                        value={formatCurrency(betAmount)}
                        icon={FaMoneyBillWave}
                        tone="green"
                    />
                    <KpiCard
                        label="Total Win Amount"
                        value={formatCurrency(winAmount)}
                        icon={FaChartLine}
                        tone="red"
                    />
                    <KpiCard
                        label="Betting Profit"
                        value={formatCurrency(bettingProfit)}
                        icon={FaChartBar}
                        tone={bettingProfit >= 0 ? 'blue' : 'red'}
                    />
                </StatsGroup>

                <StatsGroup title="Overview" icon={FaUserFriends} gridClass="grid-cols-1 min-[400px]:grid-cols-2 xl:grid-cols-4">
                    <KpiCard
                        label="Total Players"
                        value={stats?.users?.total ?? 0}
                        icon={FaUserFriends}
                        tone="violet"
                    />
                    <KpiCard
                        label="Total Bets"
                        value={stats?.bets?.total ?? 0}
                        icon={FaChartBar}
                        tone="amber"
                    />
                    <KpiCard
                        label="Wallet Balance"
                        value={formatCurrency(stats?.wallet?.totalBalance)}
                        icon={FaWallet}
                        tone="green"
                    />
                    <KpiCard
                        label="Pending Withdraw"
                        value={pendingWithdrawals}
                        icon={FaCreditCard}
                        tone={pendingWithdrawals > 0 ? 'amber' : 'slate'}
                    />
                </StatsGroup>
            </div>

            {/* Detail panels */}
            <section className="mb-8">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-4">
                    <FaClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                    More Details
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                    <SectionCard title="Players" icon={FaUserFriends} linkTo="/all-users" linkLabel="Open">
                        <StatRow label="Total Players" value={stats?.users?.total ?? 0} />
                        <StatRow label="Active" value={stats?.users?.active ?? 0} colorClass="text-emerald-400" />
                        <StatRow label="New in Period" value={stats?.users?.newToday ?? 0} colorClass="text-amber-400" />
                    </SectionCard>

                    <SectionCard title="Bets" icon={FaChartBar} linkTo="/bet-history" linkLabel="Open">
                        <StatRow label="Total Bets" value={stats?.bets?.total ?? 0} />
                        <StatRow label="Winning" value={stats?.bets?.winning ?? 0} colorClass="text-emerald-400" />
                        <StatRow label="Losing" value={stats?.bets?.losing ?? 0} colorClass="text-rose-400" />
                        <StatRow label="Pending" value={stats?.bets?.pending ?? 0} colorClass="text-amber-400" />
                    </SectionCard>

                    <SectionCard title="Markets" icon={FaChartLine} linkTo="/markets" linkLabel="Open">
                        <StatRow label="Total Markets" value={stats?.markets?.total ?? 0} />
                        <StatRow label="Open Now" value={stats?.markets?.open ?? 0} colorClass="text-emerald-400" />
                        <StatRow label="Result Pending" value={marketsPendingResult} colorClass={marketsPendingResult > 0 ? 'text-amber-400' : 'text-gray-400'} />
                    </SectionCard>

                    <SectionCard title="Transactions" icon={FaCreditCard} linkTo="/deposit-withdrawal-history" linkLabel="History">
                        <StatRow label="Deposit" value={formatCurrency(totalDeposits)} colorClass="text-emerald-400" />
                        <StatRow label="Withdrawal" value={formatCurrency(totalWithdrawals)} colorClass="text-rose-400" />
                        <StatRow label="Profit" value={formatCurrency(totalProfit)} colorClass={totalProfit >= 0 ? 'text-sky-400' : 'text-rose-400'} />
                    </SectionCard>

                    <SectionCard title="Wallet" icon={FaWallet} linkTo="/wallet" linkLabel="Open">
                        <StatRow label="Total Balance" value={formatCurrency(stats?.wallet?.totalBalance)} colorClass="text-emerald-400" />
                    </SectionCard>

                    <SectionCard title="Help Desk" icon={FaLifeRing} linkTo="/help-desk" linkLabel="Open">
                        <StatRow label="Open Tickets" value={stats?.helpDesk?.open ?? 0} colorClass="text-amber-400" />
                        <StatRow label="In Progress" value={stats?.helpDesk?.inProgress ?? 0} colorClass="text-sky-400" />
                    </SectionCard>
                </div>
            </section>

            {/* Quick Links */}
            <div className="rounded-2xl p-5 border border-gray-700/80 bg-gray-800/40">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <FaClipboardList className="w-4 h-4 text-amber-400" />
                    Quick Links
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {[
                        { to: '/add-result', label: 'Add Result' },
                        { to: '/update-rate', label: 'Update Rate' },
                        { to: '/add-user', label: 'Add Player' },
                        { to: '/add-market', label: 'Add Market' },
                        { to: '/logs', label: 'Logs' },
                    ].map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className="px-4 py-3 rounded-xl bg-gray-700/80 hover:bg-amber-500/15 border border-gray-600 hover:border-amber-500/50 text-gray-200 hover:text-amber-300 text-sm font-medium transition-all text-center"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminDashboard;
