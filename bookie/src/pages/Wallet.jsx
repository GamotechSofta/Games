import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { API_BASE_URL, getBookieAuthHeaders } from '../utils/api';
import { FaWallet, FaPlus, FaMinus, FaExchangeAlt, FaBuilding, FaHandHoldingUsd, FaSearch, FaTimes } from 'react-icons/fa';

const Wallet = () => {
    const [wallets, setWallets] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('wallets');
    const [bookieType, setBookieType] = useState('');

    const [searchQuery, setSearchQuery] = useState('');

    // Adjust modal
    const [adjustModal, setAdjustModal] = useState({ show: false, wallet: null, type: '' });
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjusting, setAdjusting] = useState(false);

    useEffect(() => {
        const bookie = JSON.parse(localStorage.getItem('bookie') || '{}');
        setBookieType(bookie.bookieType || 'admin_collects');
    }, []);

    useEffect(() => {
        if (activeTab === 'wallets') fetchWallets();
        else fetchTransactions();
    }, [activeTab]);

    const canManage = bookieType === 'bookie_collects';

    const fetchWallets = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/wallet/all`, { headers: getBookieAuthHeaders() });
            const data = await response.json();
            if (data.success) setWallets(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/wallet/transactions`, { headers: getBookieAuthHeaders() });
            const data = await response.json();
            if (data.success) setTransactions(data.data);
        } catch (err) {
            console.error(err);
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
                headers: getBookieAuthHeaders(),
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

    const totalBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);

    const filteredWallets = searchQuery.trim()
        ? wallets.filter((w) => {
            const q = searchQuery.toLowerCase();
            return (w.userId?.username || '').toLowerCase().includes(q)
                || (w.userId?.email || '').toLowerCase().includes(q);
        })
        : wallets;

    const filteredTransactions = searchQuery.trim()
        ? transactions.filter((t) => {
            const q = searchQuery.toLowerCase();
            return (t.userId?.username || '').toLowerCase().includes(q)
                || (t.description || '').toLowerCase().includes(q);
        })
        : transactions;

    return (
        <Layout title="Wallet">
            <div className="space-y-4 sm:space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        <FaWallet className="w-6 h-6 text-amber-500 shrink-0" />
                        Wallet Management
                        {!canManage && <span className="text-base font-normal text-gray-400 ml-2">(View Only)</span>}
                    </h1>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">
                        {canManage
                            ? 'Add or deduct money from your players\' wallets'
                            : 'View your players\' wallet balances. Admin manages wallet operations.'}
                    </p>
                    <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        canManage
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}>
                        {canManage ? <FaBuilding className="w-3.5 h-3.5" /> : <FaHandHoldingUsd className="w-3.5 h-3.5" />}
                        {canManage ? 'Bookie Collects — You manage wallets' : 'Admin Collects — Admin manages wallets'}
                    </div>
                </div>

                {/* Summary strip */}
                <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Balance (all players)</p>
                            <p className="text-xl sm:text-2xl font-bold text-yellow-400 mt-1">₹{totalBalance.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Players</p>
                            <p className="text-xl sm:text-2xl font-bold text-white mt-1">{wallets.length}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-gray-700/50">
                    <button
                        onClick={() => setActiveTab('wallets')}
                        className={`pb-3 px-1 font-semibold text-sm transition-colors ${
                            activeTab === 'wallets'
                                ? 'text-yellow-500 border-b-2 border-yellow-500'
                                : 'text-gray-400 hover:text-gray-300'
                        }`}
                    >
                        Player Wallets
                    </button>
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`pb-3 px-1 font-semibold text-sm transition-colors ${
                            activeTab === 'transactions'
                                ? 'text-yellow-500 border-b-2 border-yellow-500'
                                : 'text-gray-400 hover:text-gray-300'
                        }`}
                    >
                        Transactions
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by player name or email..."
                        className="w-full pl-10 pr-10 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                            <FaTimes className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-16 bg-gray-800/50 rounded-xl border border-gray-700">
                        <div className="animate-spin rounded-full h-12 w-12 border-2 border-amber-500 border-t-transparent mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading...</p>
                    </div>
                ) : activeTab === 'wallets' ? (
                    <>
                        {/* Desktop table */}
                        <div className="hidden sm:block bg-gray-800/80 rounded-xl border border-gray-700/80 overflow-hidden">
                            {searchQuery && (
                                <div className="px-5 py-2.5 bg-gray-900/50 border-b border-gray-700/50 text-xs text-gray-400">
                                    Showing <span className="text-white font-semibold">{filteredWallets.length}</span> of {wallets.length} wallets
                                    <span className="text-amber-400 ml-1">for "{searchQuery}"</span>
                                </div>
                            )}
                            <table className="w-full text-sm">
                                <thead className="bg-gray-900/80">
                                    <tr>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Balance</th>
                                        {canManage && <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/50">
                                    {filteredWallets.length === 0 ? (
                                        <tr>
                                            <td colSpan={canManage ? 3 : 2} className="px-6 py-12 text-center">
                                                <FaWallet className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                                <p className="text-gray-400">{searchQuery ? 'No matching players' : 'No wallets found'}</p>
                                            </td>
                                        </tr>
                                    ) : filteredWallets.map((w) => (
                                        <tr key={w._id} className="hover:bg-gray-700/30 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <p className="font-medium text-white">{w.userId?.username || 'Unknown'}</p>
                                                {w.userId?.email && <p className="text-xs text-gray-500">{w.userId.email}</p>}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <span className="text-base font-bold text-yellow-400">₹{w.balance?.toLocaleString()}</span>
                                            </td>
                                            {canManage && (
                                                <td className="px-5 py-3.5 text-right">
                                                    <div className="inline-flex gap-2">
                                                        <button
                                                            onClick={() => openAdjust(w, 'credit')}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-xs font-medium text-white transition-colors"
                                                        >
                                                            <FaPlus className="w-3 h-3" /> Add
                                                        </button>
                                                        <button
                                                            onClick={() => openAdjust(w, 'debit')}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-medium text-white transition-colors"
                                                        >
                                                            <FaMinus className="w-3 h-3" /> Deduct
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="sm:hidden space-y-3">
                            {filteredWallets.length === 0 ? (
                                <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
                                    <FaWallet className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400">{searchQuery ? 'No matching players' : 'No wallets found'}</p>
                                </div>
                            ) : filteredWallets.map((w) => (
                                <div key={w._id} className="bg-gray-800/80 rounded-xl border border-gray-700 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="min-w-0">
                                            <p className="font-medium text-white text-sm truncate">{w.userId?.username || 'Unknown'}</p>
                                            {w.userId?.email && <p className="text-xs text-gray-500 truncate">{w.userId.email}</p>}
                                        </div>
                                        <span className="text-base font-bold text-yellow-400 shrink-0">₹{w.balance?.toLocaleString()}</span>
                                    </div>
                                    {canManage && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openAdjust(w, 'credit')}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-xs font-medium text-white transition-colors"
                                            >
                                                <FaPlus className="w-3 h-3" /> Add Money
                                            </button>
                                            <button
                                                onClick={() => openAdjust(w, 'debit')}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-medium text-white transition-colors"
                                            >
                                                <FaMinus className="w-3 h-3" /> Deduct
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    /* Transactions tab */
                    <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 overflow-hidden">
                        {searchQuery && (
                            <div className="px-5 py-2.5 bg-gray-900/50 border-b border-gray-700/50 text-xs text-gray-400">
                                Showing <span className="text-white font-semibold">{filteredTransactions.length}</span> of {transactions.length} transactions
                                <span className="text-amber-400 ml-1">for "{searchQuery}"</span>
                            </div>
                        )}
                        <table className="w-full text-sm">
                            <thead className="bg-gray-900/80">
                                <tr>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center">
                                            <FaExchangeAlt className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                            <p className="text-gray-400">{searchQuery ? 'No matching transactions' : 'No transactions found'}</p>
                                        </td>
                                    </tr>
                                ) : filteredTransactions.map((t) => (
                                    <tr key={t._id} className="hover:bg-gray-700/30 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <p className="font-medium text-white text-sm">{t.userId?.username || 'Unknown'}</p>
                                            {t.description && <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{t.description}</p>}
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
                                        <td className="px-5 py-3.5 text-right text-xs text-gray-400 hidden sm:table-cell">
                                            {new Date(t.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
                            <div className="flex justify-between items-center mb-2">
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
        </Layout>
    );
};

export default Wallet;
