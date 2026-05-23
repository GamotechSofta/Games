import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiOutlineCash } from 'react-icons/hi';
import { getBalance, updateUserBalance } from '../api/bets';
import { useTheme } from '../context/ThemeContext';

/**
 * Sub-header matching photo: golden borders, username (left), DEPOSIT/WITHDRAWAL (center), wallet + balance (right).
 * Fixed below the main AppHeader.
 */
const SubHeader = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLight } = useTheme();
  const [balance, setBalance] = useState(null);

  const headerHeight = 'calc(3rem + env(safe-area-inset-top, 0px))';

  const loadStoredBalance = () => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const b = u?.balance ?? u?.walletBalance ?? u?.wallet ?? 0;
      setBalance(Number(b));
    } catch (_) {
      setBalance(0);
    }
  };

  useEffect(() => {
    loadStoredBalance();
    const onLogin = () => loadStoredBalance();
    const fetchAndUpdateBalance = async () => {
      try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        const userId = u?.id || u?._id;
        if (!userId) return;
        const res = await getBalance();
        if (res.success && res.data?.balance != null) {
          updateUserBalance(res.data.balance);
          setBalance(res.data.balance);
        }
      } catch (_) {}
    };
    fetchAndUpdateBalance();
    window.addEventListener('userLogin', onLogin);
    return () => window.removeEventListener('userLogin', onLogin);
  }, []);

  const displayBalance = balance != null ? Number(balance) : 0;
  const formattedBalance = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(displayBalance);

  return (
    <div
      className={`fixed left-0 right-0 z-40 w-full border-t md:hidden ${
        isLight
          ? 'bg-white border-amber-500/50 shadow-sm'
          : 'bg-black border-amber-500/60'
      }`}
      style={{ top: headerHeight }}
    >
      <div className="flex flex-nowrap items-center justify-between gap-2 sm:gap-4 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-4 md:px-6 h-10 sm:h-11 py-1.5">
        {/* Left - Wallet icon + balance */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
          <span
            className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border ${
              isLight
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
            }`}
            aria-hidden
          >
            <HiOutlineCash className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <span className={`text-sm sm:text-base font-bold truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>
            {formattedBalance}
          </span>
        </div>

        {/* Right - Deposit/Withdrawal */}
        <button
          type="button"
          onClick={() => navigate('/funds')}
          className={`shrink-0 rounded-lg border-2 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider active:scale-[0.98] transition-all ${
            isLight
              ? 'border-[#D32F2F] bg-red-50 text-[#D32F2F] shadow-sm hover:bg-[#D32F2F] hover:text-white'
              : 'border-amber-500/60 bg-[#1a1a1a] text-white shadow-[0_0_12px_rgba(251,191,36,0.25)] hover:bg-amber-500/15 hover:border-amber-400'
          }`}
        >
          {t('header.depositWithdrawal')}
        </button>
      </div>
    </div>
  );
};

export default SubHeader;
