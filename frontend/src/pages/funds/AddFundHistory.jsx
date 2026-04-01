import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../config/api';

const AddFundHistory = () => {
    const { t } = useTranslation();
    const [deposits, setDeposits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchDeposits();
    }, []);

    const fetchDeposits = async () => {
        if (!user.id) return;
        try {
            setLoading(true);
            const [depositRes, walletTxRes] = await Promise.all([
                fetch(`${API_BASE_URL}/payments/my-deposits?userId=${user.id}`),
                fetch(`${API_BASE_URL}/wallet/my-transactions?userId=${user.id}&limit=500`),
            ]);
            const depositData = await depositRes.json();
            const walletTxData = await walletTxRes.json();
            const paymentDeposits = depositData.success ? (depositData.data || []) : [];
            const walletCredits = walletTxData.success
                ? (walletTxData.data || [])
                    .filter((tx) => {
                        const desc = String(tx.description || '').toLowerCase();
                        if (tx.type !== 'credit') return false;
                        if (desc.includes('win')) return false;
                        if (desc.includes('bet cancelled')) return false;
                        return (
                            desc.includes('admin') ||
                            desc.includes('bookie') ||
                            desc.includes('payu') ||
                            desc.includes('deposit')
                        );
                    })
                    .map((tx) => ({
                        _id: `wallet-credit-${tx._id || tx.createdAt}`,
                        amount: Number(tx.amount) || 0,
                        status: 'approved',
                        createdAt: tx.createdAt,
                        processedAt: tx.createdAt,
                        adminRemarks: tx.description || 'Wallet credit',
                        method: 'wallet',
                        isWalletHistory: true,
                    }))
                : [];

            const merged = [...paymentDeposits, ...walletCredits].sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );
            if (depositData.success || walletTxData.success) {
                setDeposits(merged);
            }
        } catch (err) {
            console.error('Failed to fetch deposits:', err);
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

    const filteredDeposits = filter === 'all' 
        ? deposits 
        : deposits.filter(d => d.status === filter);

    const stats = {
        total: deposits.length,
        pending: deposits.filter(d => d.status === 'pending').length,
        approved: deposits.filter(d => d.status === 'approved').length,
        rejected: deposits.filter(d => d.status === 'rejected').length,
    };

    const totalDeposits = deposits
        .filter(d => d.status === 'approved')
        .reduce((sum, d) => sum + d.amount, 0);

    return (
        <div className="space-y-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
            {loading ? (
                <>
                    <div className="bg-gradient-to-r from-green-900/40 to-green-800/30 rounded-2xl p-5 border border-green-500/30 skeleton-shimmer">
                        <div className="h-4 w-32 bg-white/10 rounded mb-2" />
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
            {/* Total Deposits */}
            <div className="bg-gradient-to-r from-green-900/40 to-green-800/30 rounded-2xl p-5 border border-green-500/30">
                <p className="text-gray-400 text-sm">{t('funds.totalAddedFunds')}</p>
                <p className="text-3xl font-bold text-white">₹{totalDeposits.toLocaleString()}</p>
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
                    <p className="text-xs text-gray-400">{t('funds.total')}</p>
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
                    <p className="text-xs text-gray-400">{t('funds.pending')}</p>
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
                    <p className="text-xs text-gray-400">{t('funds.approved')}</p>
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
                    <p className="text-xs text-gray-400">{t('funds.rejected')}</p>
                </div>
            </div>

            {/* List */}
            {filteredDeposits.length === 0 ? (
                <div className="text-center py-8 bg-[#1a1a1a] rounded-xl border border-white/10">
                    <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-400">{t('funds.noDepositHistoryFound')}</p>
                    {filter !== 'all' && (
                        <button
                            onClick={() => setFilter('all')}
                            className="mt-2 text-blue-400 text-sm hover:text-blue-300"
                        >
                            {t('funds.viewAllDeposits')}
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {filteredDeposits.map((deposit) => (
                        <div
                            key={deposit._id}
                            className="bg-[#1a1a1a] rounded-xl p-3 sm:p-4 border border-white/10"
                        >
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${
                                        deposit.status === 'approved' ? 'bg-green-600/20' : 
                                        deposit.status === 'rejected' ? 'bg-red-600/20' : 'bg-yellow-600/20'
                                    }`}>
                                        {deposit.status === 'approved' ? (
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : deposit.status === 'rejected' ? (
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${getStatusBadge(deposit.status)}`}>
                                        {deposit.status === 'pending' ? t('funds.pending') : deposit.status === 'approved' ? t('funds.approved') : deposit.status === 'rejected' ? t('funds.rejected') : deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-white font-semibold text-sm sm:text-base">₹{deposit.amount.toLocaleString()}</p>
                                    <p className="text-gray-500 text-[10px] sm:text-xs mt-0.5">{formatDate(deposit.createdAt)}</p>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                                {deposit.upiTransactionId && (
                                    <p className="text-gray-400 text-[10px] sm:text-xs break-all">
                                        <span className="text-gray-500">{t('funds.utrLabel')}</span> {deposit.upiTransactionId}
                                    </p>
                                )}
                                {deposit.adminRemarks && (
                                    <p className="text-gray-400 text-[10px] sm:text-xs break-all">
                                        <span className="text-gray-500">{t('funds.adminLabel')}</span> {deposit.adminRemarks}
                                    </p>
                                )}
                                {deposit.processedAt && (
                                    <p className="text-gray-500 text-[10px] sm:text-xs">
                                        {t('funds.processed')}: {formatDate(deposit.processedAt)}
                                    </p>
                                )}
                            </div>

                            {/* Screenshot Preview */}
                            {deposit.screenshotUrl && (
                                <div className="mt-2">
                                    <a
                                        href={deposit.screenshotUrl.startsWith('http') ? deposit.screenshotUrl : `${API_BASE_URL.replace('/api/v1', '')}${deposit.screenshotUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-blue-400 text-[10px] sm:text-xs hover:text-blue-300"
                                    >
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {t('funds.viewScreenshot')}
                                    </a>
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

export default AddFundHistory;
