import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBettingWindow } from './BettingWindowContext';
import { bidPageShell, bidHeader, bidGameAccentBold, bidStatValue, bidStatLabel, bidMetaValue, bidStatCard, bidSubmitBtn, bidMetaStrip, bidMetaGrid, bidMetaCell, bidMetaLabel, bidDateDisplay, bidSessionSelect, bidScheduledLabel } from '../../styles/appTheme';
import { formatWalletAmount, getStoredWalletBalance } from '../../utils/walletBalance';
import { getBetDisplayDate } from '../../utils/scheduledBetDate';

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
    showWalletBalance = true,
    onSubmit = () => {},
    showFooterStats = true,
    /** Show count + points in the same flat grid as date/session (mobile-friendly) */
    showInlineStats = false,
    inlineStatsLabels = { count: 'Count', amount: 'Bet Amount' },
    submitLabel = 'Submit Bets',
    contentPaddingClass,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const contentRef = useRef(null);
    const { allowed: bettingAllowed, closeOnly: bettingCloseOnly } = useBettingWindow();
    const scheduleForTomorrow = location.state?.scheduleForTomorrow === true;
    const todayDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const scheduledDisplayDate =
        displayDate || (scheduleForTomorrow ? getBetDisplayDate(true, null) : null);
    const metaDisplayDate = scheduledDisplayDate || todayDate;
    const isScheduledBet = Boolean(scheduledDisplayDate && scheduledDisplayDate !== todayDate);
    const [wallet, setWallet] = useState(() =>
        Number.isFinite(Number(walletBalance)) ? Number(walletBalance) : getStoredWalletBalance()
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
            setWallet(getStoredWalletBalance());
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
        <div className={bidPageShell}>
            {/* Header — stays pinned while bid content scrolls */}
            <div
                className={`${bidHeader} py-2 flex items-center justify-between gap-2 shrink-0`}
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
                    className={`p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full active:scale-95 transition-colors touch-manipulation bg-gray-100 border border-gray-200 text-red-500 dark:bg-white/10 dark:border-white/15 dark:text-red-300`}
                    aria-label={t('common.back')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <h1 className="text-sm sm:text-lg md:text-xl font-bold uppercase tracking-wide truncate flex-1 text-center mx-1 min-w-0">
                    {market?.gameName ? (
                        <>
                            <span className="text-gray-900 dark:text-white">{market.gameName}</span>
                            <span className="text-gray-900 dark:text-white"> - </span>
                            <span className={bidGameAccentBold}>{title}</span>
                        </>
                    ) : (
                        <span className="text-gray-900 dark:text-white">{title}</span>
                    )}
                </h1>
                {showWalletBalance ? (
                    <div className="shrink-0 px-2 py-1.5 flex items-center gap-2">
                        <img
                            src="https://res.cloudinary.com/dnyp5jknp/image/upload/v1771394532/wallet_n1oyef.png"
                            alt="Wallet"
                            className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0 drop-shadow-sm"
                        />
                        <span className={bidStatValue}>
                            {formatWalletAmount(wallet)}
                        </span>
                    </div>
                ) : (
                    <div className="shrink-0 w-[44px]" aria-hidden="true" />
                )}
            </div>

            <div
                ref={contentRef}
                className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full max-w-full ios-scroll-touch scrollbar-hidden ${
                    contentPaddingClass ?? (hideFooter ? 'pb-6' : 'pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-32')
                }`}
                style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}
            >
                {extraHeader ? <div>{extraHeader}</div> : null}

                {showDateSession && (
                    <div className={`${bidMetaStrip} md:hidden`}>
                        <div className={`${bidMetaGrid} ${dateSessionGridClassName}`}>
                            <div className={`${bidMetaCell} ${dateSessionControlClassName}`}>
                                {isScheduledBet && (
                                    <span className={bidScheduledLabel}>{t('gameBid.scheduled')}</span>
                                )}
                                <div className={bidDateDisplay}>
                                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700 dark:text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="truncate">{metaDisplayDate}</span>
                                </div>
                            </div>

                            <div className={`${bidMetaCell} relative ${slotBetweenDateSession || showSessionOnMobile ? '' : 'hidden md:flex'} ${dateSessionControlClassName}`}>
                                {slotBetweenDateSession && (
                                    <div className="absolute left-1/2 top-1 -translate-x-1/2 z-10">{slotBetweenDateSession}</div>
                                )}
                                <div className={`relative w-full ${slotBetweenDateSession ? 'mt-6' : ''}`}>
                                    <select
                                        value={session}
                                        onChange={(e) => setSession(e.target.value)}
                                        disabled={lockSessionSelect || isRunning}
                                        className={`${bidSessionSelect} ${(lockSessionSelect || isRunning) ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {sessionOptions.map((opt) => (
                                            <option key={opt} value={opt}>
                                                {opt === 'OPEN' ? t('gameBid.open') : opt === 'CLOSE' ? t('gameBid.close') : opt}
                                            </option>
                                        ))}
                                    </select>
                                    {!hideSessionSelectCaret && (
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1 text-gray-500 dark:text-white/60">
                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {showInlineStats && (
                                <>
                                    <div className={`${bidMetaCell}${extraHeader ? ' md:hidden' : ''}`}>
                                        <div className={bidMetaLabel}>{inlineStatsLabels.count}</div>
                                        <div className={`leading-tight ${bidMetaValue}`}>{bidsCount}</div>
                                    </div>
                                    <div className={`${bidMetaCell}${extraHeader ? ' md:hidden' : ''}`}>
                                        <div className={bidMetaLabel}>{inlineStatsLabels.amount}</div>
                                        <div className={`leading-tight ${bidMetaValue}`}>{totalPoints}</div>
                                    </div>
                                </>
                            )}
                        </div>

                        {sessionRightSlot && (
                            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">{sessionRightSlot}</div>
                        )}
                    </div>
                )}

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
                                ? 'bg-white/95 dark:bg-[#24171b]/95 backdrop-blur-sm border border-red-200 dark:border-red-900/60 shadow-xl shadow-red-100/60 dark:shadow-black/30 px-4 py-4'
                                : 'bg-transparent border-0 shadow-none p-0'
                        }`}
                    >
                        {showFooterStats && (
                            <div className="flex items-center gap-6 sm:gap-8 shrink-0">
                                <div className={`text-center min-w-[3.5rem] ${bidStatCard}`}>
                                    <div className={`${bidStatLabel} normal-case`}>{t('gameBid.bets')}</div>
                                    <div className={bidStatValue}>{bidsCount}</div>
                                </div>
                                <div className={`text-center min-w-[3.5rem] ${bidStatCard}`}>
                                    <div className={`${bidStatLabel} normal-case`}>{t('gameBid.points')}</div>
                                    <div className={bidStatValue}>{totalPoints}</div>
                                </div>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={!bidsCount || !bettingAllowed}
                            className={`flex-1 w-full sm:w-auto sm:min-w-[140px] py-3 px-6 rounded-xl ${bidSubmitBtn} ${
                                bidsCount && bettingAllowed ? '' : 'opacity-50 cursor-not-allowed'
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
