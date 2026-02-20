import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { API_BASE_URL, bookieFetch } from '../utils/api';
import { FaArrowLeft, FaCalendarAlt, FaWallet } from 'react-icons/fa';

const TABS = [
    { id: 'statement', label: 'Account Statement' },
    { id: 'wallet', label: 'Wallet Statement' },
    { id: 'bets', label: 'Bet History' },
    { id: 'profile', label: 'Profile' },
];

const formatDateRange = (from, to) => {
    if (!from || !to) return '';
    const a = new Date(from);
    const b = new Date(to);
    return `${a.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' })} ~ ${b.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' })}`;
};

const STATEMENT_PRESETS = [
    {
        id: 'today', label: '1 Day (Today)', getRange: () => {
            const d = new Date();
            const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return { from, to: from };
        }
    },
    {
        id: 'tomorrow', label: 'Tomorrow', getRange: () => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

const PlayerDetail = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [player, setPlayer] = useState(null);
    const [activeTab, setActiveTab] = useState('statement');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statementFrom, setStatementFrom] = useState('');
    const [statementTo, setStatementTo] = useState('');
    const [statementPreset, setStatementPreset] = useState('today');
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [statementData, setStatementData] = useState([]);
    const [walletTx, setWalletTx] = useState([]);
    const [bets, setBets] = useState([]);
    const [loadingTab, setLoadingTab] = useState(false);
    const [walletModalOpen, setWalletModalOpen] = useState(false);
    const [walletAdjustAmount, setWalletAdjustAmount] = useState('');
    const [walletActionLoading, setWalletActionLoading] = useState(false);
    const [walletActionError, setWalletActionError] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchPlayer();
    }, [userId]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setCalendarOpen(false);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!statementFrom || !statementTo) {
            const preset = STATEMENT_PRESETS.find((p) => p.id === 'today');
            const { from, to } = preset ? preset.getRange() : { from: '', to: '' };
            if (from) setStatementFrom(from);
            if (to) setStatementTo(to);
        }
    }, []);

    useEffect(() => {
        if (!userId || !player) return;
        if (activeTab === 'statement' && statementFrom && statementTo) fetchStatement();
        if (activeTab === 'wallet') fetchWalletTx();
        if (activeTab === 'bets') fetchBets();
    }, [activeTab, userId, player, statementFrom, statementTo]);

    const fetchPlayer = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await bookieFetch(`${API_BASE_URL}/users/${userId}`);
            const data = await res.json();
            if (data.success) {
                setPlayer(data.data);
            } else {
                setError(data.message || 'Player not found');
            }
        } catch (err) {
            setError('Failed to load player');
        } finally {
            setLoading(false);
        }
    };

    const fetchStatement = async () => {
        if (!userId) return;
        setLoadingTab(true);
        try {
            const [betsRes, txRes] = await Promise.all([
                bookieFetch(`${API_BASE_URL}/bets/history?userId=${userId}&startDate=${statementFrom}&endDate=${statementTo}`),
                bookieFetch(`${API_BASE_URL}/wallet/transactions?userId=${userId}`),
            ]);
            const betsData = await betsRes.json();
            const txData = await txRes.json();
            const betList = betsData.success ? betsData.data || [] : [];
            const txList = txData.success ? txData.data || [] : [];

            const start = new Date(statementFrom);
            start.setHours(0, 0, 0, 0);
            const end = new Date(statementTo);
            end.setHours(23, 59, 59, 999);

            const betRows = betList
                .filter((b) => {
                    const d = new Date(b.createdAt);
                    return d >= start && d <= end;
                })
                .map((b) => ({
                    date: new Date(b.createdAt),
                    type: b.marketId?.marketName || 'Bet',
                    name: b.betNumber || b._id?.slice(-6),
                    status: b.status === 'won' ? 'WIN' : b.status === 'lost' ? 'LOST' : 'BET',
                    credited: b.status === 'won' ? (b.payout || 0) : 0,
                    debited: b.status !== 'won' ? (b.amount || 0) : 0,
                    kind: 'bet',
                }));

            const txRows = txList
                .filter((t) => {
                    const d = new Date(t.createdAt);
                    return d >= start && d <= end;
                })
                .map((t) => ({
                    date: new Date(t.createdAt),
                    type: 'Wallet',
                    name: t.description || t._id?.slice(-6),
                    status: t.type === 'credit' ? 'CREDIT' : 'DEBIT',
                    credited: t.type === 'credit' ? (t.amount || 0) : 0,
                    debited: t.type === 'debit' ? (t.amount || 0) : 0,
                    kind: 'wallet',
                }));

            const merged = [...betRows, ...txRows].sort((a, b) => a.date - b.date);
            let running = 0;
            let runningBonus = 0;
            let runningExchange = 0;
            const withBalance = merged.map((r) => {
                const lastBalance = running;
                running = running + (r.credited || 0) - (r.debited || 0);
                return {
                    ...r,
                    lastBalance,
                    runningBalance: running,
                    lastBonusBalance: runningBonus,
                    runningBonusBalance: runningBonus,
                    lastExchangeBalance: runningExchange,
                    runningExchangeBalance: runningExchange,
                };
            });
            setStatementData(withBalance);
        } catch (err) {
            setStatementData([]);
        } finally {
            setLoadingTab(false);
        }
    };

    const fetchWalletTx = async () => {
        if (!userId) return;
        setLoadingTab(true);
        try {
            const res = await bookieFetch(`${API_BASE_URL}/wallet/transactions?userId=${userId}`);
            const data = await res.json();
            setWalletTx(data.success ? (data.data || []).reverse() : []);
        } catch (err) {
            setWalletTx([]);
        } finally {
            setLoadingTab(false);
        }
    };

    const fetchBets = async () => {
        if (!userId) return;
        setLoadingTab(true);
        try {
            const res = await bookieFetch(`${API_BASE_URL}/bets/history?userId=${userId}`);
            const data = await res.json();
            setBets(data.success ? data.data || [] : []);
        } catch (err) {
            setBets([]);
        } finally {
            setLoadingTab(false);
        }
    };

    const handleDateApply = () => {
        setStatementPreset('custom');
        setCalendarOpen(false);
        if (activeTab === 'statement') fetchStatement();
    };

    const handlePresetSelect = (presetId) => {
        const preset = STATEMENT_PRESETS.find((p) => p.id === presetId);
        if (preset) {
            const { from, to } = preset.getRange();
            setStatementFrom(from);
            setStatementTo(to);
            setStatementPreset(presetId);
            setCalendarOpen(false);
            if (activeTab === 'statement') fetchStatement();
        }
    };

    const handleWalletAdjust = async (type) => {
        const amount = Number(walletAdjustAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            setWalletActionError('Enter a valid positive amount');
            return;
        }
        if (type === 'debit' && (player?.walletBalance ?? 0) < amount) {
            setWalletActionError('Insufficient balance to deduct');
            return;
        }
        setWalletActionError('');
        setWalletActionLoading(true);
        try {
            const res = await bookieFetch(`${API_BASE_URL}/wallet/adjust`, {
                method: 'POST',
                body: JSON.stringify({ userId, amount, type }),
            });
            const data = await res.json();
            if (data.success) {
                setWalletAdjustAmount('');
                fetchPlayer();
                if (activeTab === 'wallet') fetchWalletTx();
                setWalletModalOpen(false);
            } else {
                setWalletActionError(data.message || 'Failed to update wallet');
            }
        } catch (err) {
            setWalletActionError('Network error. Please try again.');
        } finally {
            setWalletActionLoading(false);
        }
    };

    const formatCurrency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

    const formatIpDisplay = (ip) => {
        if (!ip) return '—';
        const trimmed = String(ip).trim();
        if (trimmed === '::1' || trimmed === '127.0.0.1') return 'localhost';
        return trimmed;
    };

    if (loading) {
        return (
            <Layout title="Player">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-48 bg-gray-700 rounded" />
                    <div className="h-24 bg-gray-700 rounded-xl" />
                    <div className="h-10 w-full bg-gray-700 rounded" />
                </div>
            </Layout>
        );
    }

    if (error || !player) {
        return (
            <Layout title="Player">
                <div className="flex flex-col items-center justify-center min-h-[40vh]">
                    <p className="text-red-400 mb-4">{error || 'Player not found'}</p>
                    <Link to="/my-users" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500 text-black font-semibold">
                        <FaArrowLeft /> Back to My Players
                    </Link>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Player Details">
            <div className="min-w-0 max-w-full">
                {/* Breadcrumb */}
                <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <Link to="/my-users" className="text-slate-400 hover:text-amber-500 text-sm inline-flex items-center gap-2 mb-2 transition-colors">
                            <FaArrowLeft className="w-3 h-3" /> Back to Players
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            {player.username}
                            <span className="text-sm font-normal px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                {player.role || 'Player'}
                            </span>
                        </h1>
                    </div>
                </div>

                {/* Player info card */}
                <div className="glass-panel glass-panel-card rounded-2xl p-6 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                        <div className="w-32 h-32 bg-amber-500/20 rounded-full blur-3xl"></div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-6 mb-6 border-b border-white/5 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-black font-bold text-xl shadow-lg shadow-amber-500/20">
                                {player.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Player Overview</h2>
                                <p className="text-slate-400 text-sm">Manage profile and wallet</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setWalletModalOpen(true); setWalletActionError(''); setWalletAdjustAmount(''); }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 active:scale-95 text-sm"
                        >
                            <FaWallet className="w-4 h-4" /> Manage Wallet
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Status</p>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${player.isActive !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${player.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                                {player.isActive !== false ? 'Active' : 'Suspended'}
                            </span>
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Wallet Balance</p>
                            <p className="text-emerald-400 font-mono font-bold text-lg">{formatCurrency(player.walletBalance)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Phone</p>
                            <p className="text-white font-medium truncate">{player.phone || '—'}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Email</p>
                            <p className="text-white font-medium truncate" title={player.email}>{player.email || '—'}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Joined</p>
                            <p className="text-white font-medium text-sm">{player.createdAt ? new Date(player.createdAt).toLocaleDateString('en-IN') : '—'}</p>
                        </div>
                    </div>
                </div>

                {/* Date range & Filters */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4 glass-panel glass-panel-card p-2 rounded-xl">
                    <div className="flex bg-black/20 rounded-lg p-1">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-md font-semibold text-sm transition-all ${activeTab === tab.id ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setCalendarOpen((o) => !o)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black/20 border border-white/10 hover:bg-white/5 text-sm text-slate-200 transition-colors"
                        >
                            <FaCalendarAlt className="w-4 h-4 text-amber-500" />
                            {statementFrom && statementTo ? formatDateRange(statementFrom, statementTo) : 'Select Date Range'}
                        </button>
                        {calendarOpen && (
                            <div className="absolute right-0 top-full mt-2 glass-panel glass-panel-card rounded-xl border border-white/10 shadow-2xl z-50 flex flex-col sm:flex-row shadow-black/50 overflow-hidden">
                                <div className="min-w-[180px] border-b sm:border-b-0 sm:border-r border-white/5 p-2 bg-black/40">
                                    {STATEMENT_PRESETS.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => handlePresetSelect(p.id)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors flex items-center justify-between ${statementPreset === p.id ? 'bg-amber-500/10 text-amber-500' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                        >
                                            {p.label}
                                            {statementPreset === p.id && <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>}
                                        </button>
                                    ))}
                                </div>
                                <div className="p-4 bg-[#0B1120]">
                                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Custom Range</div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5">From</label>
                                            <input type="date" value={statementFrom} onChange={(e) => setStatementFrom(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white focus:border-amber-500/50 focus:outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5">To</label>
                                            <input type="date" value={statementTo} onChange={(e) => setStatementTo(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white focus:border-amber-500/50 focus:outline-none" />
                                        </div>
                                        <button type="button" onClick={handleDateApply} className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors mt-2">
                                            Apply Filter
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tab content */}
                <div className="glass-panel glass-panel-card rounded-2xl overflow-hidden min-h-[300px]">
                    {activeTab === 'statement' && (
                        <>
                            {loadingTab ? (
                                <div className="p-12 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 mx-auto mb-4" />
                                    <p className="text-slate-400">Loading transactions...</p>
                                </div>
                            ) : statementData.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">No account activity found in this period.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="border-b border-white/5 bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                                                <th className="px-4 py-3 font-semibold">Date</th>
                                                <th className="px-4 py-3 font-semibold">Description</th>
                                                <th className="px-4 py-3 font-semibold">Type</th>
                                                <th className="px-4 py-3 font-semibold text-right">Credit</th>
                                                <th className="px-4 py-3 font-semibold text-right">Debit</th>
                                                <th className="px-4 py-3 font-semibold text-right">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {statementData.map((row, i) => (
                                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                                                        {row.date.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-white">{row.name}</div>
                                                        <div className={`text-xs inline-flex px-1.5 py-0.5 rounded font-bold mt-1 ${row.status === 'WIN' || row.status === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{row.status}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400">{row.type}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-emerald-400">{row.credited ? `+${row.credited}` : '—'}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-red-400">{row.debited ? `-${row.debited}` : '—'}</td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-white">{formatCurrency(row.runningBalance)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'wallet' && (
                        <>
                            {loadingTab ? (
                                <div className="p-12 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 mx-auto mb-4" />
                                    <p className="text-slate-400">Loading wallet history...</p>
                                </div>
                            ) : walletTx.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">No wallet transactions found.</div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {walletTx.map((t) => (
                                        <div key={t._id} className="p-4 hover:bg-white/5 flex items-center justify-between gap-4 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    <FaWallet className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{t.description || 'Wallet Transaction'}</p>
                                                    <p className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleString('en-IN')}</p>
                                                </div>
                                            </div>
                                            <div className={`font-mono font-bold text-lg ${t.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'bets' && (
                        <>
                            {loadingTab ? (
                                <div className="p-12 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 mx-auto mb-4" />
                                    <p className="text-slate-400">Loading bet history...</p>
                                </div>
                            ) : bets.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">No betting activity found.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="border-b border-white/5 bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                                                <th className="px-4 py-3 font-semibold">Time</th>
                                                <th className="px-4 py-3 font-semibold">Market</th>
                                                <th className="px-4 py-3 font-semibold">Bet Number</th>
                                                <th className="px-4 py-3 font-semibold">Amount</th>
                                                <th className="px-4 py-3 font-semibold">Result</th>
                                                <th className="px-4 py-3 font-semibold text-right">Payout</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {bets.map((b) => (
                                                <tr key={b._id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 text-slate-400 text-xs">
                                                        {new Date(b.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </td>
                                                    <td className="px-4 py-3 text-white font-medium">{b.marketId?.marketName || '—'} <span className="text-slate-500 text-xs font-normal">({b.betType})</span></td>
                                                    <td className="px-4 py-3 font-mono text-amber-400 font-bold">{b.betNumber}</td>
                                                    <td className="px-4 py-3 font-mono text-white">{formatCurrency(b.amount)}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase ${b.status === 'won' ? 'bg-emerald-500/10 text-emerald-400' : b.status === 'lost' ? 'bg-red-500/10 text-red-400' : 'bg-slate-700 text-slate-300'}`}>
                                                            {b.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">{b.payout > 0 ? formatCurrency(b.payout) : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'profile' && (
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 max-w-4xl">
                                <div>
                                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                        <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
                                        Personal Info
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-slate-400">Username</span>
                                            <span className="text-white font-medium">{player.username}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-slate-400">Email</span>
                                            <span className="text-white font-medium">{player.email}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-slate-400">Phone</span>
                                            <span className="text-white font-medium">{player.phone || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                        <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
                                        System Info
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-slate-400">Unique ID</span>
                                            <span className="text-white font-mono text-xs">{player._id}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-slate-400">Created At</span>
                                            <span className="text-white font-medium">{player.createdAt ? new Date(player.createdAt).toLocaleString('en-IN') : '—'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-slate-400">Last IP</span>
                                            <span className="text-white font-mono text-xs">{formatIpDisplay(player.lastLoginIp)}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-slate-400">Source</span>
                                            <span className="text-white font-medium capitalize">{player.source}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Wallet Modal */}
            {walletModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="glass-panel glass-panel-card bg-[#0B1120]/80 rounded-2xl w-full max-w-md shadow-2xl shadow-black/50 border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>
                        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FaWallet className="text-amber-500" /> Adjust Wallet Balance
                            </h3>
                            <button type="button" onClick={() => setWalletModalOpen(false)} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="rounded-xl bg-black/30 border border-white/5 p-4 flex items-center justify-between">
                                <span className="text-slate-400 text-sm font-medium">Current Balance</span>
                                <span className="text-emerald-400 font-mono font-bold text-2xl">{formatCurrency(player?.walletBalance ?? 0)}</span>
                            </div>

                            {walletActionError && (
                                <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm px-4 py-3 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                    {walletActionError}
                                </div>
                            )}

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add or Deduct Amount</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="0"
                                        value={walletAdjustAmount}
                                        onChange={(e) => setWalletAdjustAmount(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        className="flex-1 px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 text-right font-mono font-bold"
                                    />
                                    <button type="button" onClick={() => handleWalletAdjust('credit')} disabled={walletActionLoading} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors disabled:opacity-50">Credit (+)</button>
                                    <button type="button" onClick={() => handleWalletAdjust('debit')} disabled={walletActionLoading} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors disabled:opacity-50">Debit (-)</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default PlayerDetail;
