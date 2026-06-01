import React from 'react';
import { useTranslation } from 'react-i18next';
import { bidStatLabel, bidStatValue, bidSubmitBtn } from '../../styles/appTheme';

/**
 * Fixed bottom bar: BETS | POINTS | Submit — full width, top border only, page theme.
 */
export default function BidSubmitBar({
  betsCount = 0,
  totalPoints = 0,
  onSubmit,
  disabled = false,
  submitLabel,
  className = '',
}) {
  const { t } = useTranslation();
  const label =
    submitLabel === 'Submit Bets'
      ? t('gameBid.submitBets', { defaultValue: 'Submit Bets' })
      : submitLabel === 'Submit Bet'
        ? t('gameBid.submitBet', { defaultValue: 'Submit Bet' })
        : submitLabel || t('gameBid.submitBets', { defaultValue: 'Submit Bets' });

  return (
    <div
      className={`bid-submit-bar flex w-full items-stretch border-t border-gray-200 bg-white/95 backdrop-blur-md dark:border-white/20 dark:bg-[#1b1d22]/95 ${className}`.trim()}
    >
      <div className="flex min-w-0 flex-[0.38] items-stretch">
        <div className="flex flex-1 flex-col items-center justify-center px-2 py-2.5">
          <span className={`${bidStatLabel} text-[10px] leading-tight`}>
            {t('gameBid.bets', { defaultValue: 'Bets' })}
          </span>
          <span className={`${bidStatValue} text-lg leading-none tabular-nums`}>{betsCount}</span>
        </div>
        <div className="w-px shrink-0 self-stretch bg-gray-200 dark:bg-white/15" aria-hidden />
        <div className="flex flex-1 flex-col items-center justify-center px-2 py-2.5">
          <span className={`${bidStatLabel} text-[10px] leading-tight`}>
            {t('gameBid.points', { defaultValue: 'Points' })}
          </span>
          <span className={`${bidStatValue} text-lg leading-none tabular-nums`}>{totalPoints}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        className={`min-h-[48px] flex-[0.62] rounded-none px-3 text-sm font-bold ${bidSubmitBtn} ${
          disabled ? 'cursor-not-allowed opacity-50' : ''
        }`}
      >
        {label}
      </button>
    </div>
  );
}
