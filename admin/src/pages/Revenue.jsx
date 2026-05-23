import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useNavigate, Link } from 'react-router-dom';
import {
    FaMoneyBillWave,
    FaCoins,
    FaSyncAlt,
    FaCalendarAlt,
    FaUsers,
    FaChartBar,
    FaPrint,
    FaUserTie,
    FaArrowUp,
    FaArrowDown,
    FaPercent,
    FaUserShield,
    FaHandHoldingUsd,
} from 'react-icons/fa';
import { clearAdminAuth, adminFetch, API_BASE_URL } from '../utils/api';

const PRESETS = [
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
        const sun = new Date(d); sun.setDate(d.getDate() - day);
        const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
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

const formatCurrency = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return '\u20B90';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(num);
};

const formatNumber = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return '0';
    return new Intl.NumberFormat('en-IN').format(num);
};

const TABS = [
    { id: 'direct', label: 'Admin Direct Users collects', icon: FaUserShield, color: 'blue', desc: 'Players registered directly with admin (no bookie)' },
    { id: 'admin_collects', label: 'Bookie users Collects', icon: FaHandHoldingUsd, color: 'emerald', desc: 'Players under bookies — admin collects bets, pays bookie commission' },
];

// ======================== SUMMARY CARDS ========================

const DirectSummaryCards = ({ stats }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <SummaryCard label="Bets Volume" value={formatCurrency(stats.totalBetAmount)} color="blue" icon={FaChartBar} />
        <SummaryCard label="Payouts" value={formatCurrency(stats.totalPayouts)} color="red" icon={FaCoins} />
        <ProfitCard label="Admin Profit" value={stats.adminProfit} className="col-span-2 sm:col-span-1" />
    </div>
);

const AdminCollectsSummaryCards = ({ summary }) => (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <SummaryCard label="Bets Volume" value={formatCurrency(summary.totalBets)} color="blue" icon={FaChartBar} />
        <SummaryCard label="Payouts" value={formatCurrency(summary.totalPayouts)} color="red" icon={FaCoins} />
        <SummaryCard label="Bookie Commission" value={formatCurrency(summary.totalBookieShare)} color="orange" icon={FaUserTie} sub="Paid to bookies" />
        <ProfitCard label="Admin Profit" value={summary.totalAdminProfit} />
    </div>
);

const SummaryCard = ({ label, value, color, icon: Icon, sub, className = '' }) => {
    const colors = {
        blue: { bar: 'from-blue-500 to-blue-400', text: 'text-blue-400', bg: 'bg-blue-500/15' },
        red: { bar: 'from-red-500 to-red-400', text: 'text-red-400', bg: 'bg-red-500/15' },
        orange: { bar: 'from-orange-500 to-orange-400', text: 'text-orange-400', bg: 'bg-orange-500/15' },
        emerald: { bar: 'from-emerald-500 to-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/15' },
        purple: { bar: 'from-purple-500 to-purple-400', text: 'text-purple-400', bg: 'bg-purple-500/15' },
    };
    const c = colors[color] || colors.blue;
    return (
        <div className={`bg-gray-800/80 rounded-xl p-3 sm:p-5 border border-gray-700/60 relative overflow-hidden ${className}`}>
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${c.bar}`} />
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
                    <p className={`text-base sm:text-xl lg:text-2xl font-bold ${c.text} mt-1 truncate`}>{value}</p>
                    {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
                </div>
                {Icon && (
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${c.text}`} />
                    </div>
                )}
            </div>
        </div>
    );
};

