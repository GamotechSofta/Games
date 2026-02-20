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
    const [upiTransactionId, setUpiTransactionId] = useState('');
    const [screenshot, setScreenshot] = useState(null);
    const [screenshotPreview, setScreenshotPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [submittedAmount, setSubmittedAmount] = useState(0);
    const [showCopyNotification, setShowCopyNotification] = useState(false);
    const stepFromUrl = searchParams.get('step');
    const step = stepFromUrl === '2' ? 2 : 1; // 1 = Amount, 2 = Payment Details (synced with URL for device back)
    const [addCashLoading, setAddCashLoading] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
        if (file.size > 5 * 1024 * 1024) {
            setError(t('funds.fileSizeError'));
            return;
        }
            setScreenshot(file);
            setScreenshotPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.id) {
            setError(t('funds.loginRequired'));
            return;
        }

        const numAmount = parseFloat(amount);
        if (!numAmount || numAmount < (config?.minDeposit || 100) || numAmount > (config?.maxDeposit || 50000)) {
            setError(t('funds.amountRequired', { min: config?.minDeposit || 100, max: config?.maxDeposit || 50000 }));
            return;
        }

        const utr = String(upiTransactionId || '').trim();
        if (!utr) {
            setError(t('funds.utrRequired'));
            return;
        }
        if (!/^\d{12}$/.test(utr)) {
            setError(t('funds.utrInvalid'));
            return;
        }

        if (!screenshot) {
            setError(t('funds.screenshotRequired'));
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('userId', user.id);
            formData.append('amount', numAmount);
            formData.append('upiTransactionId', utr);
            formData.append('screenshot', screenshot);

            const res = await fetch(`${API_BASE_URL}/payments/deposit`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                setSubmittedAmount(numAmount);
                setShowSuccessModal(true);
                setAmount('');
                setUpiTransactionId('');
                setScreenshot(null);
                setScreenshotPreview(null);
                setSearchParams((p) => {
                    const next = new URLSearchParams(p);
                    next.delete('step');
                    return next;
                }, { replace: true });
            } else {
                setError(data.message || t('funds.failedToSubmit'));
            }
        } catch (err) {
            setError(t('funds.networkError'));
        } finally {
            setLoading(false);
        }
    };

    const quickAmounts = [100, 500, 1000, 2000, 5000, 10000];
    const quickAmountsStep1 = [200, 500, 1000, 2000];
    const minDeposit = config?.minDeposit || 100;
    const maxDeposit = config?.maxDeposit || 50000;
    const qrAmount = (() => {
        const n = Number(amount);
        return Number.isFinite(n) && n > 0 ? n : null;
    })();

    const validateAmount = () => {
        const numAmount = Number(amount);
        if (!numAmount || numAmount < minDeposit || numAmount > maxDeposit) {
            setError(t('funds.amountRequired', { min: minDeposit, max: maxDeposit }));
            return false;
        }
        return true;
    };

    const handleAddCash = () => {
        setError('');
        if (!validateAmount()) return;
        setAddCashLoading(true);
        window.setTimeout(() => {
            setAddCashLoading(false);
            setSearchParams((p) => {
                const next = new URLSearchParams(p);
                next.set('tab', 'add-fund');
                next.set('step', '2');
                return next;
            }, { replace: false });
        }, 3000);
    };

    const handleBackToAmount = () => {
        setSearchParams((p) => {
            const next = new URLSearchParams(p);
            next.delete('step');
            return next;
        }, { replace: true });
    };

    return (
        <div className={`space-y-4 sm:space-y-6 ${step === 2 ? 'pb-32 sm:pb-28' : ''}`}>
            {/* Step 2 only: in-content back to amount (header back still goes to Funds list) */}
            {step === 2 && (
                <div className="flex items-center gap-2 -mt-1 sm:mt-0">
                    <button
                        type="button"
                        onClick={handleBackToAmount}
                        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm font-medium transition-colors py-1 -mx-1 min-h-[44px] min-w-[44px] touch-manipulation"
                        aria-label="Back to amount"
                    >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>{t('funds.backToAmount')}</span>
                    </button>
                </div>
            )}

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

            {step === 1 ? (
                <div className="space-y-4 sm:space-y-5">
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
                            <div className="grid grid-cols-2 gap-2 max-w-[520px] mx-auto">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-9 rounded-md bg-[#202124] border border-white/10 skeleton-shimmer" />
                                ))}
                            </div>
                            <div className="max-w-[520px] mx-auto h-10 rounded-md bg-[#202124] border border-white/10 skeleton-shimmer" />
                        </div>
                    ) : (
                    <div className="rounded-2xl bg-black/0 px-4 py-4 sm:px-6 sm:py-6">
                        {/* Top card (as screenshot) */}
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
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 flex items-center justify-center text-[13px] sm:text-sm font-extrabold text-black">
                                        ₹
                                    </div>
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

                        {/* Amount input */}
                        <div className="mt-6 sm:mt-8 flex items-center justify-center gap-2">
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
                                className="flex-1 min-w-0 max-w-[520px] bg-[#202124] border border-white/10 rounded-full px-4 py-2.5 sm:py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20"
                                min={minDeposit}
                                max={maxDeposit}
                            />
                        </div>

                        {/* Quick buttons */}
                        <div className="mt-2.5 sm:mt-3 grid grid-cols-2 gap-2 max-w-[520px] mx-auto">
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

                        {/* Add Cash */}
                        <div className="mt-2.5 sm:mt-3 max-w-[520px] mx-auto">
                            <button
                                type="button"
                                onClick={handleAddCash}
                                disabled={addCashLoading}
                                className={`w-full h-9 sm:h-10 rounded-md bg-gradient-to-r from-[#d4af37] via-[#cca84d] to-[#b8941f] text-black font-extrabold shadow-[0_10px_22px_rgba(212,175,55,0.35)] ${
                                    addCashLoading ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                            >
                                {addCashLoading ? t('common.loading') : t('funds.addCash')}
                            </button>
                        </div>

                        {/* Note */}
                        <div className="mt-2.5 sm:mt-3 max-w-[520px] mx-auto bg-[#202124] rounded-md border border-white/10 px-3 py-2 text-[10px] sm:text-[11px] text-gray-300">
                            {t('funds.depositNoteText')}
                        </div>
                    </div>
                    )}
                </div>
            ) : configLoading ? (
                <div className="space-y-6">
                    <div className="flex items-center justify-between gap-3 bg-[#1a1a1a] rounded-2xl p-4 border border-white/10 skeleton-shimmer">
                        <div className="space-y-2">
                            <div className="h-4 w-24 bg-white/10 rounded" />
                            <div className="h-6 w-28 bg-white/10 rounded" />
                        </div>
                    </div>
                    <div className="rounded-2xl bg-[#202124] border border-white/10 p-4 space-y-4 skeleton-shimmer">
                        <div className="h-4 w-32 bg-white/10 rounded" />
                        <div className="h-12 bg-white/10 rounded" />
                        <div className="h-12 bg-white/10 rounded" />
                        <div className="h-12 bg-white/10 rounded-xl" />
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Amount summary + edit */}
                    <div className="flex items-center justify-between gap-3 bg-[#1a1a1a] rounded-2xl p-4 border border-white/10">
                        <div className="min-w-0">
                            <div className="text-gray-400 text-sm">{t('funds.selectedAmount')}</div>
                            <div className="text-white font-extrabold text-lg truncate">₹{Number(amount || 0).toLocaleString('en-IN')}</div>
                            <div className="text-gray-500 text-xs mt-0.5">
                                {t('common.min')}: ₹{minDeposit.toLocaleString('en-IN')} | {t('common.max')}: ₹{maxDeposit.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleBackToAmount}
                            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/10"
                            aria-label={t('funds.backToAmount')}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            {t('funds.changeAmount')}
                        </button>
                    </div>

                    {/* Payment Details */}
                    <div className="bg-[#202124] rounded-2xl p-5 border border-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
                        <h3 className="text-lg font-bold text-[#d4af37] mb-4">{t('funds.paymentDetails')}</h3>

                        {/* QR Code Section */}
                        <div className="flex flex-col items-center mb-5">
                            <div className="bg-white p-3 rounded-xl mb-3">
                                {config?.upiId ? (
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                                            `upi://pay?pa=${config.upiId}&pn=${encodeURIComponent(config.upiName || 'Golden Games')}${qrAmount != null ? `&am=${qrAmount}` : ''}&cu=INR`
                                        )}`}
                                        alt="UPI QR Code"
                                        className="w-[180px] h-[180px]"
                                    />
                                ) : (
                                    <div className="w-[180px] h-[180px] flex items-center justify-center bg-gray-200 rounded">
                                        <span className="text-gray-500 text-sm">{t('common.loading')}</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-gray-400 text-sm text-center">
                                {t('funds.scanQRCode')}
                            </p>
                        </div>

                        {/* OR Divider */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-px bg-white/10"></div>
                            <span className="text-gray-500 text-sm">{t('funds.or')}</span>
                            <div className="flex-1 h-px bg-white/10"></div>
                        </div>

                        <div className="space-y-3">
                            {(config?.upiIds?.length > 0 ? config.upiIds : (config?.upiId ? [config.upiId] : [])).map((upiId, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-black/30 rounded-xl p-4 border border-white/10">
                                    <div>
                                        <p className="text-gray-400 text-sm">{t('funds.upiId')}{config?.upiIds?.length > 1 ? ` ${idx + 1}` : ''}</p>
                                        <p className="text-white font-mono text-lg">{upiId || t('common.loading')}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!upiId) {
                                                setError(t('funds.upiId') + ' ' + t('common.error'));
                                                return;
                                            }
                                            try {
                                                await navigator.clipboard.writeText(upiId);
                                                setShowCopyNotification(true);
                                                setTimeout(() => setShowCopyNotification(false), 3000);
                                            } catch (err) {
                                                const textArea = document.createElement('textarea');
                                                textArea.value = upiId;
                                                textArea.style.position = 'fixed';
                                                textArea.style.opacity = '0';
                                                document.body.appendChild(textArea);
                                                textArea.select();
                                                try {
                                                    document.execCommand('copy');
                                                    setShowCopyNotification(true);
                                                    setTimeout(() => setShowCopyNotification(false), 3000);
                                                } catch (fallbackErr) {
                                                    setError(t('common.error'));
                                                }
                                                document.body.removeChild(textArea);
                                            }
                                        }}
                                        className="px-4 py-2 bg-gradient-to-r from-[#d4af37] via-[#cca84d] to-[#b8941f] hover:brightness-105 text-black rounded-lg text-sm font-extrabold border border-black/20 shadow-[0_10px_18px_rgba(212,175,55,0.25)]"
                                    >
                                        {t('common.copy')}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Add Fund Form (Step 2) */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* UTR / Transaction ID */}
                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                {t('funds.utrTransactionId')} <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={upiTransactionId}
                                onChange={(e) => setUpiTransactionId(e.target.value)}
                                placeholder={t('funds.utrPlaceholder')}
                                inputMode="numeric"
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20"
                                required
                            />
                        </div>

                        {/* Screenshot Upload */}
                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                {t('funds.paymentScreenshot')} <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="screenshot-upload"
                                />
                                <label
                                    htmlFor="screenshot-upload"
                                    className="flex flex-col items-center justify-center w-full h-40 bg-[#1a1a1a] border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-[#d4af37]/40 transition-colors"
                                >
                                    {screenshotPreview ? (
                                        <img
                                            src={screenshotPreview}
                                            alt="Screenshot preview"
                                            className="h-full w-full object-contain rounded-xl"
                                        />
                                    ) : (
                                        <>
                                            <svg className="w-10 h-10 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-gray-400 text-sm">{t('funds.clickToUpload')}</p>
                                            <p className="text-gray-500 text-xs mt-1">{t('funds.fileFormats')}</p>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-[#d4af37] via-[#cca84d] to-[#b8941f] hover:brightness-105 text-black font-extrabold rounded-xl transition-all disabled:opacity-50 shadow-[0_14px_26px_rgba(212,175,55,0.22)]"
                        >
                            {loading ? t('funds.submitting') : t('funds.submitDepositRequest')}
                        </button>
                    </form>

                    {/* Instructions */}
                    <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/10 mb-6">
                        <h4 className="text-yellow-400 font-semibold mb-2">{t('funds.howToAddFunds')}</h4>
                        <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
                            <li>{t('funds.step1')}</li>
                            <li>{t('funds.step2')}</li>
                            <li>{t('funds.step3')}</li>
                            <li>{t('funds.step4')}</li>
                            <li>{t('funds.step5')}</li>
                        </ol>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1a] rounded-2xl max-w-sm w-full p-6 border border-green-500/30 text-center">
                        {/* Success Icon */}
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2">{t('funds.requestSubmitted')}</h3>
                        
                        <div className="bg-green-900/30 rounded-xl p-4 mb-4">
                            <p className="text-gray-400 text-sm">{t('funds.selectedAmount')}</p>
                            <p className="text-2xl font-bold text-green-400">₹{submittedAmount.toLocaleString()}</p>
                        </div>

                        <p className="text-gray-400 text-sm mb-6">
                            {t('funds.depositNote')}
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
                            >
                                {t('common.done')}
                            </button>
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    navigate('/funds?tab=add-fund-history');
                                }}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                            >
                                {t('funds.viewHistory')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Copy Notification Toast */}
            {showCopyNotification && (
                <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-in-out">
                    <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 border-2 border-green-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-semibold text-sm">{t('funds.upiIdCopied')}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddFund;
