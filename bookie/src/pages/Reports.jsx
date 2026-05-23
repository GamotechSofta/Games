import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { API_BASE_URL, bookieFetch } from '../utils/api';
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
    {
        id: 'today', label: 'Today', getRange: () => {
            const d = new Date();
            const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return { from, to: from };
        }
    },
    {
        id: 'yesterday', label: 'Yesterday', getRange: () => {
            const d = new Date(); d.setDate(d.getDate() - 1);
            const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return { from, to: from };
        }
    },
    {
        id: 'this_week', label: 'This Week', getRange: () => {
            const d = new Date(); const day = d.getDay();
            const sun = new Date(d); sun.setDate(d.getDate() - day);
            const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
            const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
            return { from: fmt(sun), to: fmt(sat) };
        }
    },
    {
        id: 'this_month', label: 'This Month', getRange: () => {
            const d = new Date(); const y = d.getFullYear(), m = d.getMonth();
            const last = new Date(y, m + 1, 0);
            return { from: `${y}-${String(m + 1).padStart(2, '0')}-01`, to: `${y}-${String(m + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}` };
        }
    },
    {
        id: 'last_month', label: 'Last Month', getRange: () => {
            const d = new Date(); const y = d.getFullYear(), m = d.getMonth() - 1;
            const last = new Date(y, m + 1, 0);
            return { from: `${y}-${String(m + 1).padStart(2, '0')}-01`, to: `${y}-${String(m + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}` };
        }
    },
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
    <div className={`glass-panel glass-panel-card p-6 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300`}>
        <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
            <Icon className={`w-24 h-24 ${iconColor}`} />
        </div>
        <div className="relative z-10">
            <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-4 border border-slate-200`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-2 font-medium">{sub}</p>}
        </div>
    </div>
);

const StatBox = ({ label, value, color = 'text-slate-900', borderColor = 'border-slate-200' }) => (
    <div className={`bg-black/20 rounded-xl p-4 border ${borderColor}`}>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-xl font-mono font-bold ${color}`}>{value}</p>
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
            const response = await bookieFetch(
                `${API_BASE_URL}/reports?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
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
            <div className="max-w-[1600px] mx-auto space-y-8 print:hidden">
                {/* Page header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
                            <FaChartLine className="text-amber-500" />
                            Financial Reports
                        </h1>
                        <p className="text-slate-600 text-sm mt-1">
                            Performance summary for <span className="text-slate-900 font-medium">{formatRangeLabel(dateRange.startDate, dateRange.endDate)}</span>
                        </p>
                    </div>

                    {report && (
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide border ${isBookieCollects
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                            {isBookieCollects ? <FaBuilding className="w-4 h-4" /> : <FaHandHoldingUsd className="w-4 h-4" />}
                            <div>
                                <span className="block">{isBookieCollects ? 'Bookie Collects' : 'Admin Collects'}</span>
                                <span className="block text-[10px] opacity-70 normal-case font-normal">
                                    {isBookieCollects ? 'You manage payouts' : 'Admin manages payouts'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Date filters */}
                <div className="glass-panel glass-panel-card px-4 py-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 shrink-0">
                            <FaCalendarAlt className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-medium text-slate-400 hidden sm:inline">Date Range</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            {PRESETS.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => applyPreset(p.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activePreset === p.id
                                            ? 'bg-amber-500 text-black'
                                            : 'bg-white/5 text-slate-600 hover:bg-white/10 hover:text-slate-900'
                                        }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                            <input type="date" value={dateRange.startDate}
                                onChange={(e) => { setDateRange((r) => ({ ...r, startDate: e.target.value })); setActivePreset(''); }}
                                className="bg-white text-slate-900 text-xs px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500/50 "
                            />
                            <span className="text-slate-500 text-xs">to</span>
                            <input type="date" value={dateRange.endDate}
                                onChange={(e) => { setDateRange((r) => ({ ...r, endDate: e.target.value })); setActivePreset(''); }}
                                className="bg-white text-slate-900 text-xs px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500/50 "
                            />
                            <button type="button" onClick={fetchReport} disabled={loading}
                                className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition-colors disabled:opacity-50"
                                title="Refresh Data"
                            >
                                <FaSyncAlt className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="glass-panel h-40 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : report ? (
                    <>
                        {/* Main Financial Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {isBookieCollects ? (
                                <>
                                    <SummaryCard label="Bet Volume" value={formatCurrency(report.totalRevenue)}
                                        icon={FaChartBar} iconBg="bg-blue-500/10" iconColor="text-blue-400" sub="Total bets placed" />
                                    <SummaryCard label="Payouts" value={formatCurrency(report.totalPayouts)}
                                        icon={FaCoins} iconBg="bg-red-500/10" iconColor="text-red-400" sub="Paid to winners" />
                                    <SummaryCard label="Platform Charge" value={formatCurrency(report.platformCharge)}
                                        icon={FaBuilding} iconBg="bg-purple-500/10" iconColor="text-purple-400" sub={`${report.commissionPercentage}% to admin`} />
                                    <SummaryCard label="Your Net Profit" value={formatCurrency(report.bookieNetProfit)}
                                        icon={report.bookieNetProfit >= 0 ? FaArrowUp : FaArrowDown}
                                        iconBg={report.bookieNetProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
                                        iconColor={report.bookieNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}
                                        sub={report.netProfitPercentage !== null && report.netProfitPercentage !== undefined 
                                            ? `After platform & payouts (${report.netProfitPercentage.toFixed(2)}% of revenue)`
                                            : "After platform & payouts"} />
                                </>
                            ) : (
                                <>
                                    <SummaryCard label="Bet Volume" value={formatCurrency(report.totalRevenue)}
                                        icon={FaChartBar} iconBg="bg-blue-500/10" iconColor="text-blue-400" sub="Total bets placed" />
                                    <SummaryCard label="Your Commission" value={formatCurrency(report.bookieShare)}
                                        icon={FaHandHoldingUsd} iconBg="bg-emerald-500/10" iconColor="text-emerald-400" 
                                        sub={report.netProfitPercentage !== null && report.netProfitPercentage !== undefined 
                                            ? `${report.commissionPercentage}% of volume (${report.netProfitPercentage.toFixed(2)}% net profit)`
                                            : `${report.commissionPercentage}% of volume`} />
                                    <SummaryCard label="Payouts" value={formatCurrency(report.totalPayouts)}
                                        icon={FaCoins} iconBg="bg-red-500/10" iconColor="text-red-400" sub="Handled by admin" />
                                    <SummaryCard label="House Edge" value={formatCurrency(report.netProfit)}
                                        icon={report.netProfit >= 0 ? FaArrowUp : FaArrowDown}
                                        iconBg={report.netProfit >= 0 ? 'bg-amber-500/10' : 'bg-red-500/10'}
                                        iconColor={report.netProfit >= 0 ? 'text-amber-400' : 'text-red-400'}
                                        sub="Bets minus payouts" />
                                </>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Betting Activity Cards */}
                            <div className="glass-panel glass-panel-card p-6 rounded-2xl border border-slate-200">
                                <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                        <FaDice className="w-4 h-4 text-amber-500" />
                                    </div>
                                    Betting Activity
                                </h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <StatBox label="Total Bets" value={formatNumber(report.totalBets)} />
                                    <StatBox label="Active Players" value={formatNumber(report.activeUsers)} />
                                    <StatBox label="Winning Bets" value={formatNumber(report.winningBets)} color="text-green-400" borderColor="border-green-500/20" />
                                    <StatBox label="Losing Bets" value={formatNumber(report.losingBets)} color="text-red-400" borderColor="border-red-500/20" />
                                </div>

                                {/* Win rate bar */}
                                <div className="mt-8 pt-6 border-t border-slate-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Win Rate</span>
                                        <span className="text-sm font-bold text-slate-900 mb-1 block">{report.winRate}%</span>
                                    </div>
                                    <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 transition-all duration-1000 ease-out"
                                            style={{ width: `${Math.min(Number(report.winRate) || 0, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-2 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                                        <span>0% (House Wins)</span>
                                        <span>50%</span>
                                        <span>100% (Players Win)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Earnings Breakdown */}
                            <div className="glass-panel glass-panel-card p-6 rounded-2xl border border-slate-200">
                                <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                        <FaMoneyBillWave className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    Earnings Breakdown
                                </h2>
                                <div className="space-y-4 font-mono text-sm">
                                    {isBookieCollects ? (
                                        <>
                                            <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-black/20 border border-slate-200">
                                                <span className="text-slate-400 font-sans">Bet Volume</span>
                                                <span className="font-bold text-slate-900">{formatCurrency(report.totalRevenue)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-black/20 border border-slate-200">
                                                <span className="text-slate-400 font-sans">− Platform Charge ({report.commissionPercentage}%)</span>
                                                <span className="font-bold text-purple-400">−{formatCurrency(report.platformCharge)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-black/20 border border-slate-200">
                                                <span className="text-slate-400 font-sans">− Winner Payouts</span>
                                                <span className="font-bold text-red-400">−{formatCurrency(report.totalPayouts)}</span>
                                            </div>
                                            <div className={`flex justify-between items-center py-4 px-4 rounded-xl border-t-2 mt-4 ${report.bookieNetProfit >= 0 ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
                                                <div>
                                                    <span className="font-bold text-slate-300 font-sans uppercase tracking-wider text-xs block">Your Net Profit</span>
                                                    {report.netProfitPercentage !== null && report.netProfitPercentage !== undefined && (
                                                        <span className="text-xs text-slate-500 font-sans mt-1 block">
                                                            {report.netProfitPercentage.toFixed(2)}% of revenue
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={`text-xl font-bold ${report.bookieNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(report.bookieNetProfit)}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-black/20 border border-slate-200">
                                                <span className="text-slate-400 font-sans">Bet Volume</span>
                                                <span className="font-bold text-slate-900">{formatCurrency(report.totalRevenue)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-black/20 border border-slate-200">
                                                <span className="text-slate-400 font-sans">× Commission Rate</span>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 font-sans">{report.commissionPercentage}%</span>
                                            </div>
                                            <div className="flex justify-between items-center py-4 px-4 rounded-xl border-t-2 border-emerald-500/50 bg-emerald-500/5 mt-4">
                                                <div>
                                                    <span className="font-bold text-slate-300 font-sans uppercase tracking-wider text-xs block">Your Commission</span>
                                                    {report.netProfitPercentage !== null && report.netProfitPercentage !== undefined && (
                                                        <span className="text-xs text-slate-500 font-sans mt-1 block">
                                                            {report.netProfitPercentage.toFixed(2)}% of revenue
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xl font-bold text-emerald-400">{formatCurrency(report.bookieShare)}</span>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-200">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500 font-sans">Winner Payouts (Handled by Admin)</span>
                                                    <span className="text-red-400 font-bold">{formatCurrency(report.totalPayouts)}</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-slate-100 text-slate-900 rounded-xl text-sm font-bold transition-colors border border-slate-200"
                            >
                                <FaPrint className="w-4 h-4 text-slate-400" />
                                Print Report
                            </button>
                        </div>

                        {/* Quick links */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { to: '/revenue', label: 'Revenue Details', icon: FaMoneyBillWave, description: 'Revenue breakdown', color: 'emerald' },
                                { to: '/bet-history', label: 'Bet History', icon: FaHistory, description: 'View all placed bets', color: 'blue' },
                                { to: '/wallet?tab=transactions', label: 'Transactions', icon: FaCreditCard, description: 'Deposits & wallet activity', color: 'purple' },
                                { to: '/my-users', label: 'My Players', icon: FaUsers, description: 'Active player list', color: 'amber' },
                            ].map((item) => (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    className="glass-panel glass-panel-card p-4 rounded-xl border border-slate-200 hover:border-white/20 transition-all group flex items-center gap-4"
                                >
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-colors bg-${item.color}-500/10`}>
                                        <item.icon className={`w-5 h-5 text-${item.color}-400`} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm group-hover:text-amber-400 transition-colors">{item.label}</p>
                                        <p className="text-xs text-slate-500">{item.description}</p>
                                    </div>
                                    <FaChevronRight className="w-3 h-3 text-slate-600 ml-auto group-hover:translate-x-1 transition-transform" />
                                </Link>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="glass-panel glass-panel-card p-16 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <FaChartLine className="w-8 h-8 text-slate-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Data Available</h3>
                        <p className="text-slate-400 max-w-sm mx-auto mb-6">
                            There are no betting records for the selected date range. Try selecting a different period.
                        </p>
                        <button
                            type="button"
                            onClick={fetchReport}
                            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors"
                        >
                            Refresh Data
                        </button>
                    </div>
                )}
            </div>

            {/* Print-only summary */}
            {report && (
                <div className="hidden print:block mt-8 p-8 bg-white text-black rounded-xl border border-gray-200">
                    <div className="mb-6 border-b pb-6">
                        <h2 className="text-2xl font-bold mb-1">Financial Report</h2>
                        <p className="text-sm text-gray-500">{isBookieCollects ? 'Bookie Collects Account' : 'Admin Collects Account'}</p>
                        <p className="text-sm text-gray-500 mt-2">Period: {formatRangeLabel(dateRange.startDate, dateRange.endDate)}</p>
                    </div>

                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-2 px-3 text-left font-bold text-gray-600 border-b">Category</th>
                                <th className="py-2 px-3 text-right font-bold text-gray-600 border-b">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td className="py-3 px-3 border-b">Bet Volume</td><td className="py-3 px-3 border-b text-right font-mono">{formatCurrency(report.totalRevenue)}</td></tr>
                            <tr><td className="py-3 px-3 border-b">Winner Payouts</td><td className="py-3 px-3 border-b text-right font-mono">{formatCurrency(report.totalPayouts)}</td></tr>
                            {isBookieCollects ? (
                                <>
                                    <tr><td className="py-3 px-3 border-b">Platform Charge ({report.commissionPercentage}%)</td><td className="py-3 px-3 border-b text-right font-mono">{formatCurrency(report.platformCharge)}</td></tr>
                                    <tr className="bg-gray-50 font-bold">
                                        <td className="py-3 px-3 border-b">
                                            Your Net Profit{report.netProfitPercentage !== null && report.netProfitPercentage !== undefined ? ` (${report.netProfitPercentage.toFixed(2)}%)` : ''}
                                        </td>
                                        <td className="py-3 px-3 border-b text-right font-mono">{formatCurrency(report.bookieNetProfit)}</td>
                                    </tr>
                                </>
                            ) : (
                                <>
                                    <tr className="bg-gray-50 font-bold">
                                        <td className="py-3 px-3 border-b">
                                            Your Commission ({report.commissionPercentage}%){report.netProfitPercentage !== null && report.netProfitPercentage !== undefined ? ` - ${report.netProfitPercentage.toFixed(2)}% net profit` : ''}
                                        </td>
                                        <td className="py-3 px-3 border-b text-right font-mono">{formatCurrency(report.bookieShare)}</td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>

                    <div className="mt-8 grid grid-cols-3 gap-4">
                        <div className="p-4 border rounded bg-gray-50">
                            <p className="text-xs text-gray-500 uppercase">Total Bets</p>
                            <p className="text-xl font-bold">{formatNumber(report.totalBets)}</p>
                        </div>
                        <div className="p-4 border rounded bg-gray-50">
                            <p className="text-xs text-gray-500 uppercase">Active Players</p>
                            <p className="text-xl font-bold">{formatNumber(report.activeUsers)}</p>
                        </div>
                        <div className="p-4 border rounded bg-gray-50">
                            <p className="text-xs text-gray-500 uppercase">Win Rate</p>
                            <p className="text-xl font-bold">{report.winRate}%</p>
                        </div>
                    </div>

                    <div className="mt-12 text-center text-xs text-gray-400">
                        Generated on {new Date().toLocaleString()}
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Reports;
