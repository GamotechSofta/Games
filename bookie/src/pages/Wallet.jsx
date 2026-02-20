import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { API_BASE_URL, getBookieAuthHeaders } from '../utils/api';
import { FaWallet, FaPlus, FaMinus, FaBuilding, FaHandHoldingUsd, FaSearch, FaTimes, FaCoins, FaHistory, FaLock } from 'react-icons/fa';

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
    const [adjustSecurityPassword, setAdjustSecurityPassword] = useState('');
    const [adjusting, setAdjusting] = useState(false);
    const [securityPasswordRequired, setSecurityPasswordRequired] = useState(false);

    useEffect(() => {
        const bookie = JSON.parse(localStorage.getItem('bookie') || '{}');
        setBookieType(bookie.bookieType || 'admin_collects');
    }, []);

    useEffect(() => {
        if (bookieType !== 'bookie_collects') return;
        const check = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/bookie/security-password-status`, { headers: getBookieAuthHeaders() });
                const json = await res.json();
                if (json.success && json.data) setSecurityPasswordRequired(json.data.isSet === true);
            } catch (e) {
                console.error(e);
            }
        };
        check();
    }, [bookieType]);

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
        setAdjustSecurityPassword('');
    };

    const closeAdjust = () => {
        setAdjustModal({ show: false, wallet: null, type: '' });
        setAdjustAmount('');
        setAdjustSecurityPassword('');
    };

    const handleAdjust = async () => {
        if (!adjustModal.wallet || !adjustAmount) return;
        const amount = parseFloat(adjustAmount);
        if (!amount || amount <= 0) return alert('Enter a valid amount');
        if (securityPasswordRequired && !(adjustSecurityPassword || '').trim()) {
            alert('Please enter your security password to confirm this action.');
            return;
        }

        setAdjusting(true);
        try {
            const userId = adjustModal.wallet.userId?._id || adjustModal.wallet.userId;
            const body = { userId, amount, type: adjustModal.type };
            if (securityPasswordRequired) body.securityPassword = adjustSecurityPassword.trim();
            const response = await fetch(`${API_BASE_URL}/wallet/adjust`, {
                method: 'POST',
                headers: {
                    ...getBookieAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body),
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
            <div className="max-w-[1600px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
                            <FaWallet className="text-amber-500" />
                            Wallet Management
                            {!canManage && <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-normal border border-slate-700">View Only</span>}
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {canManage
                                ? 'Manage player balances and transactions'
                                : 'Overview of player wallet balances'}
                        </p>
                    </div>

                    <div className={`glass-panel glass-panel-card px-5 py-3 rounded-xl flex items-center gap-3 border ${canManage ? 'border-purple-500/20' : 'border-emerald-500/20'
                        }`}>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${canManage ? 'bg-purple-500/10' : 'bg-emerald-500/10'
                            }`}>
                            {canManage ? <FaBuilding className="w-5 h-5 text-purple-400" /> : <FaHandHoldingUsd className="w-5 h-5 text-emerald-400" />}
                        </div>
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wider ${canManage ? 'text-purple-400' : 'text-emerald-400'
                                }`}>
                                {canManage ? 'Bookie Collects' : 'Admin Collects'}
                            </p>
                            <p className="text-slate-500 text-xs font-medium">
                                {canManage ? 'You manage wallets' : 'Admin manages wallets'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Summary Card */}
                <div className="glass-panel glass-panel-card p-6 rounded-2xl border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                        <FaCoins className="w-32 h-32 text-amber-500 -mb-10 -mr-10 rotate-12" />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Player Balance</p>
                            <p className="text-4xl font-mono font-bold text-amber-500 tracking-tight">₹{totalBalance.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-8">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 text-right">Active Wallets</p>
                                <p className="text-2xl font-bold text-white text-right">{wallets.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    {/* Tabs */}
                    <div className="glass-panel glass-panel-card p-1 rounded-xl flex items-center gap-1 border border-white/10 w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('wallets')}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'wallets'
                                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <FaWallet className="w-4 h-4" />
                            Wallets
                        </button>
                        <button
                            onClick={() => setActiveTab('transactions')}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'transactions'
                                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <FaHistory className="w-4 h-4" />
                            Transactions
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-80">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={activeTab === 'wallets' ? "Search players..." : "Search transactions..."}
                            className="w-full pl-11 pr-10 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all text-sm font-medium"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                            >
                                <FaTimes className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="glass-panel h-20 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : activeTab === 'wallets' ? (
                    <div className="glass-panel glass-panel-card rounded-2xl overflow-hidden border border-white/10">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/5 text-left">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Player</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Balance</th>
                                    {canManage && <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredWallets.length === 0 ? (
                                    <tr>
                                        <td colSpan={canManage ? 3 : 2} className="px-6 py-12 text-center text-slate-500">
                                            {searchQuery ? 'No matching players found' : 'No wallets found'}
                                        </td>
                                    </tr>
                                ) : filteredWallets.map((w) => (
                                    <tr key={w._id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold border border-slate-700">
                                                    {(w.userId?.username || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-sm">{w.userId?.username || 'Unknown'}</p>
                                                    <p className="text-xs text-slate-500">{w.userId?.email || 'No email'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-lg font-mono font-bold text-amber-500">₹{w.balance?.toLocaleString()}</span>
                                        </td>
                                        {canManage && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-100 transition-all">
                                                    <button
                                                        onClick={() => openAdjust(w, 'credit')}
                                                        className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 font-bold text-xs border border-green-500/20 transition-colors flex items-center gap-1.5"
                                                    >
                                                        <FaPlus className="w-3 h-3" /> Add
                                                    </button>
                                                    <button
                                                        onClick={() => openAdjust(w, 'debit')}
                                                        className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs border border-red-500/20 transition-colors flex items-center gap-1.5"
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
                ) : (
                    <div className="glass-panel glass-panel-card rounded-2xl overflow-hidden border border-white/10">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/5 text-left">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Player</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                            {searchQuery ? 'No matching transactions found' : 'No transactions recorded'}
                                        </td>
                                    </tr>
                                ) : filteredTransactions.map((t) => (
                                    <tr key={t._id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold border border-slate-700">
                                                    {(t.userId?.username || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-sm">{t.userId?.username || 'Unknown'}</p>
                                                    {t.description && <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{t.description}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border ${t.type === 'credit'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>
                                                {t.type === 'credit' ? 'Credit' : 'Debit'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-mono font-bold ${t.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {t.type === 'credit' ? '+' : '−'}₹{t.amount?.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs text-slate-500 hidden sm:table-cell">
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="glass-panel glass-panel-card w-full max-w-md rounded-2xl p-6 border border-white/10 relative overflow-hidden shadow-2xl">
                        {/* Header gradient */}
                        <div className={`absolute top-0 left-0 w-full h-1 ${adjustModal.type === 'credit' ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}></div>

                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${adjustModal.type === 'credit'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-red-500/10 text-red-400'
                                    }`}>
                                    {adjustModal.type === 'credit' ? <FaPlus className="w-5 h-5" /> : <FaMinus className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white leading-tight">
                                        {adjustModal.type === 'credit' ? 'Add Funds' : 'Deduct Funds'}
                                    </h3>
                                    <p className="text-slate-400 text-xs">
                                        Wallet: <span className="text-white font-bold">{adjustModal.wallet?.userId?.username}</span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={closeAdjust} className="text-slate-500 hover:text-white transition-colors">
                                <FaTimes className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-black/40 rounded-xl p-4 mb-6 border border-white/5 flex items-center justify-between">
                            <span className="text-slate-400 text-sm font-medium">Current Balance</span>
                            <span className="text-xl font-mono font-bold text-amber-500">₹{adjustModal.wallet?.balance?.toLocaleString()}</span>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Amount (₹)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={adjustAmount}
                                        onChange={(e) => setAdjustAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full px-4 py-4 rounded-xl bg-black/40 border border-white/10 text-white text-2xl font-bold placeholder-slate-700 focus:outline-none focus:border-white/20 transition-all text-center"
                                        min="1"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {adjustAmount && Number(adjustAmount) > 0 && (
                                <div className="flex items-center justify-between text-sm px-2">
                                    <span className="text-slate-500">New Balance Preview</span>
                                    <span className="font-mono font-bold text-white">
                                        ₹{(adjustModal.type === 'credit'
                                            ? (adjustModal.wallet?.balance || 0) + Number(adjustAmount)
                                            : Math.max(0, (adjustModal.wallet?.balance || 0) - Number(adjustAmount))
                                        ).toLocaleString()}
                                    </span>
                                </div>
                            )}

                            {securityPasswordRequired && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <FaLock className="w-3.5 h-3.5 text-purple-400" />
                                        Security password
                                    </label>
                                    <input
                                        type="password"
                                        value={adjustSecurityPassword}
                                        onChange={(e) => setAdjustSecurityPassword(e.target.value)}
                                        placeholder="Enter security password to confirm"
                                        className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                        autoComplete="off"
                                    />
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={closeAdjust}
                                    className="flex-1 px-4 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAdjust}
                                    disabled={adjusting || !adjustAmount || Number(adjustAmount) <= 0 || (securityPasswordRequired && !adjustSecurityPassword.trim())}
                                    className={`flex-1 px-4 py-3.5 rounded-xl text-black font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${adjustModal.type === 'credit'
                                        ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20'
                                        : 'bg-red-500 hover:bg-red-400 shadow-red-500/20'
                                        }`}
                                >
                                    {adjusting ? 'Processing...' : 'Confirm Update'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Wallet;
