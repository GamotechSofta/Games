import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { FaWallet, FaPlus, FaMinus, FaExchangeAlt, FaSearch, FaTimes, FaSyncAlt, FaUserFriends } from 'react-icons/fa';
import { clearAdminAuth, adminFetch, API_BASE_URL } from '../utils/api';
import PaginationBar from '../components/PaginationBar';

const formatCurrency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);

const valueSizeClass = (value) => {
    const len = String(value ?? '').length;
    if (len > 16) return 'text-[10px] min-[400px]:text-xs sm:text-sm md:text-base';
    if (len > 13) return 'text-xs sm:text-sm md:text-base lg:text-lg';
    if (len > 10) return 'text-sm sm:text-base md:text-lg lg:text-xl';
    if (len > 7) return 'text-base sm:text-lg md:text-xl lg:text-2xl';
    return 'text-lg sm:text-xl md:text-2xl';
};

const StatCard = ({ label, value, icon: Icon, tone = 'slate' }) => {
    const tones = {
        green: {
            wrap: 'border-emerald-500/40 bg-emerald-950/40',
            icon: 'bg-emerald-500/20 text-emerald-400',
            value: 'text-emerald-300',
            label: 'text-emerald-100/80',
        },
        violet: {
            wrap: 'border-violet-500/40 bg-violet-950/30',
            icon: 'bg-violet-500/20 text-violet-400',
            value: 'text-violet-300',
            label: 'text-violet-100/80',
        },
    };
    const t = tones[tone] || tones.green;
    const displayValue = value ?? '—';
    return (
        <div className={`rounded-xl border p-3.5 sm:p-4 flex items-start gap-3 sm:gap-4 h-full min-h-[80px] ${t.wrap}`}>
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${t.icon}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
                <p className={`text-[11px] sm:text-xs font-semibold leading-tight ${t.label}`}>{label}</p>
                <p className={`font-bold font-mono tabular-nums mt-1 leading-tight whitespace-normal break-words ${valueSizeClass(displayValue)} ${t.value}`}>
                    {displayValue}
                </p>
            </div>
        </div>
    );
};

