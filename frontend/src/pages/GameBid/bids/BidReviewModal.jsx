import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBettingWindow } from '../BettingWindowContext';

const formatMoney = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return n.toFixed(1);
};

const formatDateTitle = (marketTitle, dateText, fallback) => {
  const m = (marketTitle || '').toString().trim();
  const d = (dateText || '').toString().trim();
  if (m && d) return `${m} - ${d}`;
  return m || d || fallback || 'Review Bet';
};

const renderBetNumber = (val) => {
  const s = (val ?? '').toString().trim();
  // Full Sangam display: OPEN3-JODI-CLOSE3 (e.g. 225-255 => 225-92-255)
  if (/^\d{3}-\d{3}$/.test(s)) {
    const [open, close] = s.split('-');
    const sumDigits = (x) => [...String(x)].reduce((acc, c) => acc + (Number(c) || 0), 0);
    const j1 = sumDigits(open) % 10;
    const j2 = sumDigits(close) % 10;
    return `${open}-${j1}${j2}-${close}`;
  }
  if (/^\d{2}$/.test(s)) {
    return (
      <span className="inline-flex items-center justify-center gap-2">
        <span>{s[0]}</span>
        <span>{s[1]}</span>
      </span>
    );
  }
  return s || '-';
};

const BidReviewModal = ({
  open,
  onClose,
  onSubmit,
  marketTitle,
  dateText,
  labelKey = 'Digit',
  rows = [],
  walletBefore = 0,
  totalBids = 0,
  totalAmount = 0
}) => {
  const { t, i18n } = useTranslation();
  const { allowed: bettingAllowed, message: bettingMessage } = useBettingWindow();
  const [stage, setStage] = useState('review'); // 'review' | 'success'
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (open) {
      setStage('review');
      setSubmitError('');
    }
  }, [open]);

  // Keep showing success popup even if parent sets open=false after submit.
  if (!open && stage !== 'success') return null;

  const before = Number(walletBefore) || 0;
  const amount = Number(totalAmount) || 0;
  const after = before - amount;
  const insufficientBalance = after < 0;
  const cannotSubmit = insufficientBalance || !bettingAllowed;

  const getTranslatedLabel = (key) => {
    const map = { Digit: 'digit', Pana: 'pana', Jodi: 'jodi', Ank: 'ank', Sangam: 'sangam' };
    const k = map[key] || key?.toLowerCase?.();
    return k && i18n.exists(`gameBid.${k}`) ? t(`gameBid.${k}`) : key;
  };
  const handleClose = () => {
    if (onClose) onClose();
  };
  const handleSubmitClick = async () => {
    if (cannotSubmit) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const fn = onSubmit?.();
      if (fn && typeof fn.then === 'function') await fn;

      // Persist bet history (only after successful submit)
      try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        const userId =
          u?._id || u?.id || u?.userId || u?.userid || u?.user_id || u?.uid || null;

        const entry = {
          id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
          userId,
          marketTitle: marketTitle || '',
          dateText: dateText || '',
          labelKey,
          rows: Array.isArray(rows) ? rows : [],
          totalBets: Number(totalBids) || 0,
          totalAmount: Number(totalAmount) || 0,
          session: (rows?.[0]?.type || '').toString(),
          createdAt: new Date().toISOString(),
        };

        const raw = localStorage.getItem('betHistory');
        const prev = raw ? JSON.parse(raw) : [];
        const next = Array.isArray(prev) ? [entry, ...prev] : [entry];
        localStorage.setItem('betHistory', JSON.stringify(next.slice(0, 200)));
      } catch (e) {
        // ignore storage errors
      }

      setStage('success');
    } catch (e) {
      setSubmitError(e?.message || t('betHistory.betFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      {stage === 'review' ? (
        <button type="button" onClick={handleClose} aria-label="Close" className="absolute inset-0 bg-black/60" />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-black/60" />
      )}

      {/* Modal - centered, above mobile navbar */}
      <div className="relative w-full max-w-md sm:max-w-lg mx-auto flex-shrink-0">
        {stage === 'success' ? (
          <div className="bg-white dark:bg-[#202124] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.55)] overflow-hidden border border-gray-200 dark:border-white/10">
            <style>{`
              @keyframes successPop {
                0% { transform: scale(0.6); opacity: 0; }
                60% { transform: scale(1.08); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes successDraw {
                to { stroke-dashoffset: 0; }
              }
              .success-pop {
                animation: successPop 420ms ease-out both;
              }
              .success-check-path {
                stroke-dasharray: 48;
                stroke-dashoffset: 48;
                animation: successDraw 520ms 140ms ease-out forwards;
              }
            `}</style>
            <div className="p-7 sm:p-8 flex flex-col items-center">
              <div className="success-pop w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#43b36a] flex items-center justify-center shadow-[0_10px_25px_rgba(67,179,106,0.35)]">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path className="success-check-path" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="mt-6 text-center">
                <div className="text-[#43b36a] font-semibold text-base sm:text-lg">
                  {t('gameBid.betPlacedSuccessfully')}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6">
              <button
                type="button"
                onClick={() => {
                  setStage('review');
                  handleClose();
                }}
                className="w-full bg-gradient-to-r from-[#d4af37] to-[#cca84d] text-[#4b3608] font-bold py-3.5 rounded-lg shadow-md active:scale-[0.99] transition-transform hover:from-[#e5c04a] hover:to-[#d4af37]"
              >
                {t('gameBid.ok')}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="bg-white dark:bg-[#202124] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.55)] overflow-hidden border border-gray-200 dark:border-white/10 max-h-[min(90svh,720px)] sm:max-h-[calc(100vh-48px)] flex flex-col"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0px)' }}
          >
            {/* Title bar */}
            <div className="bg-black text-gray-900 dark:text-white px-3 sm:px-4 py-2.5 text-center text-sm sm:text-lg font-semibold shrink-0 border-b border-gray-200 dark:border-white/10">
              {formatDateTitle(marketTitle, dateText, t('gameBid.reviewBet'))}
            </div>

            {/* Content: only history list scrolls */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* History (scroll only this section) */}
              <div className="flex-1 overflow-y-auto overscroll-contain ios-scroll-touch px-3 sm:px-4 pt-3 sm:pt-4 min-h-0">
                <div className="grid grid-cols-3 text-center font-semibold text-[#d4af37] text-[11px] sm:text-base">
                  <div className="truncate">{getTranslatedLabel(labelKey)}</div>
                  <div className="truncate">{t('gameBid.points')}</div>
                  <div className="truncate">{t('gameBid.type')}</div>
                </div>
                <div className="mt-2.5 sm:mt-3 space-y-2 sm:space-y-3">
                  {rows.map((r) => (
                    <div key={r.id} className="bg-black/40 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 dark:border-white/10">
                      <div className="grid grid-cols-3 text-center text-gray-900 dark:text-white font-semibold text-[12px] sm:text-base">
                        <div className="truncate">{renderBetNumber(r.number)}</div>
                        <div className="truncate text-amber-800 dark:text-[#f2c14e]">{r.points}</div>
                        <div className="truncate font-medium text-gray-300 uppercase">{r.type === 'OPEN' ? t('gameBid.open') : r.type === 'CLOSE' ? t('gameBid.close') : r.type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary 2x2 */}
              <div className="px-3 sm:px-4 pt-3 sm:pt-4 shrink-0">
                <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10">
                  <div className="grid grid-cols-2">
                    <div className="p-3 sm:p-4 text-center border-r border-b border-gray-200 dark:border-white/10">
                      <div className="text-gray-400 text-[11px] sm:text-sm">{t('gameBid.totalBets')}</div>
                      <div className="text-gray-900 dark:text-white font-bold text-base sm:text-lg leading-tight">{totalBids}</div>
                    </div>
                    <div className="p-3 sm:p-4 text-center border-b border-gray-200 dark:border-white/10">
                      <div className="text-gray-400 text-[11px] sm:text-sm">{t('gameBid.totalBetAmount')}</div>
                      <div className="text-gray-900 dark:text-white font-bold text-base sm:text-lg text-amber-800 dark:text-[#f2c14e] leading-tight">{amount}</div>
                    </div>
                    <div className="p-3 sm:p-4 text-center border-r border-gray-200 dark:border-white/10">
                      <div className="text-gray-400 text-[11px] sm:text-sm">{t('gameBid.walletBalanceBeforeDeduction')}</div>
                      <div className="text-gray-900 dark:text-white font-bold text-base sm:text-lg leading-tight">{formatMoney(before)}</div>
                    </div>
                    <div className="p-3 sm:p-4 text-center">
                      <div className="text-gray-400 text-[11px] sm:text-sm">{t('gameBid.walletBalanceAfterDeduction')}</div>
                      <div className={`font-bold text-base sm:text-lg leading-tight ${after < 0 ? 'text-red-400' : 'text-gray-900 dark:text-white'}`}>{formatMoney(after)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Betting closed / outside window */}
              {!bettingAllowed && bettingMessage && (
                <div className="mx-3 sm:mx-4 mt-2 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 text-sm shrink-0">
                  {bettingMessage}
                </div>
              )}

              {/* Insufficient balance warning */}
              {insufficientBalance && (
                <div className="mx-3 sm:mx-4 mt-2 p-3 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-200 text-sm shrink-0">
                  {t('gameBid.insufficientBalanceFull', { amount: amount.toLocaleString('en-IN'), before: before.toLocaleString('en-IN') })}
                </div>
              )}

              {/* Submit error */}
              {submitError && (
                <div className="mx-3 sm:mx-4 mt-2 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 text-sm shrink-0">
                  {submitError}
                </div>
              )}

              {/* Note */}
              <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-3 sm:pb-4 text-center text-red-400 font-semibold text-[12px] sm:text-base shrink-0">
                {t('gameBid.betNoteCannotCancel')}
              </div>
            </div>

            {/* Buttons (sticky bottom inside modal) */}
            <div className="px-3 sm:px-4 py-3 sm:py-4 grid grid-cols-2 gap-3 sm:gap-4 bg-white dark:bg-[#202124] shrink-0 border-t border-gray-200 dark:border-white/10">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="bg-black border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white font-bold py-3 rounded-xl sm:rounded-2xl shadow-md active:scale-[0.99] transition-transform hover:border-[#d4af37]/40 disabled:opacity-50"
              >
                {t('gameBid.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSubmitClick}
                disabled={submitting || cannotSubmit}
                className="bg-gradient-to-r from-[#d4af37] to-[#cca84d] text-[#4b3608] font-bold py-3 rounded-xl sm:rounded-2xl shadow-md active:scale-[0.99] transition-transform hover:from-[#e5c04a] hover:to-[#d4af37] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#4b3608]/30 border-t-[#4b3608] rounded-full animate-spin" />
                    {t('gameBid.placing')}
                  </>
                ) : (
                  t('gameBid.submitBet')
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BidReviewModal;
