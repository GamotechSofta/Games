import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { API_BASE_URL, getBookieAuthHeaders } from '../utils/api';

const BetHistory = () => {
    const [bets, setBets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ userId: '', marketId: '', status: '', startDate: '', endDate: '' });

    useEffect(() => {
        fetchBets();
    }, [filters]);

    const fetchBets = async () => {
        try {
            setLoading(true);
            const q = new URLSearchParams();
            if (filters.userId) q.append('userId', filters.userId);
            if (filters.marketId) q.append('marketId', filters.marketId);
            if (filters.status) q.append('status', filters.status);
            if (filters.startDate) q.append('startDate', filters.startDate);
            if (filters.endDate) q.append('endDate', filters.endDate);
            const response = await fetch(`${API_BASE_URL}/bets/history?${q}`, { headers: getBookieAuthHeaders() });
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
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        Bet History
                        <span className="text-sm font-normal px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">Records</span>
                    </h1>
                </div>

                {/* Filters */}
                <div className="glass-panel p-4 rounded-2xl mb-6 border border-white/5">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Player ID</label>
                            <input
                                type="text"
                                placeholder="Search by Player"
                                value={filters.userId}
                                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
                            />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Market</label>
                            <input
                                type="text"
                                placeholder="Search by Market"
                                value={filters.marketId}
                                onChange={(e) => setFilters({ ...filters, marketId: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
                            />
                        </div>

                        <div className="flex-1 min-w-[150px]">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-500/50 transition-colors text-sm appearance-none"
                            >
                                <option value="">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="won">Won</option>
                                <option value="lost">Lost</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">From Date</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
                            />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">To Date</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 mx-auto mb-4" />
                        Loading history...
                    </div>
                ) : (
                    <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
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
                                        <tr><td colSpan="7" className="px-6 py-8 text-center text-slate-500">No bets found match filtering criteria.</td></tr>
                                    ) : (
                                        bets.map((bet) => (
                                            <tr key={bet._id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4 text-slate-500 font-mono text-xs">{bet._id?.slice(-8).toUpperCase()}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-white group-hover:text-amber-400 transition-colors">{bet.userId?.username || bet.userId}</div>
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
                                                <td className="px-6 py-4 text-right font-mono font-bold text-white">₹{bet.amount}</td>
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
