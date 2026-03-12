import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../config/api';

const AddFund = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [config, setConfig] = useState(null);
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
                        setError(data.message || (t('funds.payuVerifyFailed') || 'Payment could not be verified. If you paid, it may reflect shortly.'));
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
        setError('');
        setSuccess('');

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.id) {
            setError(t('funds.loginRequired'));
            return;
        }

        const numAmount = parseFloat(amount);
        const minDeposit = config?.minDeposit || 100;
        const maxDeposit = config?.maxDeposit || 50000;
        if (!numAmount || numAmount < minDeposit || numAmount > maxDeposit) {
            setError(t('funds.amountRequired', { min: minDeposit, max: maxDeposit }));
            return;
        }

        setLoading(true);
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
                setError(res.status === 500 ? (t('funds.payuLinkFailed') || 'Payment service error. Please try again later.') : (t('funds.networkError') || 'Network error. Please try again.'));
                return;
            }
            if (data.success && data.data?.formActionUrl && data.data?.formData) {
                // PayU Hosted Checkout: submit form to PayU
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
                form.submit();
                return;
            }
            setError(data.message || (t('funds.payuLinkFailed') || 'Failed to create payment link. Please try again.'));
        } catch (err) {
            setError(err.message || t('funds.networkError') || 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const quickAmountsStep1 = [200, 500, 1000, 2000];
    const minDeposit = config?.minDeposit || 100;
    const maxDeposit = config?.maxDeposit || 50000;

    return (
        <div className="space-y-4 sm:space-y-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
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

            {configLoading ? (
                <div className="rounded-2xl bg-black/0 px-4 py-4 sm:px-6 sm:py-6 space-y-6">
                    <div className="bg-[#202124] rounded-2xl border border-white/10 overflow-hidden skeleton-shimmer">
                        <div className="h-8 bg-white/10 mx-4 mt-3 w-32 rounded" />
                        <div className="h-14 bg-white/10 mx-4 my-3 rounded-xl w-3/4" />
                        <div className="h-8 bg-white/10 mx-4 mb-3 rounded w-24" />
                    </div>
                    <div className="flex justify-center gap-2">
                        <div className="h-11 w-11 rounded-full bg-[#202124] border border-white/10 skeleton-shimmer" />
                        <div className="h-11 flex-1 max-w-[320px] rounded-full bg-[#202124] border border-white/10 skeleton-shimmer" />
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl bg-black/0 px-4 py-4 sm:px-6 sm:py-6 md:grid md:grid-cols-[1fr_1fr] md:gap-8 lg:gap-10 md:items-start">
                    <div className="md:max-w-[340px]">
                        <div className="bg-[#202124] rounded-2xl shadow-[0_18px_40px_rgba(0,0,0,0.45)] border border-white/10 overflow-hidden">
                            <div className="px-3 sm:px-4 pt-2.5 sm:pt-3 pb-2 flex items-center justify-center gap-2 text-[13px] sm:text-sm text-gray-300">
                                <svg className="w-4 h-4 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c3.5 3.5 3.5 16.5 0 20" />
                                </svg>
                                <span className="font-semibold tracking-wide">GoldenBets.com</span>
                            </div>
                            <div className="bg-gradient-to-r from-[#d4af37] via-[#cca84d] to-[#b8941f] px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/25 border border-black/20 flex items-center justify-center shrink-0">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 flex items-center justify-center text-[13px] sm:text-sm font-extrabold text-black">₹</div>
                                </div>
                                <div className="text-black font-extrabold">
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
                            <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
                                <div className="text-[13px] sm:text-sm text-white/90">
                                    {(() => {
                                        try {
                                            const u = JSON.parse(localStorage.getItem('user') || 'null');
                                            return u?.username || u?.name || 'User';
                                        } catch {
                                            return 'User';
                                        }
                                    })()}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                                    <span className="w-3 h-3 rounded-full bg-[#d4af37] inline-block" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 sm:mt-8 md:mt-0 flex flex-col">
                        <div className="flex items-center justify-center md:justify-start gap-2">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#202124] border border-white/10 flex items-center justify-center shadow-sm shrink-0">
                                <svg className="w-5 h-5 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 18h18M4 10l8-4 8 4" />
                                </svg>
                            </div>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder={t('funds.enterAmount')}
                                className="flex-1 min-w-0 max-w-[520px] md:max-w-none bg-[#202124] border border-white/10 rounded-full px-4 py-2.5 sm:py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20"
                                min={minDeposit}
                                max={maxDeposit}
                            />
                        </div>

                        <div className="mt-2.5 sm:mt-3 grid grid-cols-2 gap-2 max-w-[520px] md:max-w-none mx-auto md:mx-0">
                            {quickAmountsStep1.map((amt) => (
                                <button
                                    key={amt}
                                    type="button"
                                    onClick={() => setAmount(String(amt))}
                                    className={`h-8 sm:h-9 rounded-md border text-[13px] sm:text-sm font-semibold shadow-sm transition-colors ${
                                        amount === String(amt)
                                            ? 'bg-[#d4af37] text-black border-[#d4af37]/60'
                                            : 'bg-[#202124] text-white border-white/10 hover:border-[#d4af37]/30'
                                    }`}
                                >
                                    {amt}
                                </button>
                            ))}
                        </div>

                        <div className="mt-2.5 sm:mt-3 max-w-[520px] md:max-w-none mx-auto md:mx-0">
                            <button
                                type="button"
                                onClick={handlePayWithPayU}
                                disabled={loading}
                                className={`w-full h-9 sm:h-10 rounded-md bg-gradient-to-r from-[#d4af37] via-[#cca84d] to-[#b8941f] text-black font-extrabold shadow-[0_10px_22px_rgba(212,175,55,0.35)] ${
                                    loading ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                            >
                                {loading ? (t('common.loading') || 'Loading...') : (t('funds.payWithPayU') || 'Pay with PayU')}
                            </button>
                        </div>

                        <div className="mt-2.5 sm:mt-3 max-w-[520px] md:max-w-none mx-auto md:mx-0 bg-[#202124] rounded-md border border-white/10 px-3 py-2 text-[10px] sm:text-[11px] text-gray-300">
                            {t('funds.payuNote') || 'You will be redirected to PayU to complete the payment securely. Amount will be added to your wallet after successful payment.'}
                        </div>
                    </div>
                </div>
            )}

            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1a] rounded-2xl max-w-sm w-full p-6 border border-green-500/30 text-center">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{t('funds.paymentSuccess') || 'Payment successful'}</h3>
                        <div className="bg-green-900/30 rounded-xl p-4 mb-4">
                            <p className="text-gray-400 text-sm">{t('funds.creditedAmount') || 'Amount credited'}</p>
                            <p className="text-2xl font-bold text-green-400">₹{creditedAmount.toLocaleString()}</p>
                        </div>
                        <p className="text-gray-400 text-sm mb-6">
                            {t('funds.depositNote') || 'Your wallet has been updated. You can place bets now.'}
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
                            >
                                {t('common.done') || 'Done'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    navigate('/funds?tab=add-fund-history');
                                }}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                            >
                                {t('funds.viewHistory') || 'View history'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showFailedModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1a] rounded-2xl max-w-sm w-full p-6 border border-red-500/30 text-center">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{t('funds.paymentFailed') || 'Payment failed'}</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            {t('funds.payuPaymentFailed') || 'Payment was cancelled or failed. You can try again.'}
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setShowFailedModal(false);
                                    setError('');
                                }}
                                className="w-full py-3 bg-[#d4af37] hover:bg-[#c9a227] text-black font-semibold rounded-xl transition-colors"
                            >
                                {t('funds.tryAgain') || 'Try again'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowFailedModal(false);
                                    setError('');
                                }}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
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
