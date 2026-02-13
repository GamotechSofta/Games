import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { API_BASE_URL, getBookieAuthHeaders } from '../utils/api';
import {
    FaMoneyBillWave,
    FaSyncAlt,
    FaCalendarAlt,
    FaChevronRight,
    FaUsers,
    FaBuilding,
    FaHandHoldingUsd,
    FaArrowUp,
    FaArrowDown,
    FaPercent,
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

const Revenue = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState(() => {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { startDate: today, endDate: today };
    });
    const [activePreset, setActivePreset] = useState('today');

    useEffect(() => { fetchRevenue(); }, [dateRange]);

    const fetchRevenue = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `${API_BASE_URL}/reports/revenue?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
                { headers: getBookieAuthHeaders() }
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

    const isBookieCollects = data?.bookieType === 'bookie_collects';

    return (
        <Layout title="Revenue">
            <div className="max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
                            <FaMoneyBillWave className="text-emerald-500" />
                            Revenue Analysis
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {isBookieCollects
                                ? 'Track your earnings after deductions'
                                : 'Track your commission earnings'}
                        </p>
                    </div>

                    {data && (
                        <div className={`glass-panel px-5 py-3 rounded-xl flex items-center gap-3 border ${isBookieCollects ? 'border-purple-500/20' : 'border-emerald-500/20'
                            }`}>
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isBookieCollects ? 'bg-purple-500/10' : 'bg-emerald-500/10'
                                }`}>
                                {isBookieCollects ? <FaBuilding className="w-5 h-5 text-purple-400" /> : <FaHandHoldingUsd className="w-5 h-5 text-emerald-400" />}
                            </div>
                            <div>
                                <p className={`text-xs font-bold uppercase tracking-wider ${isBookieCollects ? 'text-purple-400' : 'text-emerald-400'
                                    }`}>
                                    {isBookieCollects ? 'Bookie Collects' : 'Admin Collects'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <FaPercent className="w-2.5 h-2.5 text-slate-500" />
                                    <span className="text-white text-sm font-bold">{data.commissionPercentage}%</span>
                                    <span className="text-slate-500 text-xs font-medium">
                                        {isBookieCollects ? 'platform fee' : 'commission'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Date filters */}
                <div className="glass-panel px-4 py-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 shrink-0">
                            <FaCalendarAlt className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-medium text-slate-400 hidden sm:inline">Time Period</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            {PRESETS.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => applyPreset(p.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activePreset === p.id
                                            ? 'bg-amber-500 text-black'
                                            : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                            <input type="date" value={dateRange.startDate}
                                onChange={(e) => { setDateRange((r) => ({ ...r, startDate: e.target.value })); setActivePreset(''); }}
                                className="bg-white/5 text-white text-xs px-2 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-amber-500/50 [&::-webkit-calendar-picker-indicator]:invert"
                            />
                            <span className="text-slate-500 text-xs">to</span>
                            <input type="date" value={dateRange.endDate}
                                onChange={(e) => { setDateRange((r) => ({ ...r, endDate: e.target.value })); setActivePreset(''); }}
                                className="bg-white/5 text-white text-xs px-2 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-amber-500/50 [&::-webkit-calendar-picker-indicator]:invert"
                            />
                            <button type="button" onClick={fetchRevenue} disabled={loading}
                                className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition-colors disabled:opacity-50"
                                title="Refresh Data"
                            >
                                <FaSyncAlt className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="glass-panel h-96 rounded-2xl animate-pulse" />
                ) : data ? (
                    <>
                        <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
                            <table className="w-full">
                                <tbody className="divide-y divide-white/5">
                                    {/* Your Revenue - highlighted row */}
                                    <tr className={`relative ${isBookieCollects
                                        ? (data.bookieRevenue >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10')
                                        : 'bg-emerald-500/10'
                                        }`}>
                                        <td className="px-6 py-6 sm:py-8">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${isBookieCollects
                                                        ? (data.bookieRevenue >= 0 ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white')
                                                        : 'bg-emerald-500 text-black'
                                                    }`}>
                                                    <FaMoneyBillWave className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <span className={`text-sm font-bold uppercase tracking-wider block mb-1 ${isBookieCollects
                                                            ? (data.bookieRevenue >= 0 ? 'text-emerald-400' : 'text-red-400')
                                                            : 'text-emerald-400'
                                                        }`}>
                                                        {isBookieCollects ? 'Your Net Profit' : 'Your Commission'}
                                                    </span>
                                                    <p className="text-slate-400 text-xs">Total earnings for this period</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 sm:py-8 text-right">
                                            <span className={`text-3xl sm:text-4xl font-bold tracking-tight font-mono ${isBookieCollects
                                                    ? (data.bookieRevenue >= 0 ? 'text-emerald-400' : 'text-red-400')
                                                    : 'text-emerald-400'
                                                }`}>{formatCurrency(data.bookieRevenue)}</span>
                                        </td>
                                    </tr>

                                    {/* Total Bet Amount */}
                                    <tr className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-slate-300 font-medium">Total Bet Volume</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-white text-lg">
                                            {formatCurrency(data.totalBetAmount)}
                                        </td>
                                    </tr>

                                    {/* Rate */}
                                    <tr className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-slate-300 font-medium">
                                            {isBookieCollects ? 'Platform Charge Rate' : 'Commission Rate'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${isBookieCollects
                                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                }`}>
                                                {data.commissionPercentage}%
                                            </span>
                                        </td>
                                    </tr>

                                    {isBookieCollects ? (
                                        <>
                                            {/* Platform Charge */}
                                            <tr className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <span className="text-slate-300 font-medium block">Platform Charge</span>
                                                        <span className="text-xs text-slate-500">Paid to admin</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-purple-400 text-lg">
                                                    {formatCurrency(data.platformCharge)}
                                                </td>
                                            </tr>

                                            {/* Gross (before payouts) */}
                                            <tr className="hover:bg-white/5 transition-colors bg-black/20">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <span className="text-slate-200 font-bold block">Your Gross Share</span>
                                                        <span className="text-xs text-slate-500">Before payouts</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-white text-lg">
                                                    {formatCurrency(data.bookieGross)}
                                                </td>
                                            </tr>

                                            {/* Payouts */}
                                            <tr className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <span className="text-slate-300 font-medium block">Winner Payouts</span>
                                                        <span className="text-xs text-slate-500">Paid by you to winners</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-red-400 text-lg">
                                                    {formatCurrency(data.totalPayouts)}
                                                </td>
                                            </tr>
                                        </>
                                    ) : (
                                        <>
                                            {/* Payouts - admin handles */}
                                            <tr className="hover:bg-white/5 transition-colors opacity-50">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <span className="text-slate-400 font-medium block">Winner Payouts</span>
                                                        <span className="text-xs text-slate-500">Handled by admin (not your expense)</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-slate-400 text-lg">
                                                    {formatCurrency(data.totalPayouts)}
                                                </td>
                                            </tr>
                                        </>
                                    )}

                                    {/* Total Bets Count */}
                                    <tr className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-slate-300 font-medium">Total Activity</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <span className="text-white font-bold">{formatNumber(data.totalBets)} bets</span>
                                                {data.totalBets > 0 && (
                                                    <div className="text-xs flex items-center gap-2 bg-black/30 rounded-lg px-2 py-1">
                                                        <span className="text-emerald-400 font-bold">{formatNumber(data.winningBets || 0)} W</span>
                                                        <span className="text-slate-600">|</span>
                                                        <span className="text-red-400 font-bold">{formatNumber(data.losingBets || 0)} L</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* My Users - clickable */}
                                    <tr
                                        onClick={() => navigate('/my-users')}
                                        className="hover:bg-blue-500/10 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                    <FaUsers className="w-4 h-4 text-blue-400" />
                                                </div>
                                                <span className="text-blue-300 font-bold text-sm group-hover:text-blue-200 transition-colors">View Player Details</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <span className="font-bold text-white">{formatNumber(data.totalUsers)} players</span>
                                                <FaChevronRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors group-hover:translate-x-1" />
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Calculation Formula Display */}
                            <div className="px-6 py-4 bg-black/40 border-t border-white/5">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">Calculation</p>
                                {isBookieCollects ? (
                                    <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-mono text-slate-400">
                                        <span className="text-white">{formatCurrency(data.totalBetAmount)}</span>
                                        <span className="text-slate-600">–</span>
                                        <span className="text-purple-400">{formatCurrency(data.platformCharge)}</span>
                                        <span className="text-slate-600">–</span>
                                        <span className="text-red-400">{formatCurrency(data.totalPayouts)}</span>
                                        <span className="text-slate-600">=</span>
                                        <span className={`${data.bookieRevenue >= 0 ? 'text-emerald-400' : 'text-red-400'} font-bold`}>{formatCurrency(data.bookieRevenue)}</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-mono text-slate-400">
                                        <span className="text-white">{formatCurrency(data.totalBetAmount)}</span>
                                        <span className="text-slate-600">&times;</span>
                                        <span className="text-amber-400">{data.commissionPercentage}%</span>
                                        <span className="text-slate-600">=</span>
                                        <span className="text-emerald-400 font-bold">{formatCurrency(data.bookieRevenue)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="glass-panel p-16 rounded-2xl border border-white/5 text-center flex flex-col items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <FaMoneyBillWave className="w-8 h-8 text-slate-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Revenue Data</h3>
                        <p className="text-slate-400 max-w-sm mx-auto mb-6">
                            We couldn't find any revenue information for this period.
                        </p>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Revenue;
