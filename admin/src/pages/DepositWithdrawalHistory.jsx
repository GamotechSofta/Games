import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowDown, FaArrowUp, FaArrowLeft, FaSyncAlt } from 'react-icons/fa';
import { clearAdminAuth, adminFetch, API_BASE_URL } from '../utils/api';
import PaginationBar from '../components/PaginationBar';

const PRESETS = [
    { id: 'all', label: 'All', getRange: () => ({ all: true }) },
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
    { id: 'this_month', label: 'This Month', getRange: () => {
        const d = new Date();
        const y = d.getFullYear(), m = d.getMonth();
        const last = new Date(y, m + 1, 0);
        return {
            from: `${y}-${String(m + 1).padStart(2, '0')}-01`,
            to: `${y}-${String(m + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`,
        };
    }},
];

const formatCurrency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);

const formatDateTime = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};

const sourceLabel = (source) => (source === 'manual_wallet' ? 'Admin/Bookie wallet' : 'Player payment');

const DepositWithdrawalHistory = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialType = searchParams.get('type') === 'withdrawal' ? 'withdrawal' : 'deposit';

    const [pageTab, setPageTab] = useState(initialType);
    const [datePreset, setDatePreset] = useState(() => (searchParams.get('all') === '1' ? 'all' : 'today'));
    const [customFrom, setCustomFrom] = useState(searchParams.get('from') || '');
    const [customTo, setCustomTo] = useState(searchParams.get('to') || '');
    const [customMode, setCustomMode] = useState(Boolean(searchParams.get('from') && searchParams.get('to') && !searchParams.get('all')));
    const [items, setItems] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 50 });

    const getQueryRange = useCallback(() => {
        if (customMode && customFrom && customTo) return { from: customFrom, to: customTo };
        const preset = PRESETS.find((p) => p.id === datePreset);
        if (!preset) return PRESETS[1].getRange();
        const range = preset.getRange();
        if (range.all) return { all: '1' };
        return range;
    }, [customMode, customFrom, customTo, datePreset]);

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.set('type', pageTab);
            params.set('page', String(page));
            params.set('limit', '50');
            const range = getQueryRange();
            if (range.all) params.set('all', '1');
            else {
                if (range.from) params.set('from', range.from);
                if (range.to) params.set('to', range.to);
            }
            const response = await adminFetch(`${API_BASE_URL}/payments/funds-history?${params}`);
            const data = await response.json();
            if (data.success) {
                setItems(data.data?.items || []);
                setTotalAmount(data.data?.totalAmount || 0);
                setPagination(data.pagination || { page: 1, totalPages: 1, total: 0, limit: 50 });
            }
        } catch (err) {
            console.error('Error fetching funds history:', err);
        } finally {
            setLoading(false);
        }
    }, [pageTab, page, getQueryRange]);

    useEffect(() => {
        const admin = localStorage.getItem('admin');
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        if (!admin || !token) {
            if (!admin) clearAdminAuth();
            navigate('/');
            return;
        }
        fetchHistory();
    }, [fetchHistory, navigate]);

    useEffect(() => {
        const params = new URLSearchParams();
        params.set('type', pageTab);
        const range = getQueryRange();
        if (range.all) params.set('all', '1');
        else {
            if (range.from) params.set('from', range.from);
            if (range.to) params.set('to', range.to);
        }
        setSearchParams(params, { replace: true });
    }, [pageTab, datePreset, customMode, customFrom, customTo, getQueryRange, setSearchParams]);

    const handleLogout = () => {
        clearAdminAuth();
        navigate('/');
    };

    const handlePreset = (presetId) => {
        setDatePreset(presetId);
        setCustomMode(false);
        setPage(1);
    };

    const isDeposit = pageTab === 'deposit';

    return (
        <AdminLayout onLogout={handleLogout} title={isDeposit ? 'Deposit History' : 'Withdrawal History'}>
            <div className="mb-6">
                <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-amber-400 mb-4">
                    <FaArrowLeft className="w-3 h-3" /> Back to Dashboard
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDeposit ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                            {isDeposit ? <FaArrowDown className="w-5 h-5 text-emerald-400" /> : <FaArrowUp className="w-5 h-5 text-red-400" />}
                        </span>
                        {isDeposit ? 'Deposit History' : 'Withdrawal History'}
                    </h1>
                    <button
                        type="button"
                        onClick={fetchHistory}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-700 hover:bg-amber-500/20 border border-gray-600 text-gray-200 text-sm"
                    >
                        <FaSyncAlt className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    type="button"
                    onClick={() => { setPageTab('deposit'); setPage(1); }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border ${pageTab === 'deposit' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-gray-800 text-gray-300 border-gray-600'}`}
                >
                    Deposits
                </button>
                <button
                    type="button"
                    onClick={() => { setPageTab('withdrawal'); setPage(1); }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border ${pageTab === 'withdrawal' ? 'bg-red-600 text-white border-red-500' : 'bg-gray-800 text-gray-300 border-gray-600'}`}
                >
                    Withdrawals
                </button>
            </div>

            <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700 mb-4">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">Date range</p>
                <div className="flex flex-wrap gap-2 mb-3">
                    {PRESETS.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => handlePreset(p.id)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium ${!customMode && datePreset === p.id ? 'bg-orange-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">From</label>
                        <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-sm text-white" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">To</label>
                        <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-sm text-white" />
                    </div>
                    <button
                        type="button"
                        onClick={() => { if (customFrom && customTo) { setCustomMode(true); setPage(1); } }}
                        className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm"
                    >
                        Apply
                    </button>
                </div>
            </div>

            <div className={`rounded-xl p-4 border mb-4 ${isDeposit ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <p className="text-sm text-gray-400">Total {isDeposit ? 'Deposit' : 'Withdrawal'}</p>
                <p className={`text-2xl font-bold font-mono mt-1 ${isDeposit ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(totalAmount)}</p>
                <p className="text-xs text-gray-500 mt-1">{pagination.total} record{pagination.total !== 1 ? 's' : ''} · includes player payments and admin wallet adjustments</p>
            </div>

            <div className="bg-gray-800/80 rounded-xl border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-700 text-left text-gray-400 uppercase text-xs">
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Player</th>
                                <th className="px-4 py-3">Source</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">Loading history...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">No {isDeposit ? 'deposits' : 'withdrawals'} found for this period.</td></tr>
                            ) : items.map((row) => (
                                <tr key={`${row.source}-${row._id}`} className="border-b border-gray-700/60 hover:bg-gray-700/30">
                                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                                    <td className="px-4 py-3">
                                        <div className="text-white font-medium">{row.player?.username || '—'}</div>
                                        {row.player?.phone && <div className="text-xs text-gray-500">{row.player.phone}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-gray-300">{sourceLabel(row.source)}</td>
                                    <td className="px-4 py-3 text-gray-400 max-w-xs truncate" title={row.remarks || row.description}>{row.description}</td>
                                    <td className={`px-4 py-3 text-right font-mono font-semibold ${isDeposit ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {isDeposit ? '+' : '-'}{formatCurrency(row.amount)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 capitalize">{row.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!loading && pagination.totalPages > 1 && (
                    <div className="p-4 border-t border-gray-700">
                        <PaginationBar page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default DepositWithdrawalHistory;
