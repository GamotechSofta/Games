import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { API_BASE_URL, bookieFetch } from '../utils/api';
import { sanitizeDisplayText, isGenericPaymentRemark } from '../utils/paymentDisplay';
import { FaWallet, FaPlus, FaMinus, FaBuilding, FaHandHoldingUsd, FaSearch, FaTimes, FaCoins, FaHistory, FaLock } from 'react-icons/fa';

const Wallet = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [wallets, setWallets] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [payuPayments, setPayuPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(() => (searchParams.get('tab') === 'transactions' ? 'transactions' : 'wallets'));
    const [txnSourceFilter, setTxnSourceFilter] = useState('all'); // all | wallet | payu
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
                const res = await bookieFetch(`${API_BASE_URL}/bookie/security-password-status`);
                const json = await res.json();
                if (json.success && json.data) setSecurityPasswordRequired(json.data.isSet === true);
            } catch (e) {
                console.error(e);
            }
        };
        check();
    }, [bookieType]);

    useEffect(() => {
        if (searchParams.get('tab') === 'transactions' && activeTab !== 'transactions') {
            setActiveTab('transactions');
        }
    }, [searchParams]);

    useEffect(() => {
        if (activeTab === 'wallets') fetchWallets();
        else fetchAllTransactions();
    }, [activeTab]);

    const setTab = (tab) => {
        setActiveTab(tab);
        if (tab === 'transactions') setSearchParams({ tab: 'transactions' });
        else setSearchParams({});
    };

    const canManage = bookieType === 'bookie_collects';

    const fetchWallets = async () => {
        try {
            setLoading(true);
            const response = await bookieFetch(`${API_BASE_URL}/wallet/all?limit=200`);
            const data = await response.json();
            if (data.success) setWallets(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchWalletTransactions = async () => {
        const response = await bookieFetch(`${API_BASE_URL}/wallet/transactions?limit=200`);
        const data = await response.json();
        if (data.success) setTransactions(data.data || []);
    };

    const fetchPayuPayments = async () => {
        const q = new URLSearchParams({ view: 'payu_log' });
        const response = await bookieFetch(`${API_BASE_URL}/payments?${q}`);
        const data = await response.json();
        if (data.success) setPayuPayments(data.data || []);
    };

    const fetchAllTransactions = async () => {
        try {
            setLoading(true);
            await Promise.all([fetchWalletTransactions(), fetchPayuPayments()]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatTxnDate = (dateString) => new Date(dateString).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const getPaymentStatusBadge = (status) => {
        const styles = {
            pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
            approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
            rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
            completed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        };
        return styles[status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    };

    const unifiedTransactions = (() => {
        const depositPaymentIds = new Set(
            (payuPayments || []).map((p) => p._id?.toString?.() || String(p._id))
        );
        const walletRows = (transactions || [])
            .filter((t) => {
                const ref = t.referenceId ? String(t.referenceId) : '';
                if (ref && depositPaymentIds.has(ref)) return false;
                const desc = (t.description || '').toLowerCase();
                if (desc.includes('deposit credited') && ref && depositPaymentIds.has(ref)) return false;
                return true;
            })
            .map((t) => ({
            id: `w-${t._id}`,
            source: 'wallet',
            player: t.userId?.username || 'Unknown',
            typeLabel: t.type === 'credit' ? 'Credit' : 'Debit',
            isCredit: t.type === 'credit',
            amount: Number(t.amount) || 0,
            detail: sanitizeDisplayText(t.description) || 'Wallet activity',
            status: null,
            date: t.createdAt,
        }));
        const payuRows = (payuPayments || []).map((p) => {
            const remark = p.adminRemarks && !isGenericPaymentRemark(p.adminRemarks)
                ? sanitizeDisplayText(p.adminRemarks)
                : '';
            return {
            id: `p-${p._id}`,
            source: 'payu',
            player: p.userId?.username || 'Unknown',
            typeLabel: 'Deposit',
            isCredit: true,
            amount: Number(p.amount) || 0,
            detail: remark || 'Deposit',
            status: p.status,
            date: p.createdAt || p.processedAt,
        };
        });
        let rows = [...walletRows, ...payuRows];
        if (txnSourceFilter === 'wallet') rows = walletRows;
        if (txnSourceFilter === 'payu') rows = payuRows;
        rows.sort((a, b) => new Date(b.date) - new Date(a.date));
        return rows;
    })();

    const payuTotalAmount = payuPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

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
            const response = await bookieFetch(`${API_BASE_URL}/wallet/adjust`, {
                method: 'POST',
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
        ? unifiedTransactions.filter((t) => {
            const q = searchQuery.toLowerCase();
            return (t.player || '').toLowerCase().includes(q)
                || (t.detail || '').toLowerCase().includes(q)
                || (t.typeLabel || '').toLowerCase().includes(q);
        })
        : unifiedTransactions;

    return (
        <Layout title="Wallet">
            <div className="max-w-[1600px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
                            <FaWallet className="text-amber-500" />
                            Wallet Management
                            {!canManage && <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-normal border border-slate-700">View Only</span>}
                        </h1>
                        <p className="text-slate-600 text-sm mt-1">
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
                <div className="glass-panel glass-panel-card p-6 rounded-2xl border border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                        <FaCoins className="w-32 h-32 text-amber-500 -mb-10 -mr-10 rotate-12" />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Total Player Balance</p>
                            <p className="text-4xl font-mono font-bold text-amber-500 tracking-tight">₹{totalBalance.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-8">
                            <div>
                                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 text-right">Active Wallets</p>
                                <p className="text-2xl font-bold text-slate-900 text-right">{wallets.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    {/* Tabs */}
                    <div className="glass-panel glass-panel-card p-1 rounded-xl flex items-center gap-1 border border-slate-200 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setTab('wallets')}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'wallets'
                                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                : 'text-slate-400 hover:text-slate-900 hover:bg-white/5'
                                }`}
                        >
                            <FaWallet className="w-4 h-4" />
                            Wallets
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('transactions')}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'transactions'
                                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                : 'text-slate-400 hover:text-slate-900 hover:bg-white/5'
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
                            className="w-full pl-11 pr-10 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all text-sm font-medium"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-slate-500 hover:text-slate-900 transition-colors"
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
                    <div className="glass-panel glass-panel-card rounded-2xl overflow-hidden border border-slate-200">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-slate-200 text-left">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Player</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Balance</th>
                                    {canManage && <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>}
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
                                                    <p className="font-bold text-slate-900 text-sm">{w.userId?.username || 'Unknown'}</p>
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
                    <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: 'wallet', label: 'Wallet Activity' },
                                    { id: 'payu', label: 'Deposits' },
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setTxnSourceFilter(f.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${txnSourceFilter === f.id
                                            ? 'bg-amber-500 text-black border-amber-500'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-amber-500/50'}`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm">
                                <span className="text-slate-600">
                                    Deposits: <strong className="text-emerald-600">{payuPayments.length}</strong>
                                    {' '}(₹{payuTotalAmount.toLocaleString('en-IN')})
                                </span>
                                <span className="text-slate-600">
                                    Wallet entries: <strong className="text-slate-900">{unifiedTransactions.filter((r) => r.source === 'wallet').length}</strong>
                                </span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">
                            Deposits are added automatically after successful payment. Wallet activity includes approved withdrawals and balance changes.
                        </p>
                        <div className="glass-panel glass-panel-card rounded-2xl overflow-hidden border border-slate-200">
                            <table className="w-full">
                                <thead className="bg-white/5 border-b border-slate-200 text-left">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Player</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider hidden md:table-cell">Details</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                                {searchQuery ? 'No matching transactions found' : 'No transactions recorded'}
                                            </td>
                                        </tr>
                                    ) : filteredTransactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold border border-slate-200">
                                                        {(t.player || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <p className="font-bold text-slate-900 text-sm">{t.player}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border ${t.isCredit
                                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                                    : 'bg-red-500/10 text-red-600 border-red-500/20'
                                                    }`}>
                                                    {t.typeLabel}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500 hidden md:table-cell max-w-[200px] truncate">
                                                {t.detail}
                                            </td>
                                            <td className="px-6 py-4">
                                                {t.status ? (
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPaymentStatusBadge(t.status)}`}>
                                                        {t.status}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`font-mono font-bold ${t.isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {t.isCredit ? '+' : '−'}₹{t.amount?.toLocaleString('en-IN')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-xs text-slate-500 hidden sm:table-cell whitespace-nowrap">
                                                {formatTxnDate(t.date)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Adjust Balance Modal */}
            {adjustModal.show && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="glass-panel glass-panel-card w-full max-w-md rounded-2xl p-6 border border-slate-200 relative overflow-hidden shadow-2xl">
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
                                    <h3 className="text-xl font-bold text-slate-900 leading-tight">
                                        {adjustModal.type === 'credit' ? 'Add Funds' : 'Deduct Funds'}
                                    </h3>
                                    <p className="text-slate-400 text-xs">
                                        Wallet: <span className="text-slate-900 font-bold">{adjustModal.wallet?.userId?.username}</span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={closeAdjust} className="text-slate-500 hover:text-slate-900 transition-colors">
                                <FaTimes className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-black/40 rounded-xl p-4 mb-6 border border-slate-200 flex items-center justify-between">
                            <span className="text-slate-400 text-sm font-medium">Current Balance</span>
                            <span className="text-xl font-mono font-bold text-amber-500">₹{adjustModal.wallet?.balance?.toLocaleString()}</span>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                                    Amount (₹)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={adjustAmount}
                                        onChange={(e) => setAdjustAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full px-4 py-4 rounded-xl bg-white border border-slate-200 text-slate-900 text-2xl font-bold placeholder-slate-700 focus:outline-none focus:border-white/20 transition-all text-center"
                                        min="1"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {adjustAmount && Number(adjustAmount) > 0 && (
                                <div className="flex items-center justify-between text-sm px-2">
                                    <span className="text-slate-500">New Balance Preview</span>
                                    <span className="font-mono font-bold text-slate-900">
                                        ₹{(adjustModal.type === 'credit'
                                            ? (adjustModal.wallet?.balance || 0) + Number(adjustAmount)
                                            : Math.max(0, (adjustModal.wallet?.balance || 0) - Number(adjustAmount))
                                        ).toLocaleString()}
                                    </span>
                                </div>
                            )}

                            {securityPasswordRequired && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <FaLock className="w-3.5 h-3.5 text-purple-400" />
                                        Security password
                                    </label>
                                    <input
                                        type="password"
                                        value={adjustSecurityPassword}
                                        onChange={(e) => setAdjustSecurityPassword(e.target.value)}
                                        placeholder="Enter security password to confirm"
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
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
