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
            <div className="space-y-4 sm:space-y-5">
                {/* Header */}
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        <FaMoneyBillWave className="w-6 h-6 text-emerald-500 shrink-0" />
                        My Revenue
                    </h1>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">
                        {isBookieCollects
                            ? 'Your earnings after platform charge and payouts'
                            : 'Your commission earnings from user bets'}
                    </p>
                </div>

                {/* Bookie Type Badge */}
                {data && (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        isBookieCollects
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}>
                        {isBookieCollects ? <FaBuilding className="w-3.5 h-3.5" /> : <FaHandHoldingUsd className="w-3.5 h-3.5" />}
                        {isBookieCollects ? 'Bookie Collects' : 'Admin Collects'}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-300 text-[11px] font-medium ml-1">
                            <FaPercent className="w-2.5 h-2.5 mr-1" />
                            {data.commissionPercentage}%
                            {isBookieCollects ? ' platform charge' : ' commission'}
                        </span>
                    </div>
                )}

                {/* Date filters */}
                <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 p-3 sm:p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
                        <FaCalendarAlt className="w-4 h-4 text-yellow-500 shrink-0" />
                        <span className="text-sm font-medium text-gray-300">Period</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
                        {PRESETS.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => applyPreset(p.id)}
                                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                                    activePreset === p.id ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
                        <button type="button" onClick={fetchRevenue} disabled={loading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 text-xs sm:text-sm"
                        >
                            <FaSyncAlt className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="bg-gray-800/60 rounded-xl h-64 animate-pulse border border-gray-700/50" />
                ) : data ? (
                    <>
                        {/* Revenue Table */}
                        <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 overflow-hidden">
                            <table className="w-full">
                                <tbody className="divide-y divide-gray-700/50">
                                    {/* Your Revenue - highlighted row */}
                                    <tr className={isBookieCollects
                                        ? (data.bookieRevenue >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10')
                                        : 'bg-emerald-500/10'
                                    }>
                                        <td className="px-4 py-3.5 sm:py-4">
                                            <span className={`text-xs sm:text-sm font-semibold uppercase tracking-wider ${
                                                isBookieCollects
                                                    ? (data.bookieRevenue >= 0 ? 'text-emerald-300' : 'text-red-300')
                                                    : 'text-emerald-300'
                                            }`}>
                                                {isBookieCollects ? 'Your Net Profit' : 'Your Commission'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 sm:py-4 text-right">
                                            <span className={`text-xl sm:text-2xl font-bold ${
                                                isBookieCollects
                                                    ? (data.bookieRevenue >= 0 ? 'text-emerald-400' : 'text-red-400')
                                                    : 'text-emerald-400'
                                            }`}>{formatCurrency(data.bookieRevenue)}</span>
                                        </td>
                                    </tr>

                                    {/* Total Bet Amount */}
                                    <tr className="hover:bg-gray-700/20 transition-colors">
                                        <td className="px-4 py-3 sm:py-3.5">
                                            <span className="text-xs sm:text-sm text-gray-300">Total Bet Volume</span>
                                        </td>
                                        <td className="px-4 py-3 sm:py-3.5 text-right">
                                            <span className="text-sm sm:text-base font-semibold text-white">{formatCurrency(data.totalBetAmount)}</span>
                                        </td>
                                    </tr>

                                    {/* Rate */}
                                    <tr className="hover:bg-gray-700/20 transition-colors">
                                        <td className="px-4 py-3 sm:py-3.5">
                                            <span className="text-xs sm:text-sm text-gray-300">
                                                {isBookieCollects ? 'Platform Charge Rate' : 'Commission Rate'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 sm:py-3.5 text-right">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-semibold ${
                                                isBookieCollects
                                                    ? 'bg-purple-500/15 text-purple-400'
                                                    : 'bg-yellow-500/15 text-yellow-400'
                                            }`}>
                                                {data.commissionPercentage}%
                                            </span>
                                        </td>
                                    </tr>

                                    {isBookieCollects ? (
                                        <>
                                            {/* Platform Charge */}
                                            <tr className="hover:bg-gray-700/20 transition-colors">
                                                <td className="px-4 py-3 sm:py-3.5">
                                                    <div>
                                                        <span className="text-xs sm:text-sm text-gray-300">Platform Charge</span>
                                                        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Paid to admin</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 sm:py-3.5 text-right">
                                                    <span className="text-sm sm:text-base font-semibold text-purple-400">{formatCurrency(data.platformCharge)}</span>
                                                </td>
                                            </tr>

                                            {/* Gross (before payouts) */}
                                            <tr className="hover:bg-gray-700/20 transition-colors">
                                                <td className="px-4 py-3 sm:py-3.5">
                                                    <div>
                                                        <span className="text-xs sm:text-sm text-gray-300">Your Gross Share</span>
                                                        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Before payouts</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 sm:py-3.5 text-right">
                                                    <span className="text-sm sm:text-base font-semibold text-white">{formatCurrency(data.bookieGross)}</span>
                                                </td>
                                            </tr>

                                            {/* Payouts */}
                                            <tr className="hover:bg-gray-700/20 transition-colors">
                                                <td className="px-4 py-3 sm:py-3.5">
                                                    <div>
                                                        <span className="text-xs sm:text-sm text-gray-300">Winner Payouts</span>
                                                        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Paid by you to winning users</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 sm:py-3.5 text-right">
                                                    <span className="text-sm sm:text-base font-semibold text-red-400">{formatCurrency(data.totalPayouts)}</span>
                                                </td>
                                            </tr>
                                        </>
                                    ) : (
                                        <>
                                            {/* Payouts - admin handles */}
                                            <tr className="hover:bg-gray-700/20 transition-colors">
                                                <td className="px-4 py-3 sm:py-3.5">
                                                    <div>
                                                        <span className="text-xs sm:text-sm text-gray-300">Winner Payouts</span>
                                                        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Handled by admin (not your expense)</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 sm:py-3.5 text-right">
                                                    <span className="text-sm sm:text-base font-semibold text-red-400">{formatCurrency(data.totalPayouts)}</span>
                                                </td>
                                            </tr>
                                        </>
                                    )}

                                    {/* Total Bets Count */}
                                    <tr className="hover:bg-gray-700/20 transition-colors">
                                        <td className="px-4 py-3 sm:py-3.5">
                                            <span className="text-xs sm:text-sm text-gray-300">Total Bets</span>
                                        </td>
                                        <td className="px-4 py-3 sm:py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2 flex-wrap">
                                                <span className="text-sm sm:text-base font-semibold text-white">{formatNumber(data.totalBets)} bets</span>
                                                {data.totalBets > 0 && (
                                                    <span className="text-[10px] sm:text-xs text-gray-400">
                                                        (<span className="text-emerald-400">{formatNumber(data.winningBets || 0)} W</span>
                                                        {' / '}
                                                        <span className="text-red-400">{formatNumber(data.losingBets || 0)} L</span>)
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* My Users - clickable */}
                                    <tr
                                        onClick={() => navigate('/my-users')}
                                        className="hover:bg-cyan-500/10 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-4 py-3 sm:py-3.5">
                                            <div className="flex items-center gap-2">
                                                <FaUsers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                                <span className="text-xs sm:text-sm text-cyan-300 font-medium group-hover:text-cyan-200">My Users</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 sm:py-3.5 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <span className="text-sm sm:text-base font-semibold text-white">{formatNumber(data.totalUsers)} players</span>
                                                <FaChevronRight className="w-3 h-3 text-gray-600 group-hover:text-cyan-400 transition-colors" />
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Calculation row */}
                                    <tr className="bg-gray-700/20">
                                        <td colSpan="2" className="px-4 py-3">
                                            {isBookieCollects ? (
                                                <div className="text-xs sm:text-sm text-gray-400 text-center space-y-1">
                                                    <div>
                                                        {formatCurrency(data.totalBetAmount)}
                                                        <span className="text-gray-600 mx-1.5">−</span>
                                                        <span className="text-purple-400 font-medium">{formatCurrency(data.platformCharge)} (platform)</span>
                                                        <span className="text-gray-600 mx-1.5">−</span>
                                                        <span className="text-red-400 font-medium">{formatCurrency(data.totalPayouts)} (payouts)</span>
                                                        <span className="text-gray-600 mx-1.5">=</span>
                                                        <span className={`font-bold ${data.bookieRevenue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(data.bookieRevenue)}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-xs sm:text-sm text-gray-400 text-center">
                                                    {formatCurrency(data.totalBetAmount)}
                                                    <span className="text-gray-600 mx-1.5">&times;</span>
                                                    <span className="text-yellow-400 font-medium">{data.commissionPercentage}%</span>
                                                    <span className="text-gray-600 mx-1.5">=</span>
                                                    <span className="text-emerald-400 font-bold">{formatCurrency(data.bookieRevenue)}</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="bg-gray-800/60 rounded-xl border border-gray-700/80 p-8 sm:p-12 text-center">
                        <FaMoneyBillWave className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-sm sm:text-lg">No revenue data available</p>
                        <p className="text-gray-500 text-xs sm:text-sm mt-2">Try a different date range or refresh</p>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Revenue;
