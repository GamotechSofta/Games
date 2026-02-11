import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { API_BASE_URL, getBookieAuthHeaders } from '../utils/api';
import {
    FaChartLine,
    FaMoneyBillWave,
    FaCoins,
    FaChartBar,
    FaSyncAlt,
    FaCalendarAlt,
    FaChevronRight,
    FaHistory,
    FaTrophy,
    FaUsers,
    FaPrint,
    FaArrowUp,
    FaArrowDown,
    FaPercent,
    FaBuilding,
    FaHandHoldingUsd,
    FaDice,
    FaCreditCard,
} from 'react-icons/fa';

const PRESETS = [
    { id: 'today', label: 'Today', getRange: () => {
        const d = new Date();
        const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { from, to: from };
    }},
    { id: 'yesterday', label: 'Yesterday', getRange: () => {
        const d = new Date(); d.setDate(d.getDate() - 1);
        const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { from, to: from };
    }},
    { id: 'this_week', label: 'This Week', getRange: () => {
        const d = new Date(); const day = d.getDay();
        const sun = new Date(d); sun.setDate(d.getDate() - day);
        const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
        const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
        return { from: fmt(sun), to: fmt(sat) };
    }},
    { id: 'this_month', label: 'This Month', getRange: () => {
        const d = new Date(); const y = d.getFullYear(), m = d.getMonth();
        const last = new Date(y, m + 1, 0);
        return { from: `${y}-${String(m + 1).padStart(2, '0')}-01`, to: `${y}-${String(m + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}` };
    }},
    { id: 'last_month', label: 'Last Month', getRange: () => {
        const d = new Date(); const y = d.getFullYear(), m = d.getMonth() - 1;
        const last = new Date(y, m + 1, 0);
        return { from: `${y}-${String(m + 1).padStart(2, '0')}-01`, to: `${y}-${String(m + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}` };
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

const formatRangeLabel = (from, to) => {
    if (!from || !to) return 'Select dates';
    if (from === to) {
        const d = new Date(from + 'T12:00:00');
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const a = new Date(from + 'T12:00:00');
    const b = new Date(to + 'T12:00:00');
    return `${a.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} \u2013 ${b.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

const SummaryCard = ({ label, value, icon: Icon, gradient, iconBg, iconColor, sub }) => (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl p-4 sm:p-5 border relative overflow-hidden`}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="flex items-center justify-between">
            <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
                <p className={`text-lg sm:text-2xl font-bold mt-1 truncate ${iconColor}`}>{value}</p>
                {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
            </div>
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0 ml-2`}>
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} />
            </div>
        </div>
    </div>
);

const StatBox = ({ label, value, color = 'text-white', borderColor = 'border-gray-600/50' }) => (
    <div className={`bg-gray-700/50 rounded-lg p-3 sm:p-4 border ${borderColor}`}>
        <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={`text-lg sm:text-xl font-bold ${color} mt-1`}>{value}</p>
    </div>
);

const Reports = () => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState(() => {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { startDate: today, endDate: today };
    });
    const [activePreset, setActivePreset] = useState('today');

    useEffect(() => {
        fetchReport();
    }, [dateRange]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `${API_BASE_URL}/reports?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
                { headers: getBookieAuthHeaders() }
            );
            const data = await response.json();
            if (data.success) setReport(data.data);
            else setReport(null);
        } catch (err) {
            console.error('Error fetching report:', err);
            setReport(null);
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

    const handlePrint = () => window.print();

    const isBookieCollects = report?.bookieType === 'bookie_collects';

    return (
        <Layout title="Reports">
            <div className="space-y-4 sm:space-y-6 print:hidden">
                {/* Page header */}
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        <FaChartLine className="w-6 h-6 text-amber-500 shrink-0" />
                        Reports
                    </h1>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">Financial and betting summary for the selected period</p>
                </div>

                {/* Bookie Type Badge */}
                {report && (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        isBookieCollects
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}>
                        {isBookieCollects ? <FaBuilding className="w-3.5 h-3.5" /> : <FaHandHoldingUsd className="w-3.5 h-3.5" />}
                        {isBookieCollects ? 'Bookie Collects' : 'Admin Collects'} Account
                        <span className="text-gray-500 font-normal ml-1">
                            ({isBookieCollects ? 'You collect payments & pay admin platform charge' : 'Admin collects payments & pays you commission'})
                        </span>
                    </div>
                )}

                {/* Date filters */}
                <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 p-3 sm:p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
                        <FaCalendarAlt className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-sm font-medium text-gray-300">Period</span>
                        <span className="text-gray-500 text-xs hidden sm:inline">{formatRangeLabel(dateRange.startDate, dateRange.endDate)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
                        {PRESETS.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => applyPreset(p.id)}
                                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                                    activePreset === p.id ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <input type="date" value={dateRange.startDate}
                            onChange={(e) => { setDateRange((r) => ({ ...r, startDate: e.target.value })); setActivePreset(''); }}
                            className="px-2 sm:px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs sm:text-sm w-[130px] sm:w-auto"
                        />
                        <span className="text-gray-500 text-sm">to</span>
                        <input type="date" value={dateRange.endDate}
                            onChange={(e) => { setDateRange((r) => ({ ...r, endDate: e.target.value })); setActivePreset(''); }}
                            className="px-2 sm:px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs sm:text-sm w-[130px] sm:w-auto"
                        />
                        <button type="button" onClick={fetchReport} disabled={loading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 text-xs sm:text-sm"
                        >
                            <FaSyncAlt className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-gray-800/60 rounded-xl h-24 sm:h-28 animate-pulse border border-gray-700/50" />
                        ))}
                    </div>
                ) : report ? (
                    <>
                        {/* Main Financial Cards */}
                        {isBookieCollects ? (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                <SummaryCard label="Bet Volume" value={formatCurrency(report.totalRevenue)}
                                    icon={FaChartBar} gradient="from-blue-500/10 to-blue-600/5 border-blue-500/30"
                                    iconBg="bg-blue-500/20" iconColor="text-blue-400" sub="Total bets placed" />
                                <SummaryCard label="Payouts" value={formatCurrency(report.totalPayouts)}
                                    icon={FaCoins} gradient="from-red-500/10 to-red-600/5 border-red-500/30"
                                    iconBg="bg-red-500/20" iconColor="text-red-400" sub="Paid to winners" />
                                <SummaryCard label="Platform Charge" value={formatCurrency(report.platformCharge)}
                                    icon={FaBuilding} gradient="from-purple-500/10 to-purple-600/5 border-purple-500/30"
                                    iconBg="bg-purple-500/20" iconColor="text-purple-400" sub={`${report.commissionPercentage}% to admin`} />
                                <SummaryCard label="Your Net Profit" value={formatCurrency(report.bookieNetProfit)}
                                    icon={report.bookieNetProfit >= 0 ? FaArrowUp : FaArrowDown}
                                    gradient={report.bookieNetProfit >= 0 ? 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/30' : 'from-red-500/10 to-red-600/5 border-red-500/40'}
                                    iconBg={report.bookieNetProfit >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}
                                    iconColor={report.bookieNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}
                                    sub="After platform & payouts" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                <SummaryCard label="Bet Volume" value={formatCurrency(report.totalRevenue)}
                                    icon={FaChartBar} gradient="from-blue-500/10 to-blue-600/5 border-blue-500/30"
                                    iconBg="bg-blue-500/20" iconColor="text-blue-400" sub="Total bets placed" />
                                <SummaryCard label="Your Commission" value={formatCurrency(report.bookieShare)}
                                    icon={FaHandHoldingUsd} gradient="from-emerald-500/10 to-emerald-600/5 border-emerald-500/30"
                                    iconBg="bg-emerald-500/20" iconColor="text-emerald-400" sub={`${report.commissionPercentage}% of volume`} />
                                <SummaryCard label="Payouts" value={formatCurrency(report.totalPayouts)}
                                    icon={FaCoins} gradient="from-red-500/10 to-red-600/5 border-red-500/30"
                                    iconBg="bg-red-500/20" iconColor="text-red-400" sub="Handled by admin" />
                                <SummaryCard label="House Edge" value={formatCurrency(report.netProfit)}
                                    icon={report.netProfit >= 0 ? FaArrowUp : FaArrowDown}
                                    gradient={report.netProfit >= 0 ? 'from-amber-500/10 to-amber-600/5 border-amber-500/30' : 'from-red-500/10 to-red-600/5 border-red-500/40'}
                                    iconBg={report.netProfit >= 0 ? 'bg-amber-500/20' : 'bg-red-500/20'}
                                    iconColor={report.netProfit >= 0 ? 'text-amber-400' : 'text-red-400'}
                                    sub="Bets minus payouts" />
                            </div>
                        )}

                        {/* Betting Activity Cards */}
                        <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 p-4 sm:p-5">
                            <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                                <FaDice className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                                Betting Activity
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                <StatBox label="Total Bets" value={formatNumber(report.totalBets)} />
                                <StatBox label="Active Players" value={formatNumber(report.activeUsers)} />
                                <StatBox label="Winning Bets" value={formatNumber(report.winningBets)} color="text-green-400" borderColor="border-green-500/20" />
                                <StatBox label="Losing Bets" value={formatNumber(report.losingBets)} color="text-red-400" borderColor="border-red-500/20" />
                            </div>

                            {/* Win rate bar */}
                            <div className="mt-4 pt-4 border-t border-gray-700/80">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs sm:text-sm text-gray-400">Win Rate</span>
                                    <span className="text-sm sm:text-base font-bold text-white">{report.winRate}%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2.5">
                                    <div
                                        className="h-2.5 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-500"
                                        style={{ width: `${Math.min(Number(report.winRate) || 0, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                                    <span>0% (House wins all)</span>
                                    <span>50%</span>
                                    <span>100% (Players win all)</span>
                                </div>
                            </div>
                        </div>

                        {/* Earnings Breakdown */}
                        <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 p-4 sm:p-5">
                            <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                                <FaMoneyBillWave className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                                Earnings Breakdown
                            </h2>
                            {isBookieCollects ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-gray-700/30">
                                        <span className="text-xs sm:text-sm text-gray-400">Bet Volume (collected by you)</span>
                                        <span className="text-sm sm:text-base font-semibold text-white">{formatCurrency(report.totalRevenue)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-gray-700/30">
                                        <span className="text-xs sm:text-sm text-gray-400">− Platform Charge ({report.commissionPercentage}%)</span>
                                        <span className="text-sm sm:text-base font-semibold text-purple-400">−{formatCurrency(report.platformCharge)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-gray-700/30">
                                        <span className="text-xs sm:text-sm text-gray-400">− Winner Payouts</span>
                                        <span className="text-sm sm:text-base font-semibold text-red-400">−{formatCurrency(report.totalPayouts)}</span>
                                    </div>
                                    <div className={`flex justify-between items-center py-3 px-3 rounded-lg border-2 ${report.bookieNetProfit >= 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                        <span className="text-xs sm:text-sm font-semibold text-gray-300">= Your Net Profit</span>
                                        <span className={`text-base sm:text-lg font-bold ${report.bookieNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(report.bookieNetProfit)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-gray-700/30">
                                        <span className="text-xs sm:text-sm text-gray-400">Bet Volume (admin collects)</span>
                                        <span className="text-sm sm:text-base font-semibold text-white">{formatCurrency(report.totalRevenue)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-gray-700/30">
                                        <span className="text-xs sm:text-sm text-gray-400">× Commission Rate</span>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400">{report.commissionPercentage}%</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 px-3 rounded-lg border-2 border-emerald-500/30 bg-emerald-500/5">
                                        <span className="text-xs sm:text-sm font-semibold text-gray-300">= Your Commission</span>
                                        <span className="text-base sm:text-lg font-bold text-emerald-400">{formatCurrency(report.bookieShare)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-gray-700/20 mt-1">
                                        <span className="text-xs text-gray-500">Winner Payouts (admin handles)</span>
                                        <span className="text-xs font-semibold text-red-400">{formatCurrency(report.totalPayouts)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors"
                            >
                                <FaPrint className="w-3.5 h-3.5" />
                                Print Report
                            </button>
                        </div>

                        {/* Quick links */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {[
                                { to: '/revenue', label: 'Revenue Details', icon: FaMoneyBillWave, description: 'Detailed revenue & commission breakdown', color: 'emerald' },
                                { to: '/bet-history', label: 'Bet History', icon: FaHistory, description: 'View all bets placed by your users', color: '' },
                                { to: '/payments', label: 'Payments', icon: FaCreditCard, description: isBookieCollects ? 'Manage payment requests' : 'View payment history', color: '' },
                                { to: '/my-users', label: 'My Players', icon: FaUsers, description: 'Active players referred by you', color: '' },
                            ].map((item) => (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all group ${
                                        item.color === 'emerald'
                                            ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border-emerald-500/30 hover:border-emerald-400/50'
                                            : 'bg-gray-700/50 border-gray-600/50 hover:border-amber-500/40 hover:bg-gray-700/80'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                            item.color === 'emerald'
                                                ? 'bg-emerald-500/20 group-hover:bg-emerald-500/30'
                                                : 'bg-amber-500/20 group-hover:bg-amber-500/30'
                                        }`}>
                                            <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.color === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-sm font-semibold transition-colors ${
                                                item.color === 'emerald' ? 'text-white group-hover:text-emerald-400' : 'text-white group-hover:text-amber-400'
                                            }`}>{item.label}</p>
                                            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
                                        </div>
                                    </div>
                                    <FaChevronRight className={`w-3.5 h-3.5 shrink-0 ml-2 transition-colors ${
                                        item.color === 'emerald' ? 'text-gray-600 group-hover:text-emerald-400' : 'text-gray-600 group-hover:text-amber-400'
                                    }`} />
                                </Link>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="bg-gray-800/60 rounded-xl border border-gray-700/80 p-8 sm:p-12 text-center">
                        <FaChartLine className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-sm sm:text-lg">No report data available for this period</p>
                        <p className="text-gray-500 text-xs sm:text-sm mt-2">Try a different date range or refresh</p>
                        <button
                            type="button"
                            onClick={fetchReport}
                            className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors text-sm"
                        >
                            Refresh
                        </button>
                    </div>
                )}
            </div>

            {/* Print-only summary */}
            {report && (
                <div className="hidden print:block mt-8 p-6 bg-white text-black rounded-lg">
                    <h2 className="text-xl font-bold mb-2">Report Summary ({isBookieCollects ? 'Bookie Collects' : 'Admin Collects'})</h2>
                    <p className="text-sm text-gray-600 mb-4">{formatRangeLabel(dateRange.startDate, dateRange.endDate)}</p>
                    <table className="w-full text-sm">
                        <tbody>
                            <tr><td className="py-1 font-medium">Bet Volume</td><td className="text-right">{formatCurrency(report.totalRevenue)}</td></tr>
                            <tr><td className="py-1 font-medium">Winner Payouts</td><td className="text-right">{formatCurrency(report.totalPayouts)}</td></tr>
                            {isBookieCollects ? (
                                <>
                                    <tr><td className="py-1 font-medium">Platform Charge ({report.commissionPercentage}%)</td><td className="text-right">{formatCurrency(report.platformCharge)}</td></tr>
                                    <tr className="font-bold border-t"><td className="py-1">Your Net Profit</td><td className="text-right">{formatCurrency(report.bookieNetProfit)}</td></tr>
                                </>
                            ) : (
                                <>
                                    <tr><td className="py-1 font-medium">Your Commission ({report.commissionPercentage}%)</td><td className="text-right">{formatCurrency(report.bookieShare)}</td></tr>
                                </>
                            )}
                            <tr><td className="py-1 font-medium">Total Bets</td><td className="text-right">{formatNumber(report.totalBets)}</td></tr>
                            <tr><td className="py-1 font-medium">Active Players</td><td className="text-right">{formatNumber(report.activeUsers)}</td></tr>
                            <tr><td className="py-1 font-medium">Win Rate</td><td className="text-right">{report.winRate}%</td></tr>
                        </tbody>
                    </table>
                </div>
            )}
        </Layout>
    );
};

export default Reports;
