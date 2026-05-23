import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../config/api';

const AddFund = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [config, setConfig] = useState(null);
    const paySubmitInProgress = useRef(false);
    const payuVerifyDone = useRef(new Set());
    const [configLoading, setConfigLoading] = useState(true);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showFailedModal, setShowFailedModal] = useState(false);
    const [creditedAmount, setCreditedAmount] = useState(0);

    useEffect(() => {
        fetchConfig();
    }, []);

    // Handle return from PayU: verify payment and show result
    useEffect(() => {
        const payuSuccess = searchParams.get('payu_success');
        const payuFailed = searchParams.get('payu_failed');
        const paymentId = searchParams.get('paymentId') || searchParams.get('paymentid');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!paymentId || !user?.id) return;

        if (payuSuccess === '1') {
            const verifyKey = `${paymentId}:${user.id}`;
            if (payuVerifyDone.current.has(verifyKey)) return;
            payuVerifyDone.current.add(verifyKey);
            (async () => {
                try {
                    // Pass all URL params to verify (PayU Hosted sends status, hash, txnid, amount, etc.)
                    const verifyParams = new URLSearchParams({ paymentId, userId: user.id });
                    searchParams.forEach((value, key) => {
                        if (key !== 'tab' && key !== 'payu_success') verifyParams.set(key, value);
                    });
                    const res = await fetch(`${API_BASE_URL}/payments/payu/verify?${verifyParams.toString()}`);
                    const data = await res.json();
                    if (data.success && data.data?.amount) {
                        setCreditedAmount(data.data.amount);
                        setShowSuccessModal(true);
                        if (data.data.balance != null) {
                            const u = JSON.parse(localStorage.getItem('user') || '{}');
                            if (u.id) {
                                u.balance = u.walletBalance = data.data.balance;
                                localStorage.setItem('user', JSON.stringify(u));
                            }
                        }
                    } else {
                        setError(data.message || (t('funds.payuVerifyFailed') || 'Deposit could not be verified. If you paid, it may reflect shortly.'));
                    }
                    setSearchParams({ tab: 'add-fund' }, { replace: true });
                } catch (err) {
                    setError(t('funds.networkError') || 'Network error. Please check your payment history.');
                    setSearchParams({ tab: 'add-fund' }, { replace: true });
                }
            })();
        } else if (payuFailed === '1') {
            setError(t('funds.payuPaymentFailed') || 'Payment was cancelled or failed. You can try again.');
            setShowFailedModal(true);
            setSearchParams((p) => {
                const next = new URLSearchParams(p);
                next.delete('payu_failed');
                next.delete('paymentId');
                next.delete('paymentid');
                return next;
            }, { replace: true });
        }
    }, [searchParams]);

    const fetchConfig = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = user?.id || '';
            const res = await fetch(`${API_BASE_URL}/payments/config${userId ? `?userId=${userId}` : ''}`);
            const data = await res.json();
            if (data.success) {
                setConfig(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch config:', err);
        } finally {
            setConfigLoading(false);
        }
    };

    const handlePayWithPayU = async (e) => {
        e.preventDefault();
        if (paySubmitInProgress.current) return;
        paySubmitInProgress.current = true;
        setError('');
        setSuccess('');
        setLoading(true);

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.id) {
            setError(t('funds.loginRequired'));
            paySubmitInProgress.current = false;
            setLoading(false);
            return;
        }

        const numAmount = parseFloat(amount);
        const minDeposit = config?.minDeposit || 100;
        const maxDeposit = config?.maxDeposit || 50000;
        if (!numAmount || numAmount < minDeposit || numAmount > maxDeposit) {
            setError(t('funds.amountRequired', { min: minDeposit, max: maxDeposit }));
            paySubmitInProgress.current = false;
            setLoading(false);
            return;
        }

        let formSubmitted = false;
        try {
            const res = await fetch(`${API_BASE_URL}/payments/payu/create-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: numAmount, userId: user.id }),
            });
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                const msg = res.status === 429
                    ? (t('funds.tooManyRequests') || 'Too many attempts. Please wait a minute and try again.')
                    : res.status === 500
                        ? (t('funds.payuLinkFailed') || 'Deposit service error. Please try again later.')
                        : (t('funds.networkError') || 'Network error. Please try again.');
                setError(msg);
                paySubmitInProgress.current = false;
                setLoading(false);
                return;
            }
            if (res.status === 429) {
                setError(t('funds.tooManyRequests') || 'Too many attempts. Please wait a minute and try again.');
                paySubmitInProgress.current = false;
                setLoading(false);
                return;
            }
            if (data.success && data.data?.formActionUrl && data.data?.formData) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = data.data.formActionUrl;
                Object.entries(data.data.formData).forEach(([k, v]) => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = k;
                    input.value = String(v ?? '');
                    form.appendChild(input);
                });
                document.body.appendChild(form);
                formSubmitted = true;
                form.submit();
                return;
            }
            setError(data.message || (t('funds.payuLinkFailed') || 'Failed to start deposit. Please try again.'));
        } catch (err) {
            setError(err.message || t('funds.networkError') || 'Network error. Please try again.');
        } finally {
            if (!formSubmitted) {
                paySubmitInProgress.current = false;
                setLoading(false);
            }
        }
    };

    const quickAmountsStep1 = [200, 500, 1000, 2000];
    const minDeposit = config?.minDeposit || 100;
    const maxDeposit = config?.maxDeposit || 50000;

    return (
        <div className="px-3 sm:px-4 space-y-3 sm:space-y-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] max-w-[520px] md:max-w-none mx-auto md:mx-0">
            {error && (
                <div className="p-3 sm:p-4 bg-red-900/50 border border-red-600 rounded-xl text-red-300 text-sm leading-snug">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-3 sm:p-4 bg-green-900/50 border border-green-600 rounded-xl text-green-300 text-sm leading-snug">
                    {success}
                </div>
            )}

            {configLoading ? (
                <div className="rounded-2xl bg-black/0 py-4 sm:py-6 space-y-4 sm:space-y-6">
                    <div className="bg-white dark:bg-[#202124] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden skeleton-shimmer">
                        <div className="h-7 sm:h-8 bg-white/10 mx-3 sm:mx-4 mt-3 w-28 sm:w-32 rounded" />
                        <div className="h-12 sm:h-14 bg-white/10 mx-3 sm:mx-4 my-3 rounded-xl w-3/4" />
                        <div className="h-7 sm:h-8 bg-white/10 mx-3 sm:mx-4 mb-3 rounded w-20 sm:w-24" />
                    </div>
                    <div className="flex justify-center gap-2">
                        <div className="h-11 w-11 rounded-full bg-white dark:bg-[#202124] border border-gray-200 dark:border-white/10 skeleton-shimmer shrink-0" />
                        <div className="h-11 flex-1 max-w-[280px] sm:max-w-[320px] rounded-full bg-white dark:bg-[#202124] border border-gray-200 dark:border-white/10 skeleton-shimmer" />
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl bg-black/0 py-3 sm:py-6 md:grid md:grid-cols-[1fr_1fr] md:gap-8 lg:gap-10 md:items-start md:max-w-none">
                    {/* Wallet balance card - compact on mobile */}
                    <div className="md:max-w-[340px] w-full">
                        <div className="bg-white dark:bg-[#202124] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] sm:shadow-[0_18px_40px_rgba(0,0,0,0.45)] border border-gray-200 dark:border-white/10 overflow-hidden">
                            <div className="px-3 sm:px-4 pt-2.5 sm:pt-3 pb-1.5 sm:pb-2 flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-300">
                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#d4af37] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c3.5 3.5 3.5 16.5 0 20" />
                                </svg>
                                <span className="font-semibold tracking-wide truncate">GoldenBets.com</span>
                            </div>
                            <div className="bg-gradient-to-r from-[#d4af37] via-[#cca84d] to-[#b8941f] px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/25 border border-black/20 flex items-center justify-center shrink-0">
                                    <span className="text-xs sm:text-sm font-extrabold text-black">₹</span>
                                </div>
                                <div className="text-black font-extrabold text-base sm:text-lg min-w-0 truncate">
                                    ₹{' '}
                                    {(() => {
                                        try {
                                            const u = JSON.parse(localStorage.getItem('user') || 'null');
                                            const b = Number(u?.balance ?? u?.walletBalance ?? u?.wallet ?? 0) || 0;
                                            return b.toLocaleString('en-IN');
                                        } catch {
                                            return '0';
                                        }
                                    })()}
                                </div>
                            </div>
                            <div className="px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between min-h-[40px]">
                                <div className="text-xs sm:text-sm text-gray-700 dark:text-white/90 truncate mr-2">
                                    {(() => {
                                        try {
                                            const u = JSON.parse(localStorage.getItem('user') || 'null');
                                            return u?.username || u?.name || 'User';
                                        } catch {
                                            return 'User';
                                        }
                                    })()}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 inline-block" />
                                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#d4af37] inline-block" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Amount input & actions */}
                    <div className="mt-4 sm:mt-6 md:mt-0 flex flex-col w-full">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-[#202124] border border-gray-200 dark:border-white/10 flex items-center justify-center shadow-sm shrink-0 flex-shrink-0">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 18h18M4 10l8-4 8 4" />
                                </svg>
                            </div>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder={t('funds.enterAmount')}
                                className="flex-1 min-w-0 h-11 sm:h-12 rounded-xl sm:rounded-full bg-white dark:bg-[#202124] border border-gray-200 dark:border-white/10 px-4 text-base sm:text-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37]/40"
                                min={minDeposit}
                                max={maxDeposit}
                                inputMode="numeric"
                            />
                        </div>

                        <p className="mt-2 text-[11px] sm:text-xs text-gray-500 px-0.5">
                            Min ₹{minDeposit} – Max ₹{maxDeposit.toLocaleString()}
                        </p>

                        <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full">
                            {quickAmountsStep1.map((amt) => (
                                <button
                                    key={amt}
                                    type="button"
                                    onClick={() => setAmount(String(amt))}
                                    className={`min-h-[44px] sm:min-h-[40px] rounded-xl border text-sm sm:text-base font-semibold shadow-sm transition-colors active:scale-[0.98] ${
                                        amount === String(amt)
                                            ? 'bg-[#d4af37] text-black border-[#d4af37]/60'
                                            : 'bg-white dark:bg-[#202124] text-gray-900 dark:text-white border-gray-200 dark:border-white/10 hover:border-[#d4af37]/30 active:bg-[#2a2b2e]'
                                    }`}
                                >
                                    ₹{amt}
                                </button>
                            ))}
                        </div>

                        <div className="mt-4 sm:mt-5 w-full">
                            <button
                                type="button"
                                onClick={handlePayWithPayU}
                                disabled={loading}
                                className={`w-full min-h-[48px] sm:min-h-[44px] rounded-xl bg-gradient-to-r from-[#d4af37] via-[#cca84d] to-[#b8941f] text-black font-extrabold text-base sm:text-sm shadow-[0_8px_20px_rgba(212,175,55,0.35)] active:scale-[0.99] transition-transform ${
                                    loading ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                            >
                                {loading ? (t('common.loading') || 'Loading...') : (t('funds.payWithPayU') || 'Pay')}
                            </button>
                        </div>

                        <div className="mt-3 sm:mt-4 w-full bg-[#202124] rounded-xl border border-white/10 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-[13px] text-gray-400 leading-relaxed">
                            {t('funds.payuNote') || 'You will be redirected to complete the payment securely. Amount will be added to your wallet after successful payment.'}
                        </div>
                    </div>
                </div>
            )}

            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
                    <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl max-w-sm w-full p-5 sm:p-6 border border-green-500/30 text-center shadow-xl">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">{t('funds.paymentSuccess') || 'Payment successful'}</h3>
                        <div className="bg-green-900/30 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
                            <p className="text-gray-400 text-xs sm:text-sm">{t('funds.creditedAmount') || 'Amount credited'}</p>
                            <p className="text-xl sm:text-2xl font-bold text-green-400 mt-0.5">₹{creditedAmount.toLocaleString()}</p>
                        </div>
                        <p className="text-gray-400 text-xs sm:text-sm mb-5 sm:mb-6 leading-relaxed">
                            {t('funds.depositNote') || 'Your wallet has been updated. You can place bets now.'}
                        </p>
                        <div className="space-y-2.5 sm:space-y-3">
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full min-h-[44px] py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold rounded-xl transition-colors"
                            >
                                {t('common.done') || 'Done'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    navigate('/funds?tab=add-fund-history');
                                }}
                                className="w-full min-h-[44px] py-3 bg-white/10 hover:bg-white/20 active:bg-white/25 text-gray-800 dark:text-white font-medium rounded-xl transition-colors"
                            >
                                {t('funds.viewHistory') || 'View history'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showFailedModal && (
                <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
                    <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl max-w-sm w-full p-5 sm:p-6 border border-red-500/30 text-center shadow-xl">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">{t('funds.paymentFailed') || 'Payment failed'}</h3>
                        <p className="text-gray-400 text-xs sm:text-sm mb-5 sm:mb-6 leading-relaxed">
                            {t('funds.payuPaymentFailed') || 'Payment was cancelled or failed. You can try again.'}
                        </p>
                        <div className="space-y-2.5 sm:space-y-3">
                            <button
                                onClick={() => {
                                    setShowFailedModal(false);
                                    setError('');
                                }}
                                className="w-full min-h-[44px] py-3 bg-[#d4af37] hover:bg-[#c9a227] active:bg-[#be971f] text-black font-semibold rounded-xl transition-colors"
                            >
                                {t('funds.tryAgain') || 'Try again'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowFailedModal(false);
                                    setError('');
                                }}
                                className="w-full min-h-[44px] py-3 bg-white/10 hover:bg-white/20 active:bg-white/25 text-gray-800 dark:text-white font-medium rounded-xl transition-colors"
                            >
                                {t('common.done') || 'Done'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddFund;
