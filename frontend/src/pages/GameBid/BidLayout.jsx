import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBettingWindow } from './BettingWindowContext';

const getWalletFromStorage = () => {
    try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        const val =
            u?.wallet ||
            u?.balance ||
            u?.points ||
            u?.walletAmount ||
            u?.wallet_amount ||
            u?.amount ||
            0;
        const n = Number(val);
        return Number.isFinite(n) ? n : 0;
    } catch (e) {
        return 0;
    }
};

const BidLayout = ({
    market,
    title,
    children,
    bidsCount,
    totalPoints,
    showDateSession = true,
    extraHeader,
    session = 'OPEN',
    setSession = () => {},
    sessionRightSlot = null,
    slotBetweenDateSession = null,
    showSessionOnMobile = false,
    // Optional: override allowed session options for this page (e.g. ['OPEN'])
    sessionOptionsOverride = null,
    // Optional: lock session dropdown (prevents selecting OPEN/CLOSE)
    lockSessionSelect = false,
    // Optional: hide the session dropdown caret icon
    hideSessionSelectCaret = false,
    dateSessionControlClassName = '',
    dateSessionGridClassName = '',
    /** When set (e.g. scheduled for tomorrow), show this date in the date row instead of today */
    displayDate = null,
    footerRightOnDesktop = false,
    hideFooter = false,
    walletBalance,
    onSubmit = () => {},
    showFooterStats = true,
    submitLabel = 'Submit Bets',
    contentPaddingClass,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const contentRef = useRef(null);
    const { allowed: bettingAllowed, closeOnly: bettingCloseOnly, message: bettingMessage } = useBettingWindow();
    const todayDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const [wallet, setWallet] = useState(() =>
        Number.isFinite(Number(walletBalance)) ? Number(walletBalance) : getWalletFromStorage()
    );

    const marketStatus = market?.status;
    const isRunning = marketStatus === 'running';
    const isToday = true;

    const sessionOptions =
        Array.isArray(sessionOptionsOverride) && sessionOptionsOverride.length
            ? sessionOptionsOverride
            : (isToday && (isRunning || bettingCloseOnly) ? ['CLOSE'] : ['OPEN', 'CLOSE']);

    useEffect(() => {
        if (Array.isArray(sessionOptionsOverride) && sessionOptionsOverride.length) {
            const desired = sessionOptionsOverride[0];
            if (desired && session !== desired) setSession(desired);
            return;
        }
        if (isToday && (isRunning || bettingCloseOnly) && session !== 'CLOSE') {
            setSession('CLOSE');
        }
    }, [isToday, isRunning, bettingCloseOnly, session, setSession, sessionOptionsOverride, sessionOptions]);

    useEffect(() => {
        const syncFromStorage = () => {
            const propWallet = Number(walletBalance);
            if (Number.isFinite(propWallet)) {
                setWallet(propWallet);
                return;
            }
            setWallet(getWalletFromStorage());
        };
        const onBalanceUpdated = (e) => {
            const next = Number(e?.detail?.balance);
            if (Number.isFinite(next)) setWallet(next);
            else syncFromStorage();
        };
        syncFromStorage();
        window.addEventListener('balanceUpdated', onBalanceUpdated);
        window.addEventListener('userLogin', syncFromStorage);
        window.addEventListener('storage', syncFromStorage);
        return () => {
            window.removeEventListener('balanceUpdated', onBalanceUpdated);
            window.removeEventListener('userLogin', syncFromStorage);
            window.removeEventListener('storage', syncFromStorage);
        };
    }, [walletBalance]);

    // Scroll to top when route changes
    useEffect(() => {
        const timer = setTimeout(() => {
            // Scroll window
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            if (document.documentElement) document.documentElement.scrollTop = 0;
            if (document.body) document.body.scrollTop = 0;
            
            // Scroll content container
            if (contentRef.current) {
                contentRef.current.scrollTop = 0;
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [location.pathname]);

    return (
        <div className="game-bid-page min-h-screen min-h-ios-screen bg-black font-sans w-full max-w-full overflow-x-hidden">
            {/* Header - Home theme dark - iOS safe area padding */}
            <div
                className="bg-[#202124] border-b border-white/10 py-2 flex items-center justify-between gap-2 sticky top-0 z-10"
                style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}
            >
                <button
                    onClick={() => {
                      if (!market) {
                        navigate(-1);
                        return;
                      }
                      const state = {
                        market,
                        ...(location.state?.marketType && { marketType: location.state.marketType }),
                        ...(location.state?.kingBazaarMarketKey != null && {
                          kingBazaarMarketKey: location.state.kingBazaarMarketKey,
                          kingBazaarMarketLabel: location.state.kingBazaarMarketLabel || 'King Bazaar',
                        }),
                            ...(location.state?.starlineMarketKey != null && {
                              starlineMarketKey: location.state.starlineMarketKey,
                              starlineMarketLabel: location.state.starlineMarketLabel || 'Starline',
                            }),
                            ...(location.state?.scheduleForTomorrow && { scheduleForTomorrow: true }),
                          };
                      navigate('/bidoptions', { state });
                    }}
                    className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full active:scale-95 transition-colors touch-manipulation"
                    aria-label={t('common.back')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <h1 className="text-xs sm:text-base md:text-lg font-bold uppercase tracking-wide truncate flex-1 text-center mx-1 text-white min-w-0">
                    {market?.gameName ? `${market.gameName} - ${title}` : title}
                </h1>
                <div className="shrink-0 px-2 py-1.5 flex items-center gap-2">
                    <img
                        src="https://res.cloudinary.com/dnyp5jknp/image/upload/v1771394532/wallet_n1oyef.png"
                        alt="Wallet"
                        className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
                    />
                    <span className="font-bold text-white text-[11px] sm:text-sm">
                        {wallet.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}
                    </span>
                </div>
            </div>

            {!bettingAllowed && bettingMessage && (
                <div className="mx-3 sm:mx-6 mt-2 p-3 rounded-xl bg-red-900/40 border border-red-500/60 text-red-200 text-sm font-medium flex items-center gap-2">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {bettingMessage}
                </div>
            )}

            {extraHeader}

            {showDateSession && (
                <div
                    className={`pb-4 pt-2 flex flex-row ${slotBetweenDateSession ? 'flex-nowrap overflow-x-auto' : 'flex-wrap overflow-hidden'} gap-2 sm:gap-3 ${dateSessionGridClassName}`}
                    style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}
                >
                    {/* Date display: tomorrow when scheduling, else today */}
                    <div className="flex flex-row items-center gap-2 flex-1 min-w-0 shrink overflow-hidden">
                        <div className="relative flex-1 min-w-0">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={displayDate || todayDate}
                                readOnly
                                className={`w-full pl-9 sm:pl-10 pr-3 py-2.5 min-h-[44px] h-[44px] bg-[#202124] border border-white/10 text-white rounded-full text-xs sm:text-sm font-bold text-center focus:outline-none cursor-default truncate ${dateSessionControlClassName}`}
                            />
                        </div>
                        {displayDate && displayDate !== todayDate && (
                            <span className="shrink-0 px-2.5 py-1.5 rounded-full text-[10px] sm:text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-400/40">
                                {t('gameBid.scheduled')}
                            </span>
                        )}
                    </div>

                    {/* Optional slot between date and session (e.g. Half Sangam flip) */}
                    {slotBetweenDateSession && (
                        <div className="shrink-0">
                            {slotBetweenDateSession}
                        </div>
                    )}
                    
                    {/* Session Select - visible when flip slot present (one row), else hidden on mobile */}
                    <div className={`relative flex-1 min-w-0 ${slotBetweenDateSession || showSessionOnMobile ? 'block' : 'hidden md:block'}`}>
                        <select
                            value={session}
                            onChange={(e) => setSession(e.target.value)}
                            disabled={lockSessionSelect || isRunning}
                            className={`w-full appearance-none bg-[#202124] border border-white/10 text-white font-bold text-xs sm:text-sm py-2.5 min-h-[44px] h-[44px] px-4 pr-8 rounded-full text-center focus:outline-none focus:border-[#d4af37] ${(lockSessionSelect || isRunning) ? 'opacity-80 cursor-not-allowed' : ''} ${dateSessionControlClassName}`}
                        >
                            {sessionOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt === 'OPEN' ? t('gameBid.open') : opt === 'CLOSE' ? t('gameBid.close') : opt}
                                </option>
                            ))}
                        </select>
                        {!hideSessionSelectCaret && (
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </div>
                        )}
                    </div>

                    {sessionRightSlot}
                </div>
            )}

            <div
                ref={contentRef}
                className={`flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full ios-scroll-touch ${
                    contentPaddingClass ?? (hideFooter ? 'pb-6' : 'pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-32')
                }`}
                style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}
            >
                {children}
            </div>

            {/* Footer - Card centered in right 50% on desktop (hidden when submit card is in content) - iOS safe area */}
            {!hideFooter && (
            <div
                className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,0px))] left-0 right-0 md:bottom-0 z-10 py-3 md:grid md:grid-cols-2 md:gap-0"
                style={{
                    paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
                    paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
                }}
            >
                <div className="hidden md:block" />
                <div className="flex justify-center md:justify-center">
                    <div
                        className={`w-full max-w-sm md:max-w-md rounded-2xl flex flex-col sm:flex-row items-center gap-4 sm:gap-6 ${
                            showFooterStats
                                ? 'bg-[#202124]/95 backdrop-blur-sm border border-white/10 shadow-xl shadow-black/30 px-4 py-4'
                                : 'bg-transparent border-0 shadow-none p-0'
                        }`}
                    >
                        {showFooterStats && (
                            <div className="flex items-center gap-6 sm:gap-8 shrink-0">
                                <div className="text-center">
                                    <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">{t('gameBid.bets')}</div>
                                    <div className="text-base sm:text-lg font-bold text-[#f2c14e]">{bidsCount}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">{t('gameBid.points')}</div>
                                    <div className="text-base sm:text-lg font-bold text-[#f2c14e]">{totalPoints}</div>
                                </div>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={!bidsCount || !bettingAllowed}
                            className={`flex-1 w-full sm:w-auto sm:min-w-[140px] font-bold py-3 px-6 rounded-xl shadow-lg transition-all text-sm sm:text-base ${
                                bidsCount && bettingAllowed
                                    ? 'bg-gradient-to-r from-[#d4af37] to-[#cca84d] text-[#4b3608] hover:from-[#e5c04a] hover:to-[#d4af37] active:scale-[0.98]'
                                    : 'bg-gradient-to-r from-[#d4af37] to-[#cca84d] text-[#4b3608] opacity-50 cursor-not-allowed'
                            }`}
                        >
                            {submitLabel === 'Submit Bets' ? t('gameBid.submitBets') : submitLabel === 'Submit Bet' ? t('gameBid.submitBet') : submitLabel}
                        </button>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
};

export default BidLayout;
