import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../config/api';

const WithdrawFund = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [config, setConfig] = useState(null);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [pageLoading, setPageLoading] = useState(true);
    const [amount, setAmount] = useState('');
    const [selectedBankId, setSelectedBankId] = useState('');
    const [userNote, setUserNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [submittedAmount, setSubmittedAmount] = useState(0);
    const [showNoBankAccountModal, setShowNoBankAccountModal] = useState(false);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        let cancelled = false;
        setPageLoading(true);
        (async () => {
            await Promise.all([
                fetchConfig(),
                fetchBankAccounts(),
                fetchWalletBalance(),
            ]);
            if (!cancelled) setPageLoading(false);
        })();
        return () => { cancelled = true; };
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/payments/config`);
            const data = await res.json();
            if (data.success) {
                setConfig(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch config:', err);
        }
    };

    const fetchBankAccounts = async () => {
        if (!user.id) return;
        try {
            const res = await fetch(`${API_BASE_URL}/bank-details?userId=${user.id}`);
            const data = await res.json();
            if (data.success) {
                const accounts = data.data || [];
                setBankAccounts(accounts);
                // Show popup if no bank accounts
                if (accounts.length === 0) {
                    setShowNoBankAccountModal(true);
                }
                // Auto-select default account
                const defaultAcc = accounts.find(acc => acc.isDefault);
                if (defaultAcc) {
                    setSelectedBankId(defaultAcc._id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch bank accounts:', err);
        }
    };

    const fetchWalletBalance = async () => {
        if (!user.id) return;
        try {
            const res = await fetch(`${API_BASE_URL}/wallet/balance?userId=${user.id}`);
            const data = await res.json();
            if (data.success) {
                setWalletBalance(data.data?.balance || 0);
            }
        } catch (err) {
            console.error('Failed to fetch balance:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!user.id) {
            setError(t('funds.loginRequiredWithdraw'));
            return;
        }

        const numAmount = parseFloat(amount);
        const minWithdraw = config?.minWithdrawal || 500;
        const maxWithdraw = config?.maxWithdrawal || 25000;

        if (!numAmount || numAmount < minWithdraw || numAmount > maxWithdraw) {
            setError(t('funds.amountRequiredWithdraw', { min: minWithdraw, max: maxWithdraw }));
            return;
        }

        if (numAmount > walletBalance) {
            setError(t('funds.insufficientBalanceWithdraw'));
            return;
        }

        // Auto-select default bank account if none selected
        if (!selectedBankId) {
            const defaultAcc = bankAccounts.find(acc => acc.isDefault);
            if (defaultAcc) {
                setSelectedBankId(defaultAcc._id);
            } else if (bankAccounts.length > 0) {
                setSelectedBankId(bankAccounts[0]._id);
            } else {
                setError(t('funds.addBankAccountFirst'));
                return;
            }
        }

        // Show confirmation modal
        setShowConfirmationModal(true);
    };

    const confirmWithdrawal = async () => {
        setShowConfirmationModal(false);
        setLoading(true);
        setError('');
        setSuccess('');

        const numAmount = parseFloat(amount);
        const finalBankId = selectedBankId || bankAccounts.find(acc => acc.isDefault)?._id || bankAccounts[0]?._id;

        if (!finalBankId) {
            setError(t('funds.selectBankAccountError'));
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/payments/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    amount: numAmount,
                    bankDetailId: finalBankId,
                    userNote,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setSubmittedAmount(numAmount);
                setShowSuccessModal(true);
                setAmount('');
                setUserNote('');
                fetchWalletBalance();
            } else {
                setError(data.message || t('funds.failedToSubmitWithdraw'));
            }
        } catch (err) {
            setError(t('funds.networkErrorWithdraw'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
            {pageLoading ? (
                <div className="space-y-6">
                    <div className="rounded-2xl bg-black/0 px-4 py-4 sm:px-6 sm:py-6">
                        <div className="bg-[#202124] rounded-2xl border border-white/10 overflow-hidden skeleton-shimmer">
                            <div className="h-8 bg-white/10 mx-4 mt-3 w-36 rounded" />
                            <div className="h-16 bg-white/10 mx-4 my-3 rounded-xl w-2/3" />
                            <div className="h-8 bg-white/10 mx-4 mb-3 rounded w-48" />
                        </div>
                    </div>
                    <div className="px-4 sm:px-6 space-y-4">
                        <div className="h-12 w-full rounded-xl bg-[#202124] border border-white/10 skeleton-shimmer" />
                        <div className="h-14 w-full rounded-xl bg-[#202124] border border-white/10 skeleton-shimmer" />
                    </div>
                </div>
            ) : (
            <>
            {/* Wallet Balance Card */}
            <div className="rounded-2xl bg-black/0 px-4 py-4 sm:px-6 sm:py-6">
                <div className="bg-[#202124] rounded-2xl shadow-[0_18px_40px_rgba(0,0,0,0.45)] border border-white/10 overflow-hidden">
                    <div className="px-4 pt-3 pb-2 flex items-center justify-center gap-2 text-sm text-gray-300">
                        <svg className="w-4 h-4 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c3.5 3.5 3.5 16.5 0 20" />
                        </svg>
                        <span className="font-semibold tracking-wide">GoldenBets.com</span>
                    </div>

                    <div className="bg-gradient-to-r from-[#d4af37] via-[#cca84d] to-[#b8941f] px-4 py-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-black/25 border border-black/20 flex items-center justify-center shrink-0">
                            <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-sm font-extrabold text-black">
                                ₹
                            </div>
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-black/70 leading-none">{t('funds.availableBalance')}</div>
                            <div className="text-black font-extrabold text-lg sm:text-xl leading-tight truncate">
                                ₹ {Number(walletBalance || 0).toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>

                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="text-sm text-white/90 truncate">
                            {user?.username || user?.name || 'User'}
                        </div>
                        <div className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">
                            Min: ₹{config?.minWithdrawal || 500} | Max: ₹{config?.maxWithdrawal || 25000}
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="p-4 bg-red-900/50 border border-red-600 rounded-xl text-red-300 text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-4 bg-green-900/50 border border-green-600 rounded-xl text-green-300 text-sm">
                    {success}
                </div>
            )}

            {/* No Bank Account Warning */}
            {bankAccounts.length === 0 && (
                <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-xl text-yellow-300 text-xs sm:text-sm">
                    <p className="font-medium">{t('funds.noBankAccount')}</p>
                    <p className="text-yellow-400/80 mt-1 leading-snug">{t('funds.noBankAccountMessage')}</p>
                </div>
            )}

            {/* Withdraw Form */}
            <div className="px-4 sm:px-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                {/* Amount Input */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-gray-300 text-sm font-medium">{t('funds.amount')} (₹)</label>
                        <button
                            type="button"
                            onClick={() => setAmount(Math.min(walletBalance, config?.maxWithdrawal || 25000).toString())}
                            className="text-red-400 text-sm hover:text-red-300"
                        >
                            {t('funds.withdrawMax')} (₹{Math.min(walletBalance, config?.maxWithdrawal || 25000).toLocaleString()})
                        </button>
                    </div>
                    <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={t('funds.enterWithdrawAmount')}
                        inputMode="numeric"
                        onWheel={(e) => e.target.blur()}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || bankAccounts.length === 0}
                    className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                >
                    {loading ? t('funds.submittingWithdraw') : t('funds.submitWithdrawRequest')}
                </button>
                </form>
            </div>

            {/* Info */}
            <div className="px-4 sm:px-6">
                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/10">
                <h4 className="text-yellow-400 font-semibold mb-2">{t('funds.withdrawalInfo')}:</h4>
                <ul className="text-gray-400 text-sm space-y-1">
                    <li>• {t('funds.withdrawalsProcessed24h')}</li>
                    <li>• {t('funds.ensureBankDetailsCorrect')}</li>
                    <li>• {t('funds.minimumWithdrawal')}: ₹{config?.minWithdrawal || 500}</li>
                    <li>• {t('funds.maximumWithdrawal')}: ₹{config?.maxWithdrawal || 25000}</li>
                </ul>
                </div>
            </div>
            </>
            )}

            {/* No Bank Account Warning Modal */}
            {showNoBankAccountModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1a] rounded-2xl max-w-sm w-full p-6 border border-yellow-500/30 text-center">
                        {/* Warning Icon */}
                        <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2">{t('funds.noBankAccount')}</h3>
                        
                        <p className="text-gray-400 text-sm mb-6">
                            {t('funds.noBankAccountMessage')}
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setShowNoBankAccountModal(false);
                                    navigate('/funds?tab=bank-detail');
                                }}
                                className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-xl transition-colors"
                            >
                                {t('funds.addBankAccountNow')}
                            </button>
                            <button
                                onClick={() => setShowNoBankAccountModal(false)}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmationModal && (() => {
                const selectedBank = bankAccounts.find(acc => acc._id === selectedBankId) || bankAccounts.find(acc => acc.isDefault) || bankAccounts[0];
                return selectedBank ? (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
                        <div className="bg-[#1a1a1a] rounded-2xl max-w-sm w-full max-h-[calc(100vh-8rem)] overflow-y-auto border border-yellow-500/30 p-4 sm:p-6">
                            {/* Warning Icon */}
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>

                            <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 text-center">{t('funds.confirmWithdrawal')}</h3>
                            
                            {/* Amount */}
                            <div className="bg-red-900/30 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
                                <p className="text-gray-400 text-xs sm:text-sm mb-1">{t('funds.withdrawAmount')}</p>
                                <p className="text-xl sm:text-2xl font-bold text-red-400">₹{Number(amount || 0).toLocaleString('en-IN')}</p>
                            </div>

                            {/* Bank Details */}
                            <div className="bg-blue-900/30 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
                                <p className="text-gray-400 text-xs sm:text-sm mb-2">{t('funds.bankAccountDetails')}</p>
                                <div className="space-y-1 text-xs sm:text-sm">
                                    <p className="text-white font-medium">{selectedBank.accountHolderName}</p>
                                    {selectedBank.bankName && (
                                        <p className="text-gray-300">{t('funds.bankName')}: {selectedBank.bankName}</p>
                                    )}
                                    {selectedBank.accountNumber && (
                                        <p className="text-gray-300">{t('funds.accountNumber')}: ****{selectedBank.accountNumber.slice(-4)}</p>
                                    )}
                                    {selectedBank.ifscCode && (
                                        <p className="text-gray-300">{t('funds.ifscCode')}: {selectedBank.ifscCode}</p>
                                    )}
                                    {selectedBank.upiId && (
                                        <p className="text-gray-300">UPI: {selectedBank.upiId}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 sm:space-y-3">
                                <button
                                    onClick={confirmWithdrawal}
                                    className="w-full py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors text-sm sm:text-base"
                                >
                                    {t('funds.confirmWithdrawButton')}
                                </button>
                                <button
                                    onClick={() => setShowConfirmationModal(false)}
                                    className="w-full py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors text-sm sm:text-base"
                                >
                                    {t('common.cancel')}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null;
            })()}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
                    <div className="bg-[#1a1a1a] rounded-2xl max-w-sm w-full max-h-[calc(100vh-8rem)] overflow-y-auto border border-red-500/30 text-center p-4 sm:p-6">
                        {/* Success Icon */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{t('funds.withdrawSuccess')}</h3>
                        
                        <div className="bg-red-900/30 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
                            <p className="text-gray-400 text-xs sm:text-sm">{t('funds.amount')}</p>
                            <p className="text-xl sm:text-2xl font-bold text-red-400">₹{submittedAmount.toLocaleString()}</p>
                        </div>

                        <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-6">
                            {t('funds.withdrawNoteText')}
                        </p>

                        <div className="space-y-2 sm:space-y-3">
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors text-sm sm:text-base"
                            >
                                {t('common.done')}
                            </button>
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    navigate('/funds?tab=withdraw-fund-history');
                                }}
                                className="w-full py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors text-sm sm:text-base"
                            >
                                {t('funds.viewHistory')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WithdrawFund;
