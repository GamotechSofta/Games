import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useWithdrawalHistory from '../../hooks/useWithdrawalHistory';

const WithdrawFundHistory = () => {
    const { t } = useTranslation();
    const { withdrawals, isFetching } = useWithdrawalHistory();
    const [filter, setFilter] = useState('all');

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
        : withdrawals.filter((w) => w.status === filter);

    const stats = {
        total: withdrawals.length,
        pending: withdrawals.filter((w) => w.status === 'pending').length,
        approved: withdrawals.filter((w) => w.status === 'approved').length,
        rejected: withdrawals.filter((w) => w.status === 'rejected').length,
    };

    const totalWithdrawn = withdrawals
        .filter((w) => w.status === 'approved')
        .reduce((sum, w) => sum + w.amount, 0);

    return (
        <div className="space-y-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
            <div className="bg-gradient-to-r from-purple-900/40 to-purple-800/30 rounded-2xl p-5 border border-purple-500/30">
                <p className="text-gray-400 text-sm">{t('funds.totalWithdrawn')}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">₹{totalWithdrawn.toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-4 gap-3">
                {[
                    { key: 'all', label: t('funds.total'), value: stats.total, active: 'bg-blue-600/30 border border-blue-500', valueClass: 'text-gray-900 dark:text-white' },
                    { key: 'pending', label: t('funds.pending'), value: stats.pending, active: 'bg-yellow-600/30 border border-yellow-500', valueClass: 'text-yellow-400' },
                    { key: 'approved', label: t('funds.approved'), value: stats.approved, active: 'bg-green-600/30 border border-green-500', valueClass: 'text-green-400' },
                    { key: 'rejected', label: t('funds.rejected'), value: stats.rejected, active: 'bg-red-600/30 border border-red-500', valueClass: 'text-red-400' },
                ].map(({ key, label, value, active, valueClass }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setFilter(key)}
                        className={`p-3 rounded-xl text-center transition-colors touch-manipulation ${
                            filter === key ? active : 'bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10'
                        }`}
                    >
                        <p className={`text-lg font-bold ${valueClass}`}>{value}</p>
                        <p className="text-xs text-gray-400">{label}</p>
                    </button>
                ))}
            </div>

            {isFetching && withdrawals.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-8">{t('common.loading', { defaultValue: 'Loading...' })}</p>
            ) : filteredWithdrawals.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10">
                    <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-400">{t('funds.noWithdrawalHistoryFound')}</p>
                    {filter !== 'all' && (
                        <button
                            type="button"
                            onClick={() => setFilter('all')}
                            className="mt-2 text-blue-400 text-sm hover:text-blue-300"
                        >
                            {t('funds.viewAllWithdrawals')}
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {filteredWithdrawals.map((withdrawal) => (
                        <div
                            key={withdrawal._id}
                            className="bg-gray-50 dark:bg-[#1a1a1a] rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-white/10"
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
                                        {withdrawal.status === 'pending' ? t('funds.pending') : withdrawal.status === 'approved' ? t('funds.approved') : withdrawal.status === 'rejected' ? t('funds.rejected') : withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-gray-900 dark:text-white font-semibold text-sm sm:text-base">₹{withdrawal.amount.toLocaleString()}</p>
                                    <p className="text-gray-500 text-[10px] sm:text-xs mt-0.5">{formatDate(withdrawal.createdAt)}</p>
                                </div>
                            </div>

                            {withdrawal.bankDetailId && (
                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-white/5 space-y-1">
                                    <p className="text-gray-400 text-[10px] sm:text-xs break-all">
                                        <span className="text-gray-500">{t('funds.toLabel')}</span> {withdrawal.bankDetailId.accountHolderName}
                                    </p>
                                    {withdrawal.bankDetailId.bankName && (
                                        <p className="text-gray-500 text-[10px] sm:text-xs break-all">
                                            {withdrawal.bankDetailId.bankName} - ****{withdrawal.bankDetailId.accountNumber?.slice(-4)}
                                        </p>
                                    )}
                                    {withdrawal.bankDetailId.upiId && (
                                        <p className="text-gray-500 text-[10px] sm:text-xs break-all">
                                            {t('funds.upiLabel')} {withdrawal.bankDetailId.upiId}
                                        </p>
                                    )}
                                </div>
                            )}

                            {(withdrawal.adminRemarks || withdrawal.processedAt) && (
                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-white/5 space-y-1">
                                    {withdrawal.adminRemarks && (
                                        <p className="text-gray-400 text-[10px] sm:text-xs break-all">
                                            <span className="text-gray-500">{t('funds.adminLabel')}</span> {withdrawal.adminRemarks}
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
        </div>
    );
};

export default WithdrawFundHistory;