const Wallet = () => {
    const navigate = useNavigate();
    const [wallets, setWallets] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('wallets');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 50 });
    const [summary, setSummary] = useState({ totalBalance: 0, totalWallets: 0 });
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [bookieFilter, setBookieFilter] = useState('');
    const [sortBy, setSortBy] = useState('balance_desc');

    const [adjustModal, setAdjustModal] = useState({ show: false, wallet: null, type: '' });
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjusting, setAdjusting] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [activeTab, debouncedSearch, sourceFilter, bookieFilter, sortBy]);

    useEffect(() => {
        if (activeTab === 'wallets') fetchWallets(page);
    }, [activeTab, page, debouncedSearch, sourceFilter, bookieFilter, sortBy]);

    useEffect(() => {
        if (activeTab === 'transactions') fetchTransactions(page);
    }, [activeTab, page]);

    const fetchWallets = async (pageNum = 1, silent = false) => {
        try {
            if (!silent) setLoading(true);
            const params = new URLSearchParams({
                page: String(pageNum),
                limit: '50',
                sort: sortBy,
            });
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (sourceFilter) params.set('source', sourceFilter);
            if (bookieFilter) params.set('bookie', bookieFilter);
            const response = await adminFetch(`${API_BASE_URL}/wallet/all?${params}`);
            const data = await response.json();
            if (data.success) {
                setWallets(data.data || []);
                if (data.pagination) setPagination(data.pagination);
                if (data.summary) setSummary(data.summary);
            }
        } catch (err) {
            console.error('Error fetching wallets:', err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchTransactions = async (pageNum = 1, silent = false) => {
        try {
            if (!silent) setLoading(true);
            const params = new URLSearchParams({
                page: String(pageNum),
                limit: '50',
            });
            const response = await adminFetch(`${API_BASE_URL}/wallet/transactions?${params}`);
            const data = await response.json();
            if (data.success) {
                setTransactions(data.data || []);
                if (data.pagination) setPagination(data.pagination);
            }
        } catch (err) {
            console.error('Error fetching transactions:', err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            if (activeTab === 'wallets') await fetchWallets(page, true);
            else await fetchTransactions(page, true);
        } finally {
            setRefreshing(false);
        }
    };

    const openAdjust = (wallet, type) => {
        setAdjustModal({ show: true, wallet, type });
        setAdjustAmount('');
    };

    const closeAdjust = () => {
        setAdjustModal({ show: false, wallet: null, type: '' });
        setAdjustAmount('');
    };

    const handleAdjust = async () => {
        if (!adjustModal.wallet || !adjustAmount) return;
        const amount = parseFloat(adjustAmount);
        if (!amount || amount <= 0) return alert('Enter a valid amount');

        setAdjusting(true);
        try {
            const userId = adjustModal.wallet.userId?._id || adjustModal.wallet.userId;
            const response = await adminFetch(`${API_BASE_URL}/wallet/adjust`, {
                method: 'POST',
                body: JSON.stringify({ userId, amount, type: adjustModal.type }),
            });
            const data = await response.json();
            if (data.success) {
                closeAdjust();
                fetchWallets(page);
            } else {
                alert(data.message || 'Failed to adjust wallet');
            }
        } catch {
            alert('Network error');
        } finally {
            setAdjusting(false);
        }
    };

    const handleLogout = () => {
        clearAdminAuth();
        navigate('/');
    };

    const totalBalance = summary.totalBalance ?? 0;
    const totalWallets = summary.totalWallets ?? wallets.length;
    const hasActiveFilters = searchQuery || sourceFilter || bookieFilter;

    const filteredTransactions = (() => {
        if (!searchQuery.trim()) return transactions;
        const q = searchQuery.toLowerCase();
        return transactions.filter((t) =>
            (t.userId?.username || '').toLowerCase().includes(q)
            || (t.description || '').toLowerCase().includes(q),
        );
    })();

    const clearAllFilters = () => {
        setSearchQuery('');
        setSourceFilter('');
        setBookieFilter('');
        setSortBy('balance_desc');
    };

    return (
        <AdminLayout onLogout={handleLogout} title="Wallet">
            <div className="space-y-4 sm:space-y-5">
                {/* Header: title + tabs + refresh */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3 shrink-0">
                        <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                            <FaWallet className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                        </span>
                        Wallet Management
                    </h1>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('wallets')}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm font-semibold border whitespace-nowrap transition-colors ${
                                activeTab === 'wallets'
                                    ? 'bg-amber-500 text-black border-amber-500'
                                    : 'bg-gray-800 text-gray-300 border-gray-600 hover:border-gray-500'
                            }`}
                        >
                            Player Wallets
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('transactions')}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm font-semibold border whitespace-nowrap transition-colors ${
                                activeTab === 'transactions'
                                    ? 'bg-amber-500 text-black border-amber-500'
                                    : 'bg-gray-800 text-gray-300 border-gray-600 hover:border-gray-500'
                            }`}
                        >
                            Transactions
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gray-700 hover:bg-amber-500/20 border border-gray-600 text-gray-200 text-sm ml-auto shrink-0"
                    >
                        <FaSyncAlt className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <StatCard label="Total Balance" value={formatCurrency(totalBalance)} icon={FaWallet} tone="green" />
                    <StatCard label="Total Wallets" value={totalWallets} icon={FaUserFriends} tone="violet" />
                </div>

                {/* Filters — one row */}
                <div className="rounded-xl border border-gray-700/80 bg-gray-800/50 p-3 sm:p-4">
                    <div className="flex flex-nowrap items-center gap-2 sm:gap-3 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <div className="relative flex-1 min-w-[160px] sm:min-w-[200px] max-w-md shrink">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search player..."
                                className="w-full pl-9 pr-8 py-1.5 sm:py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs sm:text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                            />
                            {searchQuery && (
                                <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                    <FaTimes className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        {activeTab === 'wallets' && (
                            <>
                                <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">Sort</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs sm:text-sm shrink-0 focus:ring-2 focus:ring-amber-500/40"
                                >
                                    <option value="balance_desc">Balance ↓</option>
                                    <option value="balance_asc">Balance ↑</option>
                                    <option value="name_asc">Name A–Z</option>
                                    <option value="name_desc">Name Z–A</option>
                                </select>
                            </>
                        )}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="px-3 py-1.5 sm:py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-white text-xs sm:text-sm font-medium shrink-0 whitespace-nowrap"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-16 rounded-xl border border-gray-700 bg-gray-800/40">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-500 border-t-transparent mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">Loading...</p>
                    </div>
                ) : activeTab === 'wallets' ? (
                    <div className="rounded-xl border border-gray-700 overflow-hidden bg-gray-800/60">
                        {hasActiveFilters && (
                            <div className="px-4 py-2 border-b border-gray-700 text-xs text-gray-400">
                                Showing <span className="text-white font-semibold">{wallets.length}</span> on this page
                                <span className="text-gray-500"> · total {totalWallets}</span>
                                {searchQuery && <span className="text-amber-400 ml-1">for &quot;{searchQuery}&quot;</span>}
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-700 text-left text-gray-400 uppercase text-xs">
                                        <th className="px-4 py-3">Player</th>
                                        <th className="px-4 py-3 text-right">Balance</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wallets.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-12 text-center text-gray-500">
                                                <FaWallet className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                                                No wallets found
                                            </td>
                                        </tr>
                                    ) : wallets.map((wallet) => (
                                        <tr key={wallet._id} className="border-b border-gray-700/60 hover:bg-gray-700/30">
                                            <td className="px-4 py-3">
                                                <div className="text-white font-medium">{wallet.userId?.username || 'Unknown'}</div>
                                                {wallet.userId?.phone && <div className="text-xs text-gray-500">{wallet.userId.phone}</div>}
                                                {!wallet.userId?.phone && wallet.userId?.email && <div className="text-xs text-gray-500">{wallet.userId.email}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-mono font-semibold text-emerald-400">{formatCurrency(wallet.balance)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="inline-flex gap-1.5 sm:gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openAdjust(wallet, 'credit')}
                                                        className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-medium text-white"
                                                    >
                                                        <FaPlus className="w-3 h-3" /> Add
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openAdjust(wallet, 'debit')}
                                                        className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-xs font-medium text-white"
                                                    >
                                                        <FaMinus className="w-3 h-3" /> Deduct
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {!loading && pagination.totalPages > 1 && (
                            <div className="p-4 border-t border-gray-700">
                                <PaginationBar pagination={pagination} onPageChange={setPage} className="mt-0" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="rounded-xl border border-gray-700 overflow-hidden bg-gray-800/60">
                        {searchQuery && (
                            <div className="px-4 py-2 border-b border-gray-700 text-xs text-gray-400">
                                Showing <span className="text-white font-semibold">{filteredTransactions.length}</span> of {transactions.length}
                                <span className="text-amber-400 ml-1">for &quot;{searchQuery}&quot;</span>
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-700 text-left text-gray-400 uppercase text-xs">
                                        <th className="px-4 py-3">Player</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                        <th className="px-4 py-3 hidden md:table-cell">Description</th>
                                        <th className="px-4 py-3 text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                                                <FaExchangeAlt className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                                                {searchQuery ? 'No matching transactions' : 'No transactions found'}
                                            </td>
                                        </tr>
                                    ) : filteredTransactions.map((t) => (
                                        <tr key={t._id} className="border-b border-gray-700/60 hover:bg-gray-700/30">
                                            <td className="px-4 py-3 text-white font-medium">{t.userId?.username || 'Unknown'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                    t.type === 'credit' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                                }`}>
                                                    {t.type === 'credit' ? 'Credit' : 'Debit'}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-mono font-semibold ${t.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {t.type === 'credit' ? '+' : '−'}{formatCurrency(t.amount)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell max-w-[220px] truncate" title={t.description}>
                                                {t.description || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-400 text-xs whitespace-nowrap">
                                                {new Date(t.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {!loading && pagination.totalPages > 1 && (
                            <div className="p-4 border-t border-gray-700">
                                <PaginationBar pagination={pagination} onPageChange={setPage} className="mt-0" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {adjustModal.show && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl max-w-md w-full p-5 sm:p-6 border border-gray-700 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                adjustModal.type === 'credit' ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                            }`}>
                                {adjustModal.type === 'credit'
                                    ? <FaPlus className="w-5 h-5 text-emerald-400" />
                                    : <FaMinus className="w-5 h-5 text-rose-400" />}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-lg sm:text-xl font-bold text-white">
                                    {adjustModal.type === 'credit' ? 'Add Money' : 'Deduct Money'}
                                </h3>
                                <p className="text-sm text-gray-400 truncate">{adjustModal.wallet?.userId?.username || 'Player'}</p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4 mb-4">
                            <div className="flex justify-between items-center gap-3">
                                <span className="text-gray-400 text-sm shrink-0">Current Balance</span>
                                <span className="font-bold font-mono text-emerald-400 text-right break-words">{formatCurrency(adjustModal.wallet?.balance)}</span>
                            </div>
                        </div>

                        <div className="mb-5">
                            <label className="block text-gray-400 text-sm mb-2">
                                Amount to {adjustModal.type === 'credit' ? 'add' : 'deduct'}
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                                <input
                                    type="number"
                                    value={adjustAmount}
                                    onChange={(e) => setAdjustAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="w-full pl-8 pr-4 py-2.5 sm:py-3 bg-gray-900 border border-gray-600 rounded-xl text-white text-lg font-semibold focus:outline-none focus:border-amber-500"
                                    min="1"
                                    autoFocus
                                />
                            </div>
                            {adjustAmount && Number(adjustAmount) > 0 && (
                                <p className="text-xs text-gray-500 mt-2">
                                    New balance:{' '}
                                    <span className="text-white font-semibold font-mono">
                                        {formatCurrency(adjustModal.type === 'credit'
                                            ? (adjustModal.wallet?.balance || 0) + Number(adjustAmount)
                                            : Math.max(0, (adjustModal.wallet?.balance || 0) - Number(adjustAmount)))}
                                    </span>
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button type="button" onClick={closeAdjust} className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-white text-sm font-medium">
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAdjust}
                                disabled={adjusting || !adjustAmount || Number(adjustAmount) <= 0}
                                className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 ${
                                    adjustModal.type === 'credit' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                                }`}
                            >
                                {adjusting ? 'Processing...' : (adjustModal.type === 'credit' ? 'Add Money' : 'Deduct Money')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default Wallet;