const ProfitCard = ({ label, value, className = '' }) => {
    const profit = Number(value) || 0;
    const isPositive = profit >= 0;
    return (
        <div className={`bg-gray-800/80 rounded-xl p-3 sm:p-5 border relative overflow-hidden ${isPositive ? 'border-emerald-500/40' : 'border-red-500/40'} ${className}`}>
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isPositive ? 'from-emerald-500 to-emerald-400' : 'from-red-500 to-red-400'}`} />
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
                    <p className={`text-base sm:text-xl lg:text-2xl font-bold mt-1 truncate ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(profit)}
                    </p>
                </div>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${isPositive ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                    {isPositive ? <FaArrowUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" /> : <FaArrowDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />}
                </div>
            </div>
        </div>
    );
};

// ======================== TABLES ========================

const AdminCollectsTable = ({ bookies }) => {
    const sorted = [...bookies].sort((a, b) => b.totalBetAmount - a.totalBetAmount);
    if (sorted.length === 0) return <EmptyState text="No bookie player revenue for this period" />;
    return (
        <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-700/40 text-gray-400 text-[11px] uppercase tracking-wider">
                            <th className="text-left px-4 py-3 font-medium">Bookie</th>
                            <th className="text-right px-3 py-3 font-medium">Users</th>
                            <th className="text-right px-3 py-3 font-medium">Total Bets</th>
                            <th className="text-right px-3 py-3 font-medium">Payouts</th>
                            <th className="text-center px-3 py-3 font-medium">Commission %</th>
                            <th className="text-right px-3 py-3 font-medium">Bookie Commission</th>
                            <th className="text-right px-3 py-3 font-medium">Admin Keeps</th>
                            <th className="text-right px-4 py-3 font-medium">Admin Profit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/40">
                        {sorted.map((b) => (
                            <tr key={b.bookieId} className="hover:bg-gray-700/20 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${b.bookieStatus === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                        <div className="min-w-0">
                                            <Link to={`/revenue/${b.bookieId}`} className="font-medium text-white truncate hover:text-amber-400 transition-colors">{b.bookieName}</Link>
                                            {b.bookiePhone && <p className="text-[11px] text-gray-500">{b.bookiePhone}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className="text-right px-3 py-3 text-gray-300 text-xs">{formatNumber(b.totalUsers)}</td>
                                <td className="text-right px-3 py-3 text-white font-medium">{formatCurrency(b.totalBetAmount)}</td>
                                <td className="text-right px-3 py-3 text-red-400">{formatCurrency(b.totalPayouts)}</td>
                                <td className="text-center px-3 py-3">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400">{b.commissionPercentage}%</span>
                                </td>
                                <td className="text-right px-3 py-3 text-orange-400 font-medium">{formatCurrency(b.bookieShare)}</td>
                                <td className="text-right px-3 py-3 text-gray-300">{formatCurrency(b.adminPool)}</td>
                                <td className={`text-right px-4 py-3 font-semibold ${b.adminProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(b.adminProfit)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-700/40">
                {sorted.map((b) => (
                    <BookieMobileCard key={b.bookieId} b={b} />
                ))}
            </div>
        </>
    );
};

const DirectUsersSection = ({ stats }) => {
    if (!stats || stats.totalBetAmount === 0) return <EmptyState text="No direct user activity for this period" />;
    return (
        <div className="p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-700/30 rounded-xl px-4 py-3">
                    <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Users</p>
                    <p className="text-sm sm:text-lg font-bold text-white mt-1">{formatNumber(stats.totalUsers || 0)}</p>
                </div>
                <div className="bg-gray-700/30 rounded-xl px-4 py-3">
                    <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Total Bets</p>
                    <p className="text-sm sm:text-lg font-bold text-blue-400 mt-1">{formatCurrency(stats.totalBetAmount)}</p>
                </div>
                <div className="bg-gray-700/30 rounded-xl px-4 py-3">
                    <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Payouts</p>
                    <p className="text-sm sm:text-lg font-bold text-red-400 mt-1">{formatCurrency(stats.totalPayouts)}</p>
                </div>
                <div className="bg-gray-700/30 rounded-xl px-4 py-3">
                    <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Admin Profit</p>
                    <p className={`text-sm sm:text-lg font-bold mt-1 ${stats.adminProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(stats.adminProfit)}</p>
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
                Admin direct users have no bookie — 100% of bet volume goes to admin. Profit = Bets − Payouts.
            </p>
        </div>
    );
};

// ======================== HELPERS ========================

const BookieMobileCard = ({ b }) => (
    <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${b.bookieStatus === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <div className="min-w-0">
                    <Link to={`/revenue/${b.bookieId}`} className="font-semibold text-white text-sm truncate hover:text-amber-400 transition-colors">{b.bookieName}</Link>
                    {b.bookiePhone && <p className="text-[11px] text-gray-500">{b.bookiePhone}</p>}
                </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 bg-amber-500/15 text-amber-400">
                {b.commissionPercentage}%
            </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-700/30 rounded-lg px-2.5 py-2">
                <p className="text-[10px] text-gray-500 uppercase">Bets</p>
                <p className="text-xs font-semibold text-white truncate">{formatCurrency(b.totalBetAmount)}</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg px-2.5 py-2">
                <p className="text-[10px] text-gray-500 uppercase">Payouts</p>
                <p className="text-xs font-semibold text-red-400 truncate">{formatCurrency(b.totalPayouts)}</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg px-2.5 py-2">
                <p className="text-[10px] text-gray-500 uppercase">Bookie Comm.</p>
                <p className="text-xs font-semibold truncate text-orange-400">
                    {formatCurrency(b.bookieShare)}
                </p>
            </div>
            <div className="bg-gray-700/30 rounded-lg px-2.5 py-2">
                <p className="text-[10px] text-gray-500 uppercase">Admin Profit</p>
                <p className={`text-xs font-semibold truncate ${b.adminProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(b.adminProfit)}
                </p>
            </div>
        </div>
        <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
            <span>{formatNumber(b.totalUsers)} users</span>
            <span>Admin keeps: {formatCurrency(b.adminPool)}</span>
        </div>
    </div>
);

const EmptyState = ({ text }) => (
    <div className="p-8 sm:p-12 text-center">
        <FaMoneyBillWave className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">{text}</p>
    </div>
);

// ======================== MAIN COMPONENT ========================

const Revenue = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('direct');
    const [dateRange, setDateRange] = useState(() => {
        const d = new Date();
        const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
        const today = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { startDate: today, endDate: today };
    });
    const [activePreset, setActivePreset] = useState('today');

    useEffect(() => {
        fetchRevenue();
    }, [dateRange]);

    const fetchRevenue = async () => {
        try {
            setLoading(true);
            const response = await adminFetch(
                `${API_BASE_URL}/reports/revenue?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
            );
            const result = await response.json();
            if (result.success) setData(result.data);
            else setData(null);
        } catch (err) {
            console.error('Error fetching revenue:', err);
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    const applyPreset = (presetId) => {
        const preset = PRESETS.find((p) => p.id === presetId);
        if (preset) {
            const { from, to } = preset.getRange();
            setDateRange({ startDate: from, endDate: to });
            setActivePreset(presetId);
        }
    };

    const handleLogout = () => {
        clearAdminAuth();
        navigate('/');
    };

    const bookies = data?.bookies || [];
    const direct = data?.directUsers;
    const bookieUsersBookies = bookies.filter((b) => (b.bookieType || 'admin_collects') !== 'bookie_collects');
    const acSummary = data?.bookieUsersSummary || data?.adminCollectsSummary || {};
    const overallSummary = data?.summary;

    return (
        <AdminLayout onLogout={handleLogout} title="Revenue">
            <div className="space-y-4 sm:space-y-6 print:hidden">
                {/* Header */}
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                        <FaMoneyBillWave className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 shrink-0" />
                        Revenue
                    </h1>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">Revenue — Admin direct users and bookie players</p>
                </div>

                {/* Date filters */}
                <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 p-3 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <FaCalendarAlt className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-sm font-medium text-gray-300">Period</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                        {PRESETS.map((p) => (
                            <button key={p.id} type="button" onClick={() => applyPreset(p.id)}
                                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                                    activePreset === p.id ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >{p.label}</button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <input type="date" value={dateRange.startDate}
                            onChange={(e) => { setDateRange((r) => ({ ...r, startDate: e.target.value })); setActivePreset(''); }}
                            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 w-[130px] sm:w-auto"
                        />
                        <span className="text-gray-500 text-sm">to</span>
                        <input type="date" value={dateRange.endDate}
                            onChange={(e) => { setDateRange((r) => ({ ...r, endDate: e.target.value })); setActivePreset(''); }}
                            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 w-[130px] sm:w-auto"
                        />
                        <button type="button" onClick={fetchRevenue} disabled={loading}
                            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 text-xs sm:text-sm"
                        >
                            <FaSyncAlt className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                    </div>
                </div>

                {/* Overall summary — highlighted */}
                {!loading && data && overallSummary && (
                    <div className="rounded-xl border-2 border-amber-500/40 bg-gradient-to-br from-gray-800/90 to-gray-900/90 p-4 sm:p-5 shadow-lg shadow-amber-500/5">
                        <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3 sm:mb-4">Overall</p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-3 sm:px-4 sm:py-4">
                                <p className="text-[10px] sm:text-xs font-semibold text-blue-300/90 uppercase tracking-wide">Bets</p>
                                <p className="text-lg sm:text-2xl font-bold text-blue-400 mt-1">{formatCurrency(overallSummary.grandTotalBets)}</p>
                            </div>
                            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-3 sm:px-4 sm:py-4">
                                <p className="text-[10px] sm:text-xs font-semibold text-red-300/90 uppercase tracking-wide">Payouts</p>
                                <p className="text-lg sm:text-2xl font-bold text-red-400 mt-1">{formatCurrency(overallSummary.grandTotalPayouts)}</p>
                            </div>
                            <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-3 sm:px-4 sm:py-4">
                                <p className="text-[10px] sm:text-xs font-semibold text-orange-300/90 uppercase tracking-wide">Bookie Commission</p>
                                <p className="text-lg sm:text-2xl font-bold text-orange-400 mt-1">{formatCurrency(overallSummary.totalBookieCommission)}</p>
                            </div>
                            <div className={`rounded-lg border-2 px-3 py-3 sm:px-4 sm:py-4 col-span-2 lg:col-span-1 ${
                                overallSummary.totalAdminProfit >= 0
                                    ? 'border-emerald-400/60 bg-emerald-500/15 ring-1 ring-emerald-400/30'
                                    : 'border-red-400/60 bg-red-500/15 ring-1 ring-red-400/30'
                            }`}>
                                <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide ${
                                    overallSummary.totalAdminProfit >= 0 ? 'text-emerald-300' : 'text-red-300'
                                }`}>Total Net Profit</p>
                                <p className={`text-xl sm:text-2xl font-extrabold mt-1 ${
                                    overallSummary.totalAdminProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                                }`}>{formatCurrency(overallSummary.totalAdminProfit)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-gray-800/60 rounded-xl h-24 sm:h-28 animate-pulse border border-gray-700/50" />
                        ))}
                    </div>
                ) : data ? (
                    <>
                        {/* Tabs */}
                        <div className="flex flex-wrap gap-2">
                            {TABS.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                const colorMap = {
                                    blue: isActive ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600',
                                    emerald: isActive ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600',
                                };
                                return (
                                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 text-xs sm:text-sm font-semibold transition-all ${colorMap[tab.color]}`}
                                    >
                                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab description */}
                        <p className="text-xs text-gray-500 -mt-2">{TABS.find(t => t.id === activeTab)?.desc}</p>

                        {/* Tab Content */}
                        {activeTab === 'direct' && (
                            <>
                                <DirectSummaryCards stats={direct || { totalBetAmount: 0, totalPayouts: 0, adminProfit: 0 }} />
                                <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 overflow-hidden">
                                    <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-700/80">
                                        <h2 className="text-sm sm:text-lg font-semibold text-white flex items-center gap-2">
                                            <FaUserShield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                                            Admin Direct Users collects
                                        </h2>
                                    </div>
                                    <DirectUsersSection stats={direct} />
                                </div>
                            </>
                        )}

                        {activeTab === 'admin_collects' && (
                            <>
                                <AdminCollectsSummaryCards summary={acSummary} />
                                <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 overflow-hidden">
                                    <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-700/80">
                                        <h2 className="text-sm sm:text-lg font-semibold text-white flex items-center gap-2">
                                            <FaHandHoldingUsd className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                                            Bookie users Collects — Breakdown
                                        </h2>
                                        <p className="text-[11px] text-gray-500 mt-0.5">Players under bookies. Admin collects bets and pays bookie commission %.</p>
                                    </div>
                                    <AdminCollectsTable bookies={bookieUsersBookies} />
                                </div>
                            </>
                        )}

                        {/* Print */}
                        <div className="flex flex-wrap gap-3">
                            <button type="button" onClick={() => window.print()}
                                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors"
                            >
                                <FaPrint className="w-3.5 h-3.5" /> Print Report
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="bg-gray-800/60 rounded-xl border border-gray-700/80 p-8 sm:p-12 text-center">
                        <FaMoneyBillWave className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-base sm:text-lg">No revenue data available</p>
                        <p className="text-gray-500 text-xs sm:text-sm mt-2">Try a different date range or refresh</p>
                        <button type="button" onClick={fetchRevenue}
                            className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors text-sm"
                        >Refresh</button>
                    </div>
                )}
            </div>

            {/* Print-only */}
            {data && (
                <div className="hidden print:block mt-8 p-6 bg-white text-black rounded-lg">
                    <h2 className="text-xl font-bold mb-2">Revenue Report ({dateRange.startDate} to {dateRange.endDate})</h2>

                    <h3 className="text-lg font-semibold mt-4 mb-2">Admin Direct Users collects</h3>
                    <p>Bets: {formatCurrency(direct?.totalBetAmount)} | Payouts: {formatCurrency(direct?.totalPayouts)} | Profit: {formatCurrency(direct?.adminProfit)}</p>

                    <h3 className="text-lg font-semibold mt-4 mb-2">Bookie users Collects</h3>
                    <table className="w-full text-sm border-collapse mb-4">
                        <thead><tr className="border-b-2 border-gray-300">
                            <th className="text-left py-2">Bookie</th><th className="text-right py-2">Bets</th><th className="text-right py-2">Payouts</th>
                            <th className="text-center py-2">Comm %</th><th className="text-right py-2">Commission</th><th className="text-right py-2">Admin Profit</th>
                        </tr></thead>
                        <tbody>
                            {bookieUsersBookies.map((b) => (
                                <tr key={b.bookieId} className="border-b border-gray-200">
                                    <td className="py-1.5">{b.bookieName}</td><td className="text-right py-1.5">{formatCurrency(b.totalBetAmount)}</td>
                                    <td className="text-right py-1.5">{formatCurrency(b.totalPayouts)}</td><td className="text-center py-1.5">{b.commissionPercentage}%</td>
                                    <td className="text-right py-1.5">{formatCurrency(b.bookieShare)}</td><td className="text-right py-1.5">{formatCurrency(b.adminProfit)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="border-t-2 border-gray-400 pt-2 font-bold">
                        Overall: Bets {formatCurrency(overallSummary?.grandTotalBets)} | Payouts {formatCurrency(overallSummary?.grandTotalPayouts)} | Total Net Profit {formatCurrency(overallSummary?.totalAdminProfit)}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default Revenue;
