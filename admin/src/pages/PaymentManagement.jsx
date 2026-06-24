import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { FaArrowDown, FaArrowUp, FaClock, FaEye, FaCheck, FaTimes, FaImage, FaCreditCard, FaSyncAlt } from 'react-icons/fa';
import { clearAdminAuth, adminFetch, API_BASE_URL } from '../utils/api';
import { useAdminSettings } from '../context/AdminSettingsContext';

const formatCurrency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);

const valueSizeClass = (value) => {
    const len = String(value ?? '').length;
    if (len > 13) return 'text-sm sm:text-base md:text-lg';
    if (len > 10) return 'text-base sm:text-lg md:text-xl';
    return 'text-lg sm:text-xl md:text-2xl';
};

const StatCard = ({ label, value, tone = 'slate', active, onClick, sub }) => {
    const tones = {
        amber: {
            wrap: active ? 'border-amber-500/70 bg-amber-950/40 ring-1 ring-amber-500/30' : 'border-amber-500/40 bg-amber-950/30 hover:border-amber-400/60',
            value: 'text-amber-300',
            label: 'text-amber-100/80',
        },
        emerald: {
            wrap: active ? 'border-emerald-500/70 bg-emerald-950/40 ring-1 ring-emerald-500/30' : 'border-emerald-500/40 bg-emerald-950/30 hover:border-emerald-400/60',
            value: 'text-emerald-300',
            label: 'text-emerald-100/80',
        },
        violet: {
            wrap: active ? 'border-violet-500/70 bg-violet-950/40 ring-1 ring-violet-500/30' : 'border-violet-500/40 bg-violet-950/30 hover:border-violet-400/60',
            value: 'text-violet-300',
            label: 'text-violet-100/80',
        },
        sky: {
            wrap: active ? 'border-sky-500/70 bg-sky-950/40 ring-1 ring-sky-500/30' : 'border-sky-500/40 bg-sky-950/30 hover:border-sky-400/60',
            value: 'text-sky-300',
            label: 'text-sky-100/80',
        },
        slate: {
            wrap: 'border-gray-600/60 bg-gray-800/60',
            value: 'text-white',
            label: 'text-gray-300',
        },
    };
    const t = tones[tone] || tones.slate;
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            className={`rounded-xl border p-3.5 sm:p-4 text-left w-full transition-all ${t.wrap} ${onClick ? 'cursor-pointer' : ''}`}
        >
            <p className={`text-[11px] sm:text-xs font-semibold uppercase tracking-wide ${t.label}`}>{label}</p>
            <p className={`font-bold font-mono tabular-nums mt-1 leading-tight break-words ${valueSizeClass(value)} ${t.value}`}>{value}</p>
            {sub && <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{sub}</p>}
        </Tag>
    );
};

