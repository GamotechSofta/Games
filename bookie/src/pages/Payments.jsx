import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { API_BASE_URL, getBookieAuthHeaders } from '../utils/api';
import { FaCheck, FaTimes, FaEye, FaImage, FaArrowDown, FaArrowUp, FaClock, FaFilter, FaWallet, FaBuilding, FaHandHoldingUsd } from 'react-icons/fa';

const Payments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', type: '' });
    const [pendingCounts, setPendingCounts] = useState({ deposits: 0, withdrawals: 0, total: 0 });
    const [bookieType, setBookieType] = useState('');

    // Action modal
    const [actionModal, setActionModal] = useState({ show: false, payment: null, action: '' });
    const [adminRemarks, setAdminRemarks] = useState('');
    const [processing, setProcessing] = useState(false);

    // Image preview
    const [imageModal, setImageModal] = useState({ show: false, url: '' });

    // Detail modal
    const [detailModal, setDetailModal] = useState({ show: false, payment: null });

    useEffect(() => {
        const bookie = JSON.parse(localStorage.getItem('bookie') || '{}');
        setBookieType(bookie.bookieType || 'admin_collects');
        fetchPayments();
        fetchPendingCounts();
    }, [filters]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const q = new URLSearchParams();
            if (filters.status) q.append('status', filters.status);
            if (filters.type) q.append('type', filters.type);
            const response = await fetch(`${API_BASE_URL}/payments?${q}`, { headers: getBookieAuthHeaders() });
            const data = await response.json();
            if (data.success) setPayments(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingCounts = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/payments/pending-count`, { headers: getBookieAuthHeaders() });
            const data = await response.json();
            if (data.success) setPendingCounts(data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const openActionModal = (payment, action) => {
        setActionModal({ show: true, payment, action });
        setAdminRemarks('');
    };

    const closeActionModal = () => {
        setActionModal({ show: false, payment: null, action: '' });
        setAdminRemarks('');
    };

    const handleAction = async () => {
        if (!actionModal.payment || !actionModal.action) return;
        setProcessing(true);
        try {
            const response = await fetch(`${API_BASE_URL}/payments/${actionModal.payment._id}/${actionModal.action}`, {
                method: 'POST',
                headers: getBookieAuthHeaders(),
                body: JSON.stringify({ adminRemarks: adminRemarks || (actionModal.action === 'approve' ? 'Approved by bookie' : 'Rejected by bookie') }),
            });
            const data = await response.json();
            if (data.success) {
                closeActionModal();
                fetchPayments();
                fetchPendingCounts();
            } else {
                alert(data.message || 'Action failed');
            }
        } catch {
            alert('Network error');
        } finally {
            setProcessing(false);
        }
    };

    const canManage = bookieType === 'bookie_collects';

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
            completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        };
        return styles[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    };

    const getTypeBadge = (type) => {
        return type === 'deposit'
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    };

    const hasActiveFilters = filters.status || filters.type;
    const pendingRequireAction = pendingCounts.total > 0;

    const getScreenshotUrl = (url) => {
        if (!url) return '';
        return url.startsWith('http') ? url : `${API_BASE_URL.replace('/api/v1', '')}${url}`;
    };

    return (
        <Layout title="Payments">
            <div className="max-w-[1600px] mx-auto min-w-0">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3 mb-2">
                        <FaWallet className="text-amber-500" />
                        Payment Management
                        {!canManage && <span className="text-base font-normal px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">View Only</span>}
                    </h1>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide border ${canManage
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                        {canManage ? <FaBuilding className="w-3.5 h-3.5" /> : <FaHandHoldingUsd className="w-3.5 h-3.5" />}
                        {canManage ? 'Bookie Collects — You manage payments' : 'Admin Collects — Admin manages payments'}
                    </div>
                </div>

                {/* Quick Stats – clickable for quick filter */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <button
                        className={`glass-panel p-6 rounded-2xl text-left transition-all group relative overflow-hidden ${filters.status === 'pending' && filters.type === 'deposit'
                                ? 'border-amber-500/50 shadow-[0_0_30px_-10px_rgba(245,158,11,0.3)]'
                                : 'hover:border-white/20'
                            }`}
                        onClick={() => setFilters({ status: 'pending', type: 'deposit' })}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FaArrowDown className="w-24 h-24 text-amber-500 rotate-[-15deg]" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Deposits</p>
                            <p className="text-3xl font-bold text-white group-hover:text-amber-400 transition-colors">{pendingCounts.deposits}</p>
                            <p className="text-xs text-amber-500 mt-2 flex items-center gap-1 font-medium">
                                Click to filter <FaFilter className="w-3 h-3" />
                            </p>
                        </div>
                    </button>

                    <button
                        className={`glass-panel p-6 rounded-2xl text-left transition-all group relative overflow-hidden ${filters.status === 'pending' && filters.type === 'withdrawal'
                                ? 'border-purple-500/50 shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)]'
                                : 'hover:border-white/20'
                            }`}
                        onClick={() => setFilters({ status: 'pending', type: 'withdrawal' })}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FaArrowUp className="w-24 h-24 text-purple-500 rotate-[15deg]" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Withdrawals</p>
                            <p className="text-3xl font-bold text-white group-hover:text-purple-400 transition-colors">{pendingCounts.withdrawals}</p>
                            <p className="text-xs text-purple-400 mt-2 flex items-center gap-1 font-medium">
                                Click to filter <FaFilter className="w-3 h-3" />
                            </p>
                        </div>
                    </button>

                    <button
                        className={`glass-panel p-6 rounded-2xl text-left transition-all group relative overflow-hidden ${!hasActiveFilters || (filters.status === '' && filters.type === '')
                                ? 'border-blue-500/50 shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]'
                                : 'hover:border-white/20'
                            }`}
                        onClick={() => setFilters({ status: '', type: '' })}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FaClock className="w-24 h-24 text-blue-500" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Pending</p>
                            <p className="text-3xl font-bold text-white group-hover:text-blue-400 transition-colors">{pendingCounts.total}</p>
                            <p className={`text-xs mt-2 font-medium ${pendingRequireAction ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {pendingRequireAction ? 'Requires action' : 'All clear'}
                            </p>
                        </div>
                    </button>
                </div>

                {/* Filters */}
                <div className="glass-panel p-4 rounded-2xl mb-8 border border-white/5">
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1 w-full sm:w-auto">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-500/50 transition-colors text-sm appearance-none"
                            >
                                <option value="">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                        <div className="flex-1 w-full sm:w-auto">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Type</label>
                            <select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-500/50 transition-colors text-sm appearance-none"
                            >
                                <option value="">All Types</option>
                                <option value="deposit">Deposit</option>
                                <option value="withdrawal">Withdrawal</option>
                            </select>
                        </div>
                        <div>
                            <button
                                onClick={() => setFilters({ status: '', type: '' })}
                                className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-bold transition-colors whitespace-nowrap"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Payments Table */}
                {loading ? (
                    <div className="p-12 text-center text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 mx-auto mb-4" />
                        Loading payments...
                    </div>
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-4 lg:hidden">
                            {payments.length === 0 ? (
                                <div className="p-12 text-center text-slate-500 glass-panel rounded-2xl">
                                    <FaWallet className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                    No payments found
                                </div>
                            ) : (
                                payments.map((p) => (
                                    <div key={p._id} className="glass-panel rounded-xl p-5 border border-white/5 relative overflow-hidden">
                                        <div className={`absolute top-0 left-0 w-1 h-full ${p.type === 'deposit' ? 'bg-emerald-500' : 'bg-purple-500'}`}></div>
                                        {/* Top: Player + Status */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                                                    {p.type === 'deposit' ? <FaArrowDown className="text-emerald-400 w-3 h-3" /> : <FaArrowUp className="text-purple-400 w-3 h-3" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-white text-sm truncate">{p.userId?.username || '—'}</p>
                                                    <p className="text-xs text-slate-500 truncate font-mono">#{p._id.slice(-6).toUpperCase()}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusBadge(p.status)}`}>
                                                {p.status}
                                            </span>
                                        </div>

                                        {/* Info grid */}
                                        <div className="bg-black/20 rounded-lg p-3 mb-4 border border-white/5">
                                            <div className="flex justify-between items-end mb-1">
                                                <span className="text-xs text-slate-500 font-medium">Amount</span>
                                                <span className={`text-lg font-bold font-mono ${p.type === 'deposit' ? 'text-emerald-400' : 'text-purple-400'}`}>
                                                    {p.type === 'deposit' ? '+' : '-'} ₹{p.amount?.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-slate-400">
                                                <span>{formatDate(p.createdAt)}</span>
                                                <span className="capitalize">{p.type}</span>
                                            </div>
                                        </div>

                                        {/* Payment info */}
                                        {(p.upiTransactionId || p.bankDetailId) && (
                                            <div className="mb-4 text-xs text-slate-400 bg-white/5 rounded-lg p-3 border border-white/5">
                                                {p.type === 'deposit' && p.upiTransactionId && (
                                                    <div className="flex justify-between">
                                                        <span>UTR:</span>
                                                        <span className="text-white font-mono">{p.upiTransactionId}</span>
                                                    </div>
                                                )}
                                                {p.type === 'withdrawal' && p.bankDetailId && (
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between">
                                                            <span>Bank:</span>
                                                            <span className="text-white">{p.bankDetailId.bankName}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Acc:</span>
                                                            <span className="text-white font-mono">****{p.bankDetailId.accountNumber?.slice(-4)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex flex-wrap gap-2">
                                            {p.screenshotUrl && (
                                                <button
                                                    onClick={() => setImageModal({ show: true, url: getScreenshotUrl(p.screenshotUrl) })}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors"
                                                >
                                                    <FaImage className="w-3 h-3" /> Proof
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setDetailModal({ show: true, payment: p })}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors"
                                            >
                                                <FaEye className="w-3 h-3" /> View
                                            </button>
                                            {canManage && p.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => openActionModal(p, 'approve')}
                                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => openActionModal(p, 'reject')}
                                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-colors"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Desktop table */}
                        <div className="hidden lg:block glass-panel rounded-2xl overflow-hidden border border-white/5">
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                                            <th className="px-6 py-4 font-semibold">Ref ID</th>
                                            <th className="px-6 py-4 font-semibold">Player</th>
                                            <th className="px-6 py-4 font-semibold">Type</th>
                                            <th className="px-6 py-4 font-semibold">Amount</th>
                                            <th className="px-6 py-4 font-semibold">Details</th>
                                            <th className="px-6 py-4 font-semibold">Status</th>
                                            <th className="px-6 py-4 font-semibold">Date</th>
                                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {payments.length === 0 ? (
                                            <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-500">No payments found</td></tr>
                                        ) : (
                                            payments.map((payment) => (
                                                <tr key={payment._id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">#{payment._id.slice(-6).toUpperCase()}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-white">{payment.userId?.username || 'Unknown'}</span>
                                                            <span className="text-xs text-slate-500">{payment.userId?.email || payment.userId?.phone}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${getTypeBadge(payment.type)}`}>
                                                            {payment.type === 'deposit' ? '↓ Deposit' : '↑ Withdraw'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono font-bold text-white">
                                                        <span className={payment.type === 'deposit' ? 'text-emerald-400' : 'text-purple-400'}>
                                                            {payment.type === 'deposit' ? '+' : '-'} ₹{payment.amount?.toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-400 max-w-[200px]">
                                                        {payment.type === 'deposit' ? (
                                                            <div className="space-y-1">
                                                                {payment.upiTransactionId && <p><span className="text-slate-500">UTR:</span> <span className="font-mono text-slate-300">{payment.upiTransactionId}</span></p>}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-1 truncate">
                                                                {payment.bankDetailId ? (
                                                                    <>
                                                                        <p className="text-slate-300 truncate">{payment.bankDetailId.accountHolderName}</p>
                                                                        <p className="font-mono truncate">{payment.bankDetailId.bankName} ••••{payment.bankDetailId.accountNumber?.slice(-4)}</p>
                                                                    </>
                                                                ) : <span className="text-slate-600">No bank details</span>}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusBadge(payment.status)}`}>
                                                            {payment.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400 text-xs">
                                                        {formatDate(payment.createdAt)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => setDetailModal({ show: true, payment })} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="View Details">
                                                                <FaEye className="w-4 h-4" />
                                                            </button>
                                                            {payment.screenshotUrl && (
                                                                <button onClick={() => setImageModal({ show: true, url: getScreenshotUrl(payment.screenshotUrl) })} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="View Screenshot">
                                                                    <FaImage className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {canManage && payment.status === 'pending' && (
                                                                <>
                                                                    <button onClick={() => openActionModal(payment, 'approve')} className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors" title="Approve">
                                                                        <FaCheck className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={() => openActionModal(payment, 'reject')} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors" title="Reject">
                                                                        <FaTimes className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Action Modal */}
            {actionModal.show && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                    <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white/10 relative overflow-hidden shadow-2xl">
                        <div className={`absolute top-0 left-0 w-full h-1 ${actionModal.action === 'approve' ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}></div>

                        <div className="flex items-center gap-4 mb-6">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${actionModal.action === 'approve' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                {actionModal.action === 'approve' ? <FaCheck className="w-6 h-6" /> : <FaTimes className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">
                                    {actionModal.action === 'approve' ? 'Approve' : 'Reject'} {actionModal.payment?.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                                </h3>
                                <p className="text-slate-400 text-xs mt-1">
                                    {actionModal.action === 'approve' ? 'Confirm to proceed with this payment.' : 'This action cannot be undone.'}
                                </p>
                            </div>
                        </div>

                        <div className="bg-black/40 rounded-xl p-4 mb-6 border border-white/5 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Amount</span>
                                <span className="text-xl font-bold font-mono text-white">₹{actionModal.payment?.amount?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Player</span>
                                <span className="text-white font-medium">{actionModal.payment?.userId?.username}</span>
                            </div>
                        </div>

                        {actionModal.payment?.type === 'deposit' && actionModal.payment?.screenshotUrl && (
                            <div className="mb-6">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Proof of Payment</p>
                                <button onClick={() => setImageModal({ show: true, url: getScreenshotUrl(actionModal.payment.screenshotUrl) })} className="w-full h-32 rounded-lg border border-white/10 overflow-hidden relative group">
                                    <img src={getScreenshotUrl(actionModal.payment.screenshotUrl)} alt="Proof" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="px-3 py-1 rounded bg-black/60 text-white text-xs font-bold backdrop-blur-sm">View Full Image</span>
                                    </div>
                                </button>
                            </div>
                        )}

                        <div className="mb-6">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                                Remarks {actionModal.action === 'reject' && <span className="text-red-500">*</span>}
                            </label>
                            <textarea
                                value={adminRemarks}
                                onChange={(e) => setAdminRemarks(e.target.value)}
                                placeholder={actionModal.action === 'approve' ? 'Optional remarks...' : 'Reason for rejection...'}
                                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 resize-none h-24 text-sm"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={closeActionModal}
                                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAction}
                                disabled={processing || (actionModal.action === 'reject' && !adminRemarks.trim())}
                                className={`flex-1 px-4 py-3 rounded-xl font-bold text-black transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${actionModal.action === 'approve'
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 shadow-emerald-500/20'
                                        : 'bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500 shadow-red-500/20'
                                    }`}
                            >
                                {processing ? 'Processing...' : (actionModal.action === 'approve' ? 'Approve Request' : 'Reject Request')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {imageModal.show && (
                <div
                    className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setImageModal({ show: false, url: '' })}
                >
                    <button
                        onClick={() => setImageModal({ show: false, url: '' })}
                        className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        <FaTimes className="w-6 h-6" />
                    </button>
                    <img
                        src={imageModal.url}
                        alt="Payment proof"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Detail Modal */}
            {detailModal.show && detailModal.payment && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                    <div className="glass-panel w-full max-w-lg rounded-2xl border border-white/10 flex flex-col max-h-[90vh] shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white">Payment Details</h3>
                                <p className="text-slate-400 text-xs mt-1">Ref ID: #{detailModal.payment._id.slice(-6).toUpperCase()}</p>
                            </div>
                            <button onClick={() => setDetailModal({ show: false, payment: null })} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                                <FaTimes className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            {/* Amount Card */}
                            <div className="bg-gradient-to-br from-white/5 to-transparent rounded-xl p-6 border border-white/5 text-center relative overflow-hidden">
                                <div className={`absolute top-0 right-0 p-4 opacity-10 ${detailModal.payment.type === 'deposit' ? 'text-emerald-500' : 'text-purple-500'}`}>
                                    {detailModal.payment.type === 'deposit' ? <FaArrowDown className="w-24 h-24 rotate-[-15deg]" /> : <FaArrowUp className="w-24 h-24 rotate-[15deg]" />}
                                </div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Amount</p>
                                <p className="text-4xl font-bold font-mono text-white mb-2">₹{detailModal.payment.amount?.toLocaleString()}</p>
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusBadge(detailModal.payment.status)}`}>
                                    {detailModal.payment.status}
                                </span>
                            </div>

                            {/* Info Groups */}
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">User Information</h4>
                                    <div className="bg-black/30 rounded-xl p-4 border border-white/5 space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 text-sm">Username</span>
                                            <span className="text-white font-medium">{detailModal.payment.userId?.username || 'Unknown'}</span>
                                        </div>
                                        {detailModal.payment.userId?.email && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 text-sm">Email</span>
                                                <span className="text-white text-sm">{detailModal.payment.userId.email}</span>
                                            </div>
                                        )}
                                        {detailModal.payment.userId?.phone && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 text-sm">Phone</span>
                                                <span className="text-white text-sm">{detailModal.payment.userId.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bank Details for Withdrawals */}
                                {detailModal.payment.type === 'withdrawal' && detailModal.payment.bankDetailId && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Bank Details</h4>
                                        <div className="bg-black/30 rounded-xl p-4 border border-white/5 space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 text-sm">Holder</span>
                                                <span className="text-white font-medium text-sm">{detailModal.payment.bankDetailId.accountHolderName}</span>
                                            </div>
                                            {detailModal.payment.bankDetailId.bankName && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 text-sm">Bank</span>
                                                    <span className="text-white text-sm">{detailModal.payment.bankDetailId.bankName}</span>
                                                </div>
                                            )}
                                            {detailModal.payment.bankDetailId.accountNumber && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 text-sm">Account</span>
                                                    <span className="text-white font-mono text-sm">{detailModal.payment.bankDetailId.accountNumber}</span>
                                                </div>
                                            )}
                                            {detailModal.payment.bankDetailId.ifscCode && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 text-sm">IFSC</span>
                                                    <span className="text-white font-mono text-sm">{detailModal.payment.bankDetailId.ifscCode}</span>
                                                </div>
                                            )}
                                            {detailModal.payment.bankDetailId.upiId && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 text-sm">UPI ID</span>
                                                    <span className="text-white font-mono text-sm">{detailModal.payment.bankDetailId.upiId}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Deposit Info */}
                                {detailModal.payment.type === 'deposit' && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Transaction Info</h4>
                                        <div className="bg-black/30 rounded-xl p-4 border border-white/5 space-y-3">
                                            {detailModal.payment.upiTransactionId && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 text-sm">UTR / Ref</span>
                                                    <span className="text-white font-mono text-sm">{detailModal.payment.upiTransactionId}</span>
                                                </div>
                                            )}
                                            {detailModal.payment.userNote && (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-slate-400 text-sm">Note</span>
                                                    <span className="text-white text-sm italic">"{detailModal.payment.userNote}"</span>
                                                </div>
                                            )}
                                        </div>
                                        {detailModal.payment.screenshotUrl && (
                                            <div className="mt-4">
                                                <button onClick={() => setImageModal({ show: true, url: getScreenshotUrl(detailModal.payment.screenshotUrl) })} className="w-full h-40 rounded-xl border border-white/10 overflow-hidden relative group">
                                                    <img src={getScreenshotUrl(detailModal.payment.screenshotUrl)} alt="Proof" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="px-3 py-1 rounded bg-black/60 text-white text-xs font-bold backdrop-blur-sm shadow-lg">View Proof</span>
                                                    </div>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Timeline */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">History</h4>
                                    <div className="bg-black/30 rounded-xl p-4 border border-white/5 space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 text-sm">Created</span>
                                            <span className="text-white text-sm">{formatDate(detailModal.payment.createdAt)}</span>
                                        </div>
                                        {detailModal.payment.processedAt && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 text-sm">Processed</span>
                                                <span className="text-white text-sm">{formatDate(detailModal.payment.processedAt)}</span>
                                            </div>
                                        )}
                                        {detailModal.payment.adminRemarks && (
                                            <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                                                <span className="text-slate-400 text-sm">Admin Remarks</span>
                                                <span className="text-amber-400 text-sm">{detailModal.payment.adminRemarks}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-black/20 flex gap-3 shrink-0">
                            <button
                                onClick={() => setDetailModal({ show: false, payment: null })}
                                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors"
                            >
                                Close
                            </button>
                            {canManage && detailModal.payment.status === 'pending' && (
                                <>
                                    <button
                                        onClick={() => {
                                            setDetailModal({ show: false, payment: null });
                                            openActionModal(detailModal.payment, 'approve');
                                        }}
                                        className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition-colors shadow-lg shadow-emerald-500/20"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDetailModal({ show: false, payment: null });
                                            openActionModal(detailModal.payment, 'reject');
                                        }}
                                        className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-black font-bold transition-colors shadow-lg shadow-red-500/20"
                                    >
                                        Reject
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Payments;
