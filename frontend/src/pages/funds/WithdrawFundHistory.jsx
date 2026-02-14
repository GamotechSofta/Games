import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';

const WithdrawFundHistory = () => {
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    const fetchWithdrawals = async () => {
        if (!user.id) return;
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/payments/my-withdrawals?userId=${user.id}`);
            const data = await res.json();
            if (data.success) {
                setWithdrawals(data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch withdrawals:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-yellow-600/30 text-yellow-400',
            approved: 'bg-green-600/30 text-green-400',
            rejected: 'bg-red-600/30 text-red-400',
            completed: 'bg-blue-600/30 text-blue-400',
        };
        return styles[status] || 'bg-gray-600/30 text-gray-400';
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

    const filteredWithdrawals = filter === 'all' 
        ? withdrawals 
        : withdrawals.filter(w => w.status === filter);

    const stats = {
        total: withdrawals.length,
        pending: withdrawals.filter(w => w.status === 'pending').length,
        approved: withdrawals.filter(w => w.status === 'approved').length,
        rejected: withdrawals.filter(w => w.status === 'rejected').length,
    };

    const totalWithdrawn = withdrawals
        .filter(w => w.status === 'approved')
        .reduce((sum, w) => sum + w.amount, 0);

    return (
        <div className="space-y-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
            {loading ? (
                <>
                    <div className="bg-gradient-to-r from-purple-900/40 to-purple-800/30 rounded-2xl p-5 border border-purple-500/30 skeleton-shimmer">
                        <div className="h-4 w-36 bg-white/10 rounded mb-2" />
                        <div className="h-8 w-40 bg-white/10 rounded" />
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="p-3 rounded-xl bg-[#1a1a1a] border border-white/10 skeleton-shimmer">
                                <div className="h-6 w-8 bg-white/10 rounded mx-auto mb-2" />
                                <div className="h-3 w-12 bg-white/10 rounded mx-auto" />
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-[#1a1a1a] rounded-xl p-3 sm:p-4 border border-white/10 skeleton-shimmer">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="h-8 w-8 rounded-full bg-white/10" />
                                    <div className="h-5 w-16 rounded-full bg-white/10" />
                                </div>
                                <div className="h-5 w-20 bg-white/10 rounded" />
                                <div className="h-3 w-24 bg-white/10 rounded mt-1" />
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <>
            {/* Total Withdrawn */}
            <div className="bg-gradient-to-r from-purple-900/40 to-purple-800/30 rounded-2xl p-5 border border-purple-500/30">
                <p className="text-gray-400 text-sm">Total Withdrawn</p>
                <p className="text-3xl font-bold text-white">₹{totalWithdrawn.toLocaleString()}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
                <div 
                    role="button"
                    tabIndex={0}
                    onClick={() => setFilter('all')}
                    onKeyDown={(e) => e.key === 'Enter' && setFilter('all')}
                    className={`p-3 rounded-xl text-center cursor-pointer transition-colors touch-manipulation ${
                        filter === 'all' ? 'bg-blue-600/30 border border-blue-500' : 'bg-[#1a1a1a] border border-white/10'
                    }`}
                >
                    <p className="text-lg font-bold text-white">{stats.total}</p>
                    <p className="text-xs text-gray-400">Total</p>
                </div>
                <div 
                    role="button"
                    tabIndex={0}
                    onClick={() => setFilter('pending')}
                    onKeyDown={(e) => e.key === 'Enter' && setFilter('pending')}
                    className={`p-3 rounded-xl text-center cursor-pointer transition-colors touch-manipulation ${
                        filter === 'pending' ? 'bg-yellow-600/30 border border-yellow-500' : 'bg-[#1a1a1a] border border-white/10'
                    }`}
                >
                    <p className="text-lg font-bold text-yellow-400">{stats.pending}</p>
                    <p className="text-xs text-gray-400">Pending</p>
                </div>
                <div 
                    role="button"
                    tabIndex={0}
                    onClick={() => setFilter('approved')}
                    onKeyDown={(e) => e.key === 'Enter' && setFilter('approved')}
                    className={`p-3 rounded-xl text-center cursor-pointer transition-colors touch-manipulation ${
                        filter === 'approved' ? 'bg-green-600/30 border border-green-500' : 'bg-[#1a1a1a] border border-white/10'
                    }`}
                >
                    <p className="text-lg font-bold text-green-400">{stats.approved}</p>
                    <p className="text-xs text-gray-400">Approved</p>
                </div>
                <div 
                    role="button"
                    tabIndex={0}
                    onClick={() => setFilter('rejected')}
                    onKeyDown={(e) => e.key === 'Enter' && setFilter('rejected')}
                    className={`p-3 rounded-xl text-center cursor-pointer transition-colors touch-manipulation ${
                        filter === 'rejected' ? 'bg-red-600/30 border border-red-500' : 'bg-[#1a1a1a] border border-white/10'
                    }`}
                >
                    <p className="text-lg font-bold text-red-400">{stats.rejected}</p>
                    <p className="text-xs text-gray-400">Rejected</p>
                </div>
            </div>

            {/* List */}
            {filteredWithdrawals.length === 0 ? (
                <div className="text-center py-8 bg-[#1a1a1a] rounded-xl border border-white/10">
                    <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-400">No withdrawal history found</p>
                    {filter !== 'all' && (
                        <button
                            onClick={() => setFilter('all')}
                            className="mt-2 text-blue-400 text-sm hover:text-blue-300"
                        >
                            View all withdrawals
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {filteredWithdrawals.map((withdrawal) => (
                        <div
                            key={withdrawal._id}
                            className="bg-[#1a1a1a] rounded-xl p-3 sm:p-4 border border-white/10"
                        >
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${
                                        withdrawal.status === 'approved' ? 'bg-green-600/20' : 
                                        withdrawal.status === 'rejected' ? 'bg-red-600/20' : 'bg-yellow-600/20'
                                    }`}>
                                        {withdrawal.status === 'approved' ? (
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : withdrawal.status === 'rejected' ? (
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${getStatusBadge(withdrawal.status)}`}>
                                        {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-white font-semibold text-sm sm:text-base">₹{withdrawal.amount.toLocaleString()}</p>
                                    <p className="text-gray-500 text-[10px] sm:text-xs mt-0.5">{formatDate(withdrawal.createdAt)}</p>
                                </div>
                            </div>

                            {/* Bank Details */}
                            {withdrawal.bankDetailId && (
                                <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                                    <p className="text-gray-400 text-[10px] sm:text-xs break-all">
                                        <span className="text-gray-500">To:</span> {withdrawal.bankDetailId.accountHolderName}
                                    </p>
                                    {withdrawal.bankDetailId.bankName && (
                                        <p className="text-gray-500 text-[10px] sm:text-xs break-all">
                                            {withdrawal.bankDetailId.bankName} - ****{withdrawal.bankDetailId.accountNumber?.slice(-4)}
                                        </p>
                                    )}
                                    {withdrawal.bankDetailId.upiId && (
                                        <p className="text-gray-500 text-[10px] sm:text-xs break-all">
                                            UPI: {withdrawal.bankDetailId.upiId}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Admin Remarks */}
                            {(withdrawal.adminRemarks || withdrawal.processedAt) && (
                                <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                                    {withdrawal.adminRemarks && (
                                        <p className="text-gray-400 text-[10px] sm:text-xs break-all">
                                            <span className="text-gray-500">Admin:</span> {withdrawal.adminRemarks}
                                        </p>
                                    )}
                                    {withdrawal.processedAt && (
                                        <p className="text-gray-500 text-[10px] sm:text-xs">
                                            Processed: {formatDate(withdrawal.processedAt)}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
                </>
            )}
        </div>
    );
};

export default WithdrawFundHistory;
