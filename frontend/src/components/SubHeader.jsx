import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBalance, updateUserBalance } from '../api/bets';

/**
 * Sub-header matching photo: golden borders, username (left), DEPOSIT/WITHDRAWAL (center), wallet + balance (right).
 * Fixed below the main AppHeader.
 */
const SubHeader = () => {
  const navigate = useNavigate();
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
      className="fixed left-0 right-0 z-40 w-full bg-black border-t border-amber-500/60 md:hidden"
      style={{ top: headerHeight }}
    >
      <div className="flex flex-nowrap items-center justify-between gap-2 sm:gap-4 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-4 md:px-6 h-10 sm:h-11 py-1.5">
        {/* Left - Wallet icon + balance */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
          <img
            src="https://res.cloudinary.com/dnyp5jknp/image/upload/v1771394532/wallet_n1oyef.png"
            alt="Wallet"
            className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0"
          />
          <span className="text-sm sm:text-base font-bold text-white truncate">{formattedBalance}</span>
        </div>

        {/* Right - Deposit/Withdrawal */}
        <button
          type="button"
          onClick={() => navigate('/funds')}
          className="shrink-0 rounded-lg bg-[#1a1a1a] border-2 border-amber-400/90 px-3 sm:px-4 py-1.5 sm:py-2 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(251,191,36,0.4),0_2px_0_rgba(251,191,36,0.3),0_-2px_0_rgba(251,191,36,0.2)] hover:border-amber-400 hover:shadow-[0_0_16px_rgba(251,191,36,0.5)] active:scale-[0.98] transition-all"
        >
          Deposit/Withdrawal
        </button>
      </div>
    </div>
  );
};

export default SubHeader;
