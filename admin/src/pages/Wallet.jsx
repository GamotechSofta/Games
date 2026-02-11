import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { FaWallet, FaPlus, FaMinus, FaExchangeAlt, FaBuilding, FaSearch, FaTimes } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';

const getAuthHeaders = () => {
    const admin = JSON.parse(localStorage.getItem('admin'));
    const password = sessionStorage.getItem('adminPassword') || '';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${admin?.username}:${password}`)}`,
    };
};

const Wallet = () => {
    const navigate = useNavigate();
    const [wallets, setWallets] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('wallets');

    const [searchQuery, setSearchQuery] = useState('');
    const [sourceFilter, setSourceFilter] = useState(''); // '', 'direct', 'admin_collects', 'bookie_collects'
    const [bookieFilter, setBookieFilter] = useState(''); // specific bookie name
    const [sortBy, setSortBy] = useState('balance_desc'); // balance_desc, balance_asc, name_asc, name_desc

    // Adjust modal
    const [adjustModal, setAdjustModal] = useState({ show: false, wallet: null, type: '' });
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjusting, setAdjusting] = useState(false);

    useEffect(() => {
        if (activeTab === 'wallets') fetchWallets();
        else fetchTransactions();
    }, [activeTab]);

    const fetchWallets = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/wallet/all`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (data.success) setWallets(data.data);
        } catch (err) {
            console.error('Error fetching wallets:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/wallet/transactions`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (data.success) setTransactions(data.data);
        } catch (err) {
            console.error('Error fetching transactions:', err);
        } finally {
            setLoading(false);
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
            const response = await fetch(`${API_BASE_URL}/wallet/adjust`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ userId, amount, type: adjustModal.type }),
            });
            const data = await response.json();
            if (data.success) {
                closeAdjust();
                fetchWallets();
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
        localStorage.removeItem('admin');
        sessionStorage.removeItem('adminPassword');
        navigate('/');
    };

    const isBookieCollects = (wallet) => wallet.userBookieType === 'bookie_collects';
    const totalBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);

    // Unique bookie names for dropdown
    const bookieNames = [...new Set(wallets.filter(w => w.userBookieName).map(w => w.userBookieName))].sort();
    // Bookies filtered by source type
    const filteredBookieNames = sourceFilter === 'bookie_collects'
        ? [...new Set(wallets.filter(w => w.userBookieType === 'bookie_collects' && w.userBookieName).map(w => w.userBookieName))].sort()
        : sourceFilter === 'admin_collects'
            ? [...new Set(wallets.filter(w => w.userBookieType === 'admin_collects' && w.userBookieName).map(w => w.userBookieName))].sort()
            : bookieNames;

    const hasActiveFilters = searchQuery || sourceFilter || bookieFilter;

    const filteredWallets = (() => {
        let result = wallets;

        // Source filter
        if (sourceFilter) {
            result = result.filter(w => {
                if (sourceFilter === 'direct') return w.userBookieType === 'direct';
                if (sourceFilter === 'admin_collects') return w.userBookieType === 'admin_collects';
                if (sourceFilter === 'bookie_collects') return w.userBookieType === 'bookie_collects';
                return true;
            });
        }

        // Bookie name filter
        if (bookieFilter) {
            result = result.filter(w => w.userBookieName === bookieFilter);
        }

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(w =>
                (w.userId?.username || '').toLowerCase().includes(q)
                || (w.userId?.email || '').toLowerCase().includes(q)
                || (w.userBookieName || '').toLowerCase().includes(q)
            );
        }

        // Sort
        result = [...result].sort((a, b) => {
            switch (sortBy) {
                case 'balance_asc': return (a.balance || 0) - (b.balance || 0);
                case 'name_asc': return (a.userId?.username || '').localeCompare(b.userId?.username || '');
                case 'name_desc': return (b.userId?.username || '').localeCompare(a.userId?.username || '');
                case 'balance_desc':
                default: return (b.balance || 0) - (a.balance || 0);
            }
        });

        return result;
    })();

    const filteredTransactions = (() => {
        let result = transactions;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(t =>
                (t.userId?.username || '').toLowerCase().includes(q)
                || (t.description || '').toLowerCase().includes(q)
            );
        }
        return result;
    })();

    const clearAllFilters = () => {
        setSearchQuery('');
        setSourceFilter('');
        setBookieFilter('');
        setSortBy('balance_desc');
    };

    return (
        <AdminLayout onLogout={handleLogout} title="Wallet">
            <div className="space-y-4 sm:space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                        <FaWallet className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 shrink-0" />
                        Wallet Management
                    </h1>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">Manage player wallet balances. Bookie Collects users are managed by their bookie.</p>
                </div>

                {/* Summary */}
                <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Balance</p>
                            <p className="text-xl sm:text-2xl font-bold text-yellow-400 mt-1">₹{totalBalance.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Wallets</p>
                            <p className="text-xl sm:text-2xl font-bold text-white mt-1">{wallets.length}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 sm:gap-4 border-b border-gray-700 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('wallets')}
                        className={`pb-3 px-3 font-semibold text-sm whitespace-nowrap ${
                            activeTab === 'wallets' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-gray-400 hover:text-gray-300'
                        }`}
                    >
                        Player Wallets
                    </button>
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`pb-3 px-3 font-semibold text-sm whitespace-nowrap ${
                            activeTab === 'transactions' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-gray-400 hover:text-gray-300'
                        }`}
                    >
                        Transactions
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 p-3 sm:p-4 space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by player name, email, or bookie..."
                            className="w-full pl-10 pr-10 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                                <FaTimes className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Dropdowns row */}
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        {/* Source filter */}
                        <div className="flex-1 min-w-[140px] sm:max-w-[180px]">
                            <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Source</label>
                            <select
                                value={sourceFilter}
                                onChange={(e) => { setSourceFilter(e.target.value); setBookieFilter(''); }}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500/50"
                            >
                                <option value="">All Sources</option>
                                <option value="direct">Direct Users</option>
                                <option value="admin_collects">Admin Collects</option>
                                <option value="bookie_collects">Bookie Collects</option>
                            </select>
                        </div>

                        {/* Bookie name filter (only when a bookie-type source is selected or all) */}
                        {(sourceFilter === 'admin_collects' || sourceFilter === 'bookie_collects' || (!sourceFilter && bookieNames.length > 0)) && filteredBookieNames.length > 0 && (
                            <div className="flex-1 min-w-[140px] sm:max-w-[180px]">
                                <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Bookie</label>
                                <select
                                    value={bookieFilter}
                                    onChange={(e) => setBookieFilter(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500/50"
                                >
                                    <option value="">All Bookies</option>
                                    {filteredBookieNames.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Sort */}
                        <div className="flex-1 min-w-[140px] sm:max-w-[180px]">
                            <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Sort By</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500/50"
                            >
                                <option value="balance_desc">Balance (High → Low)</option>
                                <option value="balance_asc">Balance (Low → High)</option>
                                <option value="name_asc">Name (A → Z)</option>
                                <option value="name_desc">Name (Z → A)</option>
                            </select>
                        </div>

                        {/* Clear */}
                        {hasActiveFilters && (
                            <div className="flex items-end">
                                <button
                                    onClick={clearAllFilters}
                                    className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white text-sm font-medium transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-16 bg-gray-800/50 rounded-xl border border-gray-700">
                        <div className="animate-spin rounded-full h-12 w-12 border-2 border-amber-500 border-t-transparent mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading...</p>
                    </div>
                ) : activeTab === 'wallets' ? (
                    <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 overflow-hidden">
                        {hasActiveFilters && (
                            <div className="px-5 py-2.5 bg-gray-900/50 border-b border-gray-700/50 text-xs text-gray-400 flex flex-wrap items-center gap-2">
                                <span>Showing <span className="text-white font-semibold">{filteredWallets.length}</span> of {wallets.length} wallets</span>
                                {sourceFilter && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        sourceFilter === 'direct' ? 'bg-blue-500/20 text-blue-300' :
                                        sourceFilter === 'admin_collects' ? 'bg-emerald-500/20 text-emerald-300' :
                                        'bg-amber-500/20 text-amber-300'
                                    }`}>
                                        {sourceFilter === 'direct' ? 'Direct Users' : sourceFilter === 'admin_collects' ? 'Admin Collects' : 'Bookie Collects'}
                                    </span>
                                )}
                                {bookieFilter && <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">{bookieFilter}</span>}
                                {searchQuery && <span className="text-amber-400">for "{searchQuery}"</span>}
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-900/80">
                                    <tr>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Source</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Balance</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/50">
                                    {filteredWallets.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center">
                                                <FaWallet className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                                <p className="text-gray-400">No wallets found</p>
                                            </td>
                                        </tr>
                                    ) : filteredWallets.map((wallet) => {
                                        const isBc = isBookieCollects(wallet);
                                        return (
                                            <tr key={wallet._id} className="hover:bg-gray-700/30 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <p className="font-medium text-white">{wallet.userId?.username || 'Unknown'}</p>
                                                    {wallet.userId?.email && <p className="text-xs text-gray-500">{wallet.userId.email}</p>}
                                                </td>
                                                <td className="px-5 py-3.5 hidden sm:table-cell">
                                                    {isBc ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                                            <FaBuilding className="w-2.5 h-2.5" />
                                                            {wallet.userBookieName || 'Bookie Collects'}
                                                        </span>
                                                    ) : wallet.userBookieType === 'admin_collects' ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                            {wallet.userBookieName || 'Admin Collects'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-500">Direct User</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <span className="text-base font-bold text-yellow-400">₹{wallet.balance?.toLocaleString()}</span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    {isBc ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                            <FaBuilding className="w-3 h-3" />
                                                            Bookie Manages
                                                        </span>
                                                    ) : (
                                                        <div className="inline-flex gap-2">
                                                            <button
                                                                onClick={() => openAdjust(wallet, 'credit')}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-xs font-medium text-white transition-colors"
                                                            >
                                                                <FaPlus className="w-3 h-3" /> Add
                                                            </button>
                                                            <button
                                                                onClick={() => openAdjust(wallet, 'debit')}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-medium text-white transition-colors"
                                                            >
                                                                <FaMinus className="w-3 h-3" /> Deduct
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 overflow-hidden">
                        {searchQuery && (
                            <div className="px-5 py-2.5 bg-gray-900/50 border-b border-gray-700/50 text-xs text-gray-400">
                                Showing <span className="text-white font-semibold">{filteredTransactions.length}</span> of {transactions.length} transactions
                                {searchQuery && <span className="text-amber-400 ml-1">for "{searchQuery}"</span>}
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-900/80">
                                    <tr>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Description</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/50">
                                    {filteredTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center">
                                                <FaExchangeAlt className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                                <p className="text-gray-400">{searchQuery ? 'No matching transactions' : 'No transactions found'}</p>
                                            </td>
                                        </tr>
                                    ) : filteredTransactions.map((t) => (
                                        <tr key={t._id} className="hover:bg-gray-700/30 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <p className="font-medium text-white text-sm">{t.userId?.username || 'Unknown'}</p>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    t.type === 'credit'
                                                        ? 'bg-green-600/20 text-green-400 border border-green-600/40'
                                                        : 'bg-red-600/20 text-red-400 border border-red-600/40'
                                                }`}>
                                                    {t.type === 'credit' ? '+ Credit' : '− Debit'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <span className={`font-semibold ${t.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                                                    {t.type === 'credit' ? '+' : '−'}₹{t.amount?.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right text-xs text-gray-400 hidden sm:table-cell max-w-[200px] truncate">
                                                {t.description || '—'}
                                            </td>
                                            <td className="px-5 py-3.5 text-right text-xs text-gray-400">
                                                {new Date(t.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Adjust Balance Modal */}
            {adjustModal.show && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 border border-gray-700 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                adjustModal.type === 'credit' ? 'bg-green-600/20' : 'bg-red-600/20'
                            }`}>
                                {adjustModal.type === 'credit'
                                    ? <FaPlus className="w-5 h-5 text-green-400" />
                                    : <FaMinus className="w-5 h-5 text-red-400" />}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">
                                    {adjustModal.type === 'credit' ? 'Add Money' : 'Deduct Money'}
                                </h3>
                                <p className="text-sm text-gray-400 mt-0.5">
                                    {adjustModal.wallet?.userId?.username || 'Player'}
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-900 rounded-lg p-4 mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Current Balance</span>
                                <span className="text-lg font-bold text-yellow-400">₹{adjustModal.wallet?.balance?.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="mb-4">
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
                                    className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-lg font-semibold focus:outline-none focus:border-amber-500"
                                    min="1"
                                    autoFocus
                                />
                            </div>
                            {adjustAmount && Number(adjustAmount) > 0 && (
                                <p className="text-xs text-gray-500 mt-2">
                                    New balance: <span className="text-white font-semibold">
                                        ₹{(adjustModal.type === 'credit'
                                            ? (adjustModal.wallet?.balance || 0) + Number(adjustAmount)
                                            : Math.max(0, (adjustModal.wallet?.balance || 0) - Number(adjustAmount))
                                        ).toLocaleString()}
                                    </span>
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={closeAdjust}
                                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAdjust}
                                disabled={adjusting || !adjustAmount || Number(adjustAmount) <= 0}
                                className={`flex-1 px-4 py-2.5 rounded-lg text-white font-medium transition-colors disabled:opacity-50 ${
                                    adjustModal.type === 'credit'
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-red-600 hover:bg-red-700'
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
