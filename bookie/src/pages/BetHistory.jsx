import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { API_BASE_URL, bookieFetch } from '../utils/api';

const RANGES = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this_week', label: 'This Week' },
    { id: 'last_week', label: 'Last Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'custom', label: 'Custom' },
];

function getDateRange(rangeId, customStart = '', customEnd = '') {
    const toYMD = (d) => d.toISOString().slice(0, 10);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (rangeId === 'custom') {
        if (customStart && customEnd) {
            const end = new Date(customEnd);
            end.setDate(end.getDate() + 1);
            return { startDate: customStart, endDate: toYMD(end), label: `${customStart} to ${customEnd}` };
        }
        return { startDate: '', endDate: '', label: 'Custom' };
    }

    switch (rangeId) {
        case 'today':
            return { startDate: toYMD(today), endDate: toYMD(tomorrow), label: 'Today' };
        case 'yesterday': {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return { startDate: toYMD(yesterday), endDate: toYMD(today), label: 'Yesterday' };
        }
        case 'this_week': {
            const day = today.getDay();
            const monday = new Date(today);
            monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
            return { startDate: toYMD(monday), endDate: toYMD(tomorrow), label: 'This Week' };
        }
        case 'last_week': {
            const day = today.getDay();
            const monday = new Date(today);
            monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
            const lastMonday = new Date(monday);
            lastMonday.setDate(monday.getDate() - 7);
            return { startDate: toYMD(lastMonday), endDate: toYMD(monday), label: 'Last Week' };
        }
        case 'this_month': {
            const first = new Date(today.getFullYear(), today.getMonth(), 1);
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            return { startDate: toYMD(first), endDate: toYMD(nextMonth), label: 'This Month' };
        }
        case 'last_month': {
            const firstThis = new Date(today.getFullYear(), today.getMonth(), 1);
            const firstLast = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            return { startDate: toYMD(firstLast), endDate: toYMD(firstThis), label: 'Last Month' };
        }
        default:
            return { startDate: toYMD(today), endDate: toYMD(tomorrow), label: 'Today' };
    }
}

const BetHistory = () => {
    const [bets, setBets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const { startDate, endDate, label } = getDateRange(dateRange, customStart, customEnd);

    useEffect(() => {
        fetchBets();
    }, [dateRange, customStart, customEnd]);

    const fetchBets = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ limit: '200' });
            if (startDate && endDate) {
                params.append('startDate', startDate);
                params.append('endDate', endDate);
            }
            const url = `${API_BASE_URL}/bets/history?${params}`;
            const response = await bookieFetch(url);
            const data = await response.json();
            if (data.success) setBets(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout title="Bet History">
            <div className="max-w-[1400px] mx-auto min-w-0">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        Bet History
                        <span className="text-sm font-normal px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">Records</span>
                    </h1>
                </div>

                {/* Date range */}
                <div className="glass-panel glass-panel-card p-4 rounded-2xl mb-6 border border-slate-200">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Date range</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {RANGES.map((r) => (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => setDateRange(r.id)}
                                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                                    dateRange === r.id
                                        ? 'bg-amber-500 text-black'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                    {dateRange === 'custom' && (
                        <div className="flex flex-wrap gap-3 items-center mb-3">
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm"
                            />
                            <span className="text-slate-500">to</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm"
                            />
                        </div>
                    )}
                    <p className="text-slate-400 text-sm">
                        Showing data for: <span className="text-amber-500 font-medium">{dateRange === 'custom' && customStart && customEnd ? `${customStart} to ${customEnd}` : label}</span>
                    </p>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 mx-auto mb-4" />
                        Loading history...
                    </div>
                ) : (
                    <div className="glass-panel glass-panel-card rounded-2xl overflow-hidden border border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                                        <th className="px-6 py-4 font-semibold">ID</th>
                                        <th className="px-6 py-4 font-semibold">Player</th>
                                        <th className="px-6 py-4 font-semibold">Market</th>
                                        <th className="px-6 py-4 font-semibold">Bet Type</th>
                                        <th className="px-6 py-4 font-semibold text-right">Amount</th>
                                        <th className="px-6 py-4 font-semibold text-center">Status</th>
                                        <th className="px-6 py-4 font-semibold text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {bets.length === 0 ? (
                                        <tr><td colSpan="7" className="px-6 py-8 text-center text-slate-500">No bets found.</td></tr>
                                    ) : (
                                        bets.map((bet) => (
                                            <tr key={bet._id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4 text-slate-500 font-mono text-xs">{bet._id?.slice(-8).toUpperCase()}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900 group-hover:text-amber-400 transition-colors">{bet.userId?.username || bet.userId}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-300">
                                                    {typeof bet.marketId === 'object' && bet.marketId !== null
                                                        ? (bet.marketId.marketName || '—')
                                                        : (bet.marketId ? String(bet.marketId) : '—')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50">
                                                        {bet.betType}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">₹{bet.amount}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${bet.status === 'won' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        bet.status === 'lost' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                            bet.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                                'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                        }`}>
                                                        {bet.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-400 text-xs">{new Date(bet.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default BetHistory;