const PaymentManagement = () => {
    const navigate = useNavigate();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pendingCounts, setPendingCounts] = useState({ deposits: 0, withdrawals: 0, total: 0 });
    const [pageTab, setPageTab] = useState('withdrawals'); // withdrawals = default | payu = successful deposits log
    const [filters, setFilters] = useState({
        status: 'pending',
        bookieId: '',
    });
    const [bookies, setBookies] = useState([]); // all bookies for the filter dropdown

    // Modal state
    const [actionModal, setActionModal] = useState({ show: false, payment: null, action: '' });
    const [adminRemarks, setAdminRemarks] = useState('');
    const [processing, setProcessing] = useState(false);
    const { hasSecretDeclarePassword } = useAdminSettings();
    const [secretPassword, setSecretPassword] = useState('');
    const [actionPasswordError, setActionPasswordError] = useState('');

    // Image preview modal
    const [imageModal, setImageModal] = useState({ show: false, url: '' });

    // Detail modal for viewing full payment details
    const [detailModal, setDetailModal] = useState({ show: false, payment: null });

    useEffect(() => {
        fetchPayments();
        fetchPendingCounts();
    }, [pageTab, filters.status]);

    useEffect(() => {
        adminFetch(`${API_BASE_URL}/admin/bookies`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success) setBookies(json.data || []);
            })
            .catch(() => {});
    }, []);

    const fetchPayments = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const queryParams = new URLSearchParams();
            queryParams.append('view', pageTab === 'withdrawals' ? 'withdrawals' : 'payu_log');
            if (pageTab === 'withdrawals' && filters.status) queryParams.append('status', filters.status);
            if (filters.bookieId) queryParams.append('bookieId', filters.bookieId);

            const response = await adminFetch(`${API_BASE_URL}/payments?${queryParams}`);
            const data = await response.json();
            if (data.success) {
                setPayments(data.data);
            }
        } catch (err) {
            console.error('Error fetching payments:', err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([fetchPayments(true), fetchPendingCounts()]);
        } finally {
            setRefreshing(false);
        }
    };

    const fetchPendingCounts = async () => {
        try {
            const response = await adminFetch(`${API_BASE_URL}/payments/pending-count`);
            const data = await response.json();
            if (data.success) {
                setPendingCounts(data.data);
            }
        } catch (err) {
            console.error('Error fetching pending counts:', err);
        }
    };

    const openActionModal = (payment, action) => {
        setActionModal({ show: true, payment, action });
        setAdminRemarks('');
        setSecretPassword('');
        setActionPasswordError('');
    };

    const closeActionModal = () => {
        setActionModal({ show: false, payment: null, action: '' });
        setAdminRemarks('');
        setSecretPassword('');
        setActionPasswordError('');
    };

    const handleAction = async () => {
        if (!actionModal.payment || !actionModal.action) return;
        if (actionModal.action === 'approve' && hasSecretDeclarePassword && !secretPassword.trim()) {
            setActionPasswordError('Please enter the secret declare password');
            return;
        }

        setProcessing(true);
        setActionPasswordError('');
        try {
            const endpoint = actionModal.action === 'approve'
                ? `${API_BASE_URL}/payments/${actionModal.payment._id}/approve`
                : `${API_BASE_URL}/payments/${actionModal.payment._id}/reject`;

            const body = { adminRemarks };
            if (actionModal.action === 'approve' && hasSecretDeclarePassword) {
                body.secretDeclarePassword = secretPassword.trim();
            }

            const response = await adminFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(body),
            });
            const data = await response.json();
            if (data.success) {
                fetchPayments();
                fetchPendingCounts();
                closeActionModal();
            } else {
                if (data.code === 'INVALID_SECRET_DECLARE_PASSWORD') {
                    setActionPasswordError(data.message || 'Invalid secret password');
                } else {
                    alert(data.message || 'Action failed');
                }
            }
        } catch (err) {
            console.error('Error processing action:', err);
            alert('Error processing action');
        } finally {
            setProcessing(false);
        }
    };

    const handleLogout = () => {
        clearAdminAuth();
        navigate('/');
    };

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
            pending: 'bg-yellow-600/30 text-yellow-400 border-yellow-600/50',
            approved: 'bg-green-600/30 text-green-400 border-green-600/50',
            rejected: 'bg-red-600/30 text-red-400 border-red-600/50',
            completed: 'bg-blue-600/30 text-blue-400 border-blue-600/50',
        };
        return styles[status] || 'bg-gray-600/30 text-gray-400 border-gray-600/50';
    };

    const getTypeBadge = (type) => {
        return type === 'deposit' 
            ? 'bg-green-600/20 text-green-400 border-green-600/40'
            : 'bg-purple-600/20 text-purple-400 border-purple-600/40';
    };

    const hasActiveFilters = filters.status || filters.bookieId;
    const pendingRequireAction = pendingCounts.withdrawals > 0;
    const filteredPayments = payments;
    const payuTotalAmount = pageTab === 'payu'
        ? payments.reduce((sum, p) => sum + (p.amount || 0), 0)
        : 0;

    return (
        <AdminLayout onLogout={handleLogout} title="Transactions">
            <div className="space-y-4 sm:space-y-5">
                {/* Header: title + tabs + refresh */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3 shrink-0">
                        <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                            <FaCreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                        </span>
                        Transactions
                    </h1>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => { setPageTab('withdrawals'); setFilters({ status: 'pending', bookieId: '' }); }}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm font-semibold border whitespace-nowrap transition-colors ${
                                pageTab === 'withdrawals'
                                    ? 'bg-violet-600 text-white border-violet-500'
                                    : 'bg-gray-800 text-gray-300 border-gray-600 hover:border-gray-500'
                            }`}
                        >
                            Withdrawals
                            {pendingCounts.withdrawals > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-xs">{pendingCounts.withdrawals}</span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setPageTab('payu'); setFilters({ status: '', bookieId: '' }); }}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm font-semibold border whitespace-nowrap transition-colors ${
                                pageTab === 'payu'
                                    ? 'bg-emerald-600 text-white border-emerald-500'
                                    : 'bg-gray-800 text-gray-300 border-gray-600 hover:border-gray-500'
                            }`}
                        >
                            Deposits
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {pageTab === 'payu' ? (
                        <>
                            <StatCard label="Successful Deposits" value={payments.length} tone="emerald" sub="Listed below" />
                            <StatCard label="Total Amount" value={formatCurrency(payuTotalAmount)} tone="sky" />
                            <StatCard
                                label="Pending Withdrawals"
                                value={pendingCounts.withdrawals}
                                tone="violet"
                                sub="Switch to Withdrawals tab"
                                onClick={() => { setPageTab('withdrawals'); setFilters({ status: 'pending', bookieId: '' }); }}
                            />
                        </>
                    ) : (
                        <>
                            <StatCard
                                label="Pending Withdrawals"
                                value={pendingCounts.withdrawals}
                                tone="amber"
                                active={filters.status === 'pending'}
                                onClick={() => setFilters({ ...filters, status: 'pending' })}
                            />
                            <StatCard
                                label="All Withdrawals"
                                value={payments.length}
                                tone="sky"
                                active={filters.status === ''}
                                onClick={() => setFilters({ ...filters, status: '' })}
                            />
                            <StatCard
                                label="Status"
                                value={pendingRequireAction ? 'Action needed' : 'All clear'}
                                tone={pendingRequireAction ? 'amber' : 'emerald'}
                                sub={pendingRequireAction ? 'Approve or reject pending' : 'No pending requests'}
                            />
                        </>
                    )}
                </div>

                {/* Filters — one row */}
                {pageTab === 'withdrawals' && (
                    <div className="rounded-xl border border-gray-700/80 bg-gray-800/50 p-3 sm:p-4">
                        <div className="flex flex-nowrap items-center gap-2 sm:gap-3 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap font-semibold uppercase tracking-wider">Status</span>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs sm:text-sm shrink-0 focus:ring-2 focus:ring-amber-500/40"
                            >
                                <option value="">All</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="completed">Completed</option>
                            </select>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={() => setFilters({ status: 'pending', bookieId: '' })}
                                    className="px-3 py-1.5 sm:py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-white text-xs sm:text-sm font-medium shrink-0 whitespace-nowrap"
                                >
                                    Clear
                                </button>
                            )}
                            {!loading && pendingRequireAction && filteredPayments.some((p) => p.status === 'pending') && (
                                <span className="text-xs text-amber-400 flex items-center gap-1.5 shrink-0 whitespace-nowrap ml-auto">
                                    <FaClock className="w-3.5 h-3.5" />
                                    Needs approval
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Summary bar */}
                {!loading && (
                    <p className="text-xs sm:text-sm text-gray-400">
                        Showing <span className="font-semibold text-white">{filteredPayments.length}</span> payment{filteredPayments.length !== 1 ? 's' : ''}
                        {hasActiveFilters && <span className="text-amber-400 ml-1">(filtered)</span>}
                    </p>
                )}

                {/* Table */}
                {loading ? (
                    <div className="text-center py-16 rounded-xl border border-gray-700 bg-gray-800/40">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-500 border-t-transparent mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">Loading payments...</p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-gray-700 overflow-hidden bg-gray-800/60">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[900px]">
                                <thead>
                                    <tr className="border-b border-gray-700 text-left text-gray-400 uppercase text-xs">
                                        <th className="px-4 py-3">Ref</th>
                                        <th className="px-4 py-3">Player</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                        <th className="px-4 py-3">Payment Info</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                {filteredPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                                            <FaCreditCard className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                                            <p className="font-medium text-gray-400 mb-1">No payments found</p>
                                            <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                                {hasActiveFilters
                                                    ? 'Try clearing filters.'
                                                    : pageTab === 'payu'
                                                        ? 'Successful deposits appear here after payment.'
                                                        : 'Withdrawal requests appear when players request withdrawal.'}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPayments.map((payment) => (
                                        <tr key={payment._id} className="border-b border-gray-700/60 hover:bg-gray-700/30">
                                            <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                                                #{payment._id.slice(-6).toUpperCase()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-white font-medium">{payment.userId?.username || 'Unknown'}</div>
                                                <div className="text-xs text-gray-500 truncate max-w-[160px]">
                                                    {payment.userId?.phone || payment.userId?.email || ''}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getTypeBadge(payment.type)}`}>
                                                    {payment.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <span className={`font-mono font-semibold ${payment.type === 'deposit' ? 'text-emerald-400' : 'text-violet-400'}`}>
                                                    {payment.type === 'deposit' ? '+' : '−'}{formatCurrency(payment.amount)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 max-w-[200px]">
                                                {payment.type === 'deposit' ? (
                                                    <div className="space-y-1.5">
                                                        {payment.upiTransactionId && (
                                                            <p className="text-xs text-gray-400 truncate">
                                                                UTR: <span className="text-white font-mono">{payment.upiTransactionId}</span>
                                                            </p>
                                                        )}
                                                        {payment.screenshotUrl && (
                                                            <button
                                                                onClick={() => setImageModal({ 
                                                                    show: true, 
                                                                    url: payment.screenshotUrl.startsWith('http') ? payment.screenshotUrl : `${API_BASE_URL.replace('/api/v1', '')}${payment.screenshotUrl}` 
                                                                })}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600/20 border border-blue-500/40 rounded text-xs text-blue-400 hover:bg-blue-600/30 transition-colors"
                                                                title="View screenshot"
                                                            >
                                                                <FaImage className="w-3.5 h-3.5" /> Screenshot
                                                            </button>
                                                        )}
                                                        {payment.userNote && (
                                                            <p className="text-xs text-gray-500 truncate" title={payment.userNote}>Note: {payment.userNote}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-0.5">
                                                        {payment.bankDetailId ? (
                                                            <>
                                                                <p className="text-xs text-white font-medium truncate">
                                                                    {payment.bankDetailId.accountHolderName}
                                                                </p>
                                                                {payment.bankDetailId.bankName && (
                                                                    <p className="text-xs text-gray-500 truncate">
                                                                        {payment.bankDetailId.bankName}
                                                                        {payment.bankDetailId.accountNumber && (
                                                                            <> - ****{payment.bankDetailId.accountNumber.slice(-4)}</>
                                                                        )}
                                                                    </p>
                                                                )}
                                                                {payment.bankDetailId.upiId && (
                                                                    <p className="text-xs text-gray-500 truncate">
                                                                        UPI: {payment.bankDetailId.upiId}
                                                                    </p>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <p className="text-xs text-gray-500">No bank details</p>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${getStatusBadge(payment.status)}`}>
                                                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                                </span>
                                                {payment.adminRemarks && payment.status !== 'pending' && (
                                                    <p className="text-xs text-gray-500 mt-1 truncate max-w-[140px]" title={payment.adminRemarks}>
                                                        {payment.adminRemarks}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                <p>{formatDate(payment.createdAt)}</p>
                                                {payment.processedAt && payment.status !== 'pending' && (
                                                    <p className="text-gray-500 text-[10px] mt-0.5">
                                                        Done: {formatDate(payment.processedAt)}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="inline-flex flex-wrap justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setDetailModal({ show: true, payment })}
                                                        className="inline-flex items-center gap-1 px-2 py-1.5 bg-sky-600/20 border border-sky-500/40 hover:bg-sky-600/30 rounded-lg text-xs font-medium text-sky-400"
                                                        title="View details"
                                                    >
                                                        <FaEye className="w-3 h-3" /> View
                                                    </button>
                                                    {pageTab === 'withdrawals' && payment.status === 'pending' ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => openActionModal(payment, 'approve')}
                                                                className="inline-flex items-center gap-1 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-medium text-white"
                                                            >
                                                                <FaCheck className="w-3 h-3" /> Approve
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openActionModal(payment, 'reject')}
                                                                className="inline-flex items-center gap-1 px-2 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-xs font-medium text-white"
                                                            >
                                                                <FaTimes className="w-3 h-3" /> Reject
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-gray-500">—</span>
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
            )}
            </div>

            {/* Action Modal */}
            {actionModal.show && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 border border-gray-700 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            {actionModal.action === 'approve' ? (
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                                    <FaCheck className="w-5 h-5 text-emerald-400" />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                                    <FaTimes className="w-5 h-5 text-rose-400" />
                                </div>
                            )}
                            <div>
                                <h3 className="text-xl font-bold text-white">
                                    {actionModal.action === 'approve' ? 'Approve' : 'Reject'} {actionModal.payment?.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                                </h3>
                                <p className="text-sm text-gray-400 mt-0.5">
                                    {actionModal.action === 'approve' ? 'Credit will be added to player wallet' : 'Request will be declined'}
                                </p>
                            </div>
                        </div>
                        
                        <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4 mb-4">
                            <div className="flex justify-between items-center mb-2 gap-3">
                                <span className="text-gray-400 text-sm">Amount</span>
                                <span className="text-lg font-bold font-mono text-white">{formatCurrency(actionModal.payment?.amount)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-400">Player</span>
                                <span className="text-white">
                                    {actionModal.payment?.userId?.username || 'Unknown'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Type</span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                    actionModal.payment?.type === 'deposit' 
                                        ? 'bg-green-600/30 text-green-400' 
                                        : 'bg-purple-600/30 text-purple-400'
                                }`}>
                                    {actionModal.payment?.type}
                                </span>
                            </div>
                        </div>

                        {/* Show screenshot for deposits */}
                        {actionModal.payment?.type === 'deposit' && actionModal.payment?.screenshotUrl && (
                            <div className="mb-4">
                                <p className="text-gray-400 text-sm mb-2">Payment Screenshot:</p>
                                <img
                                    src={actionModal.payment.screenshotUrl.startsWith('http') ? actionModal.payment.screenshotUrl : `${API_BASE_URL.replace('/api/v1', '')}${actionModal.payment.screenshotUrl}`}
                                    alt="Payment proof"
                                    className="w-full max-h-48 object-contain rounded-lg border border-gray-700 cursor-pointer"
                                    onClick={() => setImageModal({ 
                                        show: true, 
                                        url: actionModal.payment.screenshotUrl.startsWith('http') ? actionModal.payment.screenshotUrl : `${API_BASE_URL.replace('/api/v1', '')}${actionModal.payment.screenshotUrl}` 
                                    })}
                                />
                            </div>
                        )}

                        {/* Show bank details for withdrawals */}
                        {actionModal.payment?.type === 'withdrawal' && actionModal.payment?.bankDetailId && (
                            <div className="mb-4 bg-gray-900 rounded-lg p-3">
                                <p className="text-gray-400 text-sm mb-2">Withdraw to:</p>
                                <p className="text-white font-medium">{actionModal.payment.bankDetailId.accountHolderName}</p>
                                {actionModal.payment.bankDetailId.bankName && (
                                    <p className="text-gray-400 text-sm">
                                        {actionModal.payment.bankDetailId.bankName} - {actionModal.payment.bankDetailId.accountNumber}
                                    </p>
                                )}
                                {actionModal.payment.bankDetailId.ifscCode && (
                                    <p className="text-gray-400 text-sm">IFSC: {actionModal.payment.bankDetailId.ifscCode}</p>
                                )}
                                {actionModal.payment.bankDetailId.upiId && (
                                    <p className="text-gray-400 text-sm">UPI: {actionModal.payment.bankDetailId.upiId}</p>
                                )}
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-gray-400 text-sm mb-2">
                                Admin Remarks {actionModal.action === 'reject' && <span className="text-red-400">*</span>}
                            </label>
                            <textarea
                                value={adminRemarks}
                                onChange={(e) => setAdminRemarks(e.target.value)}
                                placeholder={actionModal.action === 'approve' ? 'Optional remarks...' : 'Reason for rejection...'}
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white resize-none focus:outline-none focus:border-blue-500"
                                rows={3}
                            />
                        </div>

                        {actionModal.action === 'approve' && hasSecretDeclarePassword && (
                            <div className="mb-4">
                                <label className="block text-gray-400 text-sm mb-2">Secret declare password *</label>
                                <input
                                    type="password"
                                    placeholder="Secret declare password"
                                    value={secretPassword}
                                    onChange={(e) => { setSecretPassword(e.target.value); setActionPasswordError(''); }}
                                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                />
                                {actionPasswordError && (
                                    <p className="text-red-400 text-sm mt-2">{actionPasswordError}</p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={closeActionModal}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAction}
                                disabled={
                                    processing ||
                                    (actionModal.action === 'reject' && !adminRemarks.trim()) ||
                                    (actionModal.action === 'approve' && hasSecretDeclarePassword && !secretPassword.trim())
                                }
                                className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors disabled:opacity-50 ${
                                    actionModal.action === 'approve'
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                {processing ? 'Processing...' : (actionModal.action === 'approve' ? 'Approve' : 'Reject')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {imageModal.show && (
                <div 
                    className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
                    onClick={() => setImageModal({ show: false, url: '' })}
                >
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <button
                            onClick={() => setImageModal({ show: false, url: '' })}
                            className="absolute -top-10 right-0 text-white hover:text-gray-300"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <img
                            src={imageModal.url}
                            alt="Payment proof"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg"
                        />
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {detailModal.show && detailModal.payment && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-gray-700 max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${detailModal.payment.type === 'deposit' ? 'bg-green-600/20' : 'bg-purple-600/20'}`}>
                                    {detailModal.payment.type === 'deposit' ? (
                                        <FaArrowDown className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <FaArrowUp className="w-5 h-5 text-purple-400" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        {detailModal.payment.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Details
                                    </h3>
                                    <p className="text-sm text-gray-400">
                                        Full payment information
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDetailModal({ show: false, payment: null })}
                                className="text-gray-400 hover:text-white"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Amount & Status */}
                        <div className="bg-gray-900 rounded-lg p-4 mb-4">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-gray-400">Amount</span>
                                <span className="text-2xl font-bold font-mono text-white">{formatCurrency(detailModal.payment.amount)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-gray-400">Status</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(detailModal.payment.status)}`}>
                                    {detailModal.payment.status.charAt(0).toUpperCase() + detailModal.payment.status.slice(1)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-gray-400">Type</span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                    detailModal.payment.type === 'deposit' 
                                        ? 'bg-green-600/30 text-green-400' 
                                        : 'bg-purple-600/30 text-purple-400'
                                }`}>
                                    {detailModal.payment.type === 'deposit' ? '↓ Deposit' : '↑ Withdrawal'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Request ID</span>
                                <span className="text-white font-mono text-sm">
                                    #{detailModal.payment._id.slice(-8).toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {/* Player Info */}
                        <div className="bg-gray-900 rounded-lg p-4 mb-4">
                            <h4 className="text-sm font-semibold text-gray-300 mb-3">Player Information</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Username</span>
                                    <span className="text-white">{detailModal.payment.userId?.username || 'Unknown'}</span>
                                </div>
                                {detailModal.payment.userId?.email && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Email</span>
                                        <span className="text-white">{detailModal.payment.userId.email}</span>
                                    </div>
                                )}
                                {detailModal.payment.userId?.phone && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Phone</span>
                                        <span className="text-white">{detailModal.payment.userId.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bank Details for Withdrawals */}
                        {detailModal.payment.type === 'withdrawal' && detailModal.payment.bankDetailId && (
                            <div className="bg-gray-900 rounded-lg p-4 mb-4">
                                <h4 className="text-sm font-semibold text-gray-300 mb-3">Bank Account Details</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Account Holder</span>
                                        <span className="text-white font-medium">{detailModal.payment.bankDetailId.accountHolderName}</span>
                                    </div>
                                    {detailModal.payment.bankDetailId.bankName && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Bank Name</span>
                                            <span className="text-white">{detailModal.payment.bankDetailId.bankName}</span>
                                        </div>
                                    )}
                                    {detailModal.payment.bankDetailId.accountNumber && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Account Number</span>
                                            <span className="text-white font-mono">{detailModal.payment.bankDetailId.accountNumber}</span>
                                        </div>
                                    )}
                                    {detailModal.payment.bankDetailId.ifscCode && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">IFSC Code</span>
                                            <span className="text-white font-mono">{detailModal.payment.bankDetailId.ifscCode}</span>
                                        </div>
                                    )}
                                    {detailModal.payment.bankDetailId.upiId && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">UPI ID</span>
                                            <span className="text-white font-mono">{detailModal.payment.bankDetailId.upiId}</span>
                                        </div>
                                    )}
                                    {detailModal.payment.bankDetailId.accountType && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Account Type</span>
                                            <span className="text-white capitalize">{detailModal.payment.bankDetailId.accountType.replace('_', ' ')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Deposit Details */}
                        {detailModal.payment.type === 'deposit' && (
                            <div className="bg-gray-900 rounded-lg p-4 mb-4">
                                <h4 className="text-sm font-semibold text-gray-300 mb-3">Payment Details</h4>
                                <div className="space-y-2">
                                    {detailModal.payment.upiTransactionId && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">UTR / Transaction ID</span>
                                            <span className="text-white font-mono">{detailModal.payment.upiTransactionId}</span>
                                        </div>
                                    )}
                                    {detailModal.payment.userNote && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">User Note</span>
                                            <span className="text-white">{detailModal.payment.userNote}</span>
                                        </div>
                                    )}
                                </div>
                                {detailModal.payment.screenshotUrl && (
                                    <div className="mt-4">
                                        <p className="text-gray-500 text-sm mb-2">Payment Screenshot:</p>
                                        <img
                                            src={detailModal.payment.screenshotUrl.startsWith('http') ? detailModal.payment.screenshotUrl : `${API_BASE_URL.replace('/api/v1', '')}${detailModal.payment.screenshotUrl}`}
                                            alt="Payment proof"
                                            className="w-full max-h-60 object-contain rounded-lg border border-gray-700 cursor-pointer"
                                            onClick={() => setImageModal({ 
                                                show: true, 
                                                url: detailModal.payment.screenshotUrl.startsWith('http') ? detailModal.payment.screenshotUrl : `${API_BASE_URL.replace('/api/v1', '')}${detailModal.payment.screenshotUrl}` 
                                            })}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Timestamps */}
                        <div className="bg-gray-900 rounded-lg p-4 mb-4">
                            <h4 className="text-sm font-semibold text-gray-300 mb-3">Timeline</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Requested</span>
                                    <span className="text-white">{formatDate(detailModal.payment.createdAt)}</span>
                                </div>
                                {detailModal.payment.processedAt && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Processed</span>
                                        <span className="text-white">{formatDate(detailModal.payment.processedAt)}</span>
                                    </div>
                                )}
                                {detailModal.payment.processedBy?.username && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Processed By</span>
                                        <span className="text-white">{detailModal.payment.processedBy.username} <span className="text-xs text-gray-500">({detailModal.payment.processedByType || 'admin'})</span></span>
                                    </div>
                                )}
                                {detailModal.payment.adminRemarks && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Admin Remarks</span>
                                        <span className="text-white">{detailModal.payment.adminRemarks}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDetailModal({ show: false, payment: null })}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                            >
                                Close
                            </button>
                            {detailModal.payment.status === 'pending' ? (
                                <>
                                    <button
                                        onClick={() => {
                                            setDetailModal({ show: false, payment: null });
                                            openActionModal(detailModal.payment, 'approve');
                                        }}
                                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDetailModal({ show: false, payment: null });
                                            openActionModal(detailModal.payment, 'reject');
                                        }}
                                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
                                    >
                                        Reject
                                    </button>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default PaymentManagement;
