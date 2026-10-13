import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL, BACKEND_BASE_URL, fetchWithAuth } from '../config/api';
import { getMyWalletTransactions } from '../api/bets';
import { formatWalletAmount } from '../utils/walletBalance';
import { getBidOptionLabel } from '../utils/betTypeLabels';
import useDisplayedWalletBalance from '../hooks/useDisplayedWalletBalance';

// Icons
import {
  MdOutlineAccountBalanceWallet,
  MdOutlineAccountBalance,
  MdOutlineReceiptLong,
  MdOutlineArrowOutward,
  MdOutlineCallReceived,
} from 'react-icons/md';
import {
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineClipboardCopy,
  HiCheck,
  HiOutlineX,
  HiArrowLeft,
  HiOutlineExternalLink,
  HiOutlineChevronRight,
  HiOutlineShieldCheck,
} from 'react-icons/hi';
import {
  FaTrophy,
  FaBullseye,
  FaMoneyBillWave,
  FaArrowRotateLeft,
  FaGift,
} from 'react-icons/fa6';

/* ───────── Date & Currency Formatting Helpers ───────── */
// For summary metrics: clean format without unnecessary .00 on whole numbers
const formatMetricCurrency = (amt) => {
  const n = Number(amt);
  if (!Number.isFinite(n)) return '0';
  const hasDecimals = n % 1 !== 0;
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
};

// For exact ledger & receipt: standard 2 decimal format
const formatExactCurrency = (amt) => {
  const n = Number(amt);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatFullDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatFullTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const getRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatFullDate(dateStr);
};

const getDateGroupKey = (dateStr) => {
  if (!dateStr) return 'Other';
  const d = new Date(dateStr);
  const now = new Date();

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/* ───────── Client-Side Game Map & Resolvers ───────── */
let globalClientGameNameMap = null;

async function fetchClientGameMap() {
  if (globalClientGameNameMap) return globalClientGameNameMap;
  try {
    const raw = sessionStorage.getItem('client_games_map_v1');
    if (raw) {
      globalClientGameNameMap = new Map(JSON.parse(raw));
      return globalClientGameNameMap;
    }
  } catch (_) {}

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/game/enabled?currency=INR`);
    const data = await res.json();
    const rawList = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.data?.message)
      ? data.data.message
      : Array.isArray(data?.data?.games)
      ? data.data.games
      : Array.isArray(data?.message)
      ? data.message
      : [];

    if (Array.isArray(rawList) && rawList.length > 0) {
      const entries = rawList
        .map((g) => [
          String(g?.id ?? g?.gid ?? g?.gameId ?? ''),
          g?.name || g?.title || `Game #${g?.id ?? ''}`,
        ])
        .filter(([id]) => Boolean(id));

      globalClientGameNameMap = new Map(entries);
      try {
        sessionStorage.setItem('client_games_map_v1', JSON.stringify(entries));
      } catch (_) {}
      return globalClientGameNameMap;
    }
  } catch (_) {}

  return new Map();
}

function resolveGameNameFromTx(tx, gameMap) {
  if (tx?.gameName) return tx.gameName;
  if (tx?.game?.name) return tx.game.name;

  const rawDesc = String(tx?.description || '');

  // 1. Check gid in description (e.g., gid:97775)
  const gidMatch = rawDesc.match(/gid:(\d+)/i);
  if (gidMatch && gidMatch[1]) {
    const idStr = String(gidMatch[1]);
    const nameFromMap = gameMap?.get ? gameMap.get(idStr) : globalClientGameNameMap?.get?.(idStr);
    if (nameFromMap) return nameFromMap;
  }

  // 2. Check if description has "Casino win: Chicken Road" or "Casino bet: Chicken Road"
  const casinoPrefixMatch = rawDesc.match(/casino\s+(?:win|bet|round)[:\s]+([^(\n]+)/i);
  if (casinoPrefixMatch && casinoPrefixMatch[1]) {
    const candidate = casinoPrefixMatch[1].trim();
    if (
      candidate &&
      !candidate.toLowerCase().startsWith('spin') &&
      !candidate.toLowerCase().startsWith('game')
    ) {
      return candidate;
    }
  }

  // 3. Known custom / self-hosted games
  const lower = rawDesc.toLowerCase();
  if (lower.includes('potludo')) return 'PotLudo';
  if (lower.includes('ludo')) return 'Ludo King';
  if (lower.includes('teen patti') || lower.includes('teenpatti')) return 'Teen Patti';

  return null;
}

/* ───────── Smart Transaction Classifier ───────── */
function classifyTransaction(tx, t, gameMap) {
  const desc = String(tx?.description || '').toLowerCase();
  const type = String(tx?.type || '').toLowerCase(); // 'credit' | 'debit'
  const isCredit = type === 'credit';
  const bet = tx?.bet;
  const gameName = resolveGameNameFromTx(tx, gameMap);
  const isCasino =
    Boolean(gameName) ||
    desc.includes('casino') ||
    String(tx?.referenceId || '').startsWith('casino:');

  // 1. Bet / Game Winning
  if (desc.includes('won') || desc.includes('win') || desc.includes('prize') || desc.includes('claim')) {
    const marketName = bet?.marketName || '';
    const betTypeLabel = bet?.betType ? getBidOptionLabel(bet.betType, bet.betNumber, t) : '';
    const betNumLabel = bet?.betNumber ? `No: ${bet.betNumber}` : '';
    const details = [betTypeLabel, betNumLabel].filter(Boolean).join(' • ');

    const title = gameName
      ? `Won • ${gameName}`
      : marketName
      ? `Won • ${marketName}`
      : isCasino
      ? 'Won • Casino Game'
      : 'Won • Market Win';

    return {
      category: 'win',
      categoryLabel: isCasino ? 'Casino Win' : 'Won Bet',
      marathiLabel: 'जिंकलेली रक्कम',
      color: 'emerald',
      bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      bgDark: 'dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
      badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
      icon: FaTrophy,
      title,
      subtitle: details || tx?.description || 'Winnings credited to wallet',
      gameName,
      isCredit: true,
    };
  }

  // 2. Bet / Game Stake Placed
  if (desc.includes('bet') || desc.includes('placed') || desc.includes('bid') || Boolean(bet) || isCasino) {
    const marketName = bet?.marketName || '';
    const betTypeLabel = bet?.betType ? getBidOptionLabel(bet.betType, bet.betNumber, t) : '';
    const betNumLabel = bet?.betNumber ? `No: ${bet.betNumber}` : '';
    const details = [betTypeLabel, betNumLabel].filter(Boolean).join(' • ');

    const title = gameName
      ? `Bet Placed • ${gameName}`
      : marketName
      ? `Bet Placed • ${marketName}`
      : isCasino
      ? 'Bet Placed • Casino Game'
      : 'Bet Placed • Game Bid';

    return {
      category: 'bet',
      categoryLabel: isCasino ? 'Casino Bet' : 'Bet Placed',
      marathiLabel: 'बेट लावले',
      color: 'amber',
      bgLight: 'bg-amber-50 text-amber-700 border-amber-200',
      bgDark: 'dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
      badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
      icon: FaBullseye,
      title,
      subtitle: details || tx?.description || 'Stake deducted for game bid',
      gameName,
      isCredit: false,
    };
  }

  // 3. Deposit / Funds Added
  if (
    desc.includes('deposit') ||
    desc.includes('add') ||
    desc.includes('payu') ||
    desc.includes('upi') ||
    desc.includes('recharge') ||
    desc.includes('qr') ||
    desc.includes('gateway')
  ) {
    return {
      category: 'deposit',
      categoryLabel: 'Deposit',
      marathiLabel: 'डिपॉझिट',
      color: 'blue',
      bgLight: 'bg-blue-50 text-blue-700 border-blue-200',
      bgDark: 'dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30',
      badgeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25',
      icon: FaMoneyBillWave,
      title: 'Added to Wallet',
      subtitle: tx?.description || 'Funds added via online payment / UPI',
      isCredit: true,
    };
  }

  // 4. Withdrawal / Cashout
  if (desc.includes('withdraw') || desc.includes('payout') || desc.includes('cashout') || desc.includes('bank')) {
    return {
      category: 'withdrawal',
      categoryLabel: 'Withdrawal',
      marathiLabel: 'पैसे काढणे',
      color: 'purple',
      bgLight: 'bg-purple-50 text-purple-700 border-purple-200',
      bgDark: 'dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30',
      badgeBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25',
      icon: MdOutlineAccountBalance,
      title: 'Withdrawal Request',
      subtitle: tx?.description || 'Amount withdrawn to bank account',
      isCredit: false,
    };
  }

  // 5. Refund / Reversal
  if (desc.includes('refund') || desc.includes('reject') || desc.includes('cancel') || desc.includes('rollback')) {
    return {
      category: 'refund',
      categoryLabel: 'Refund',
      marathiLabel: 'परतावा (रिफंड)',
      color: 'cyan',
      bgLight: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      bgDark: 'dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30',
      badgeBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/25',
      icon: FaArrowRotateLeft,
      title: 'Refund / Reversal',
      subtitle: tx?.description || 'Amount refunded back to wallet',
      isCredit: true,
    };
  }

  // 6. Bonus / Admin Adjustment
  if (desc.includes('bonus') || desc.includes('adjust') || desc.includes('admin') || desc.includes('reward')) {
    return {
      category: 'adjustment',
      categoryLabel: isCredit ? 'Bonus / Credit' : 'Adjustment',
      marathiLabel: isCredit ? 'बोनस / जमा' : 'अॅडजस्टमेंट',
      color: 'indigo',
      bgLight: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      bgDark: 'dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30',
      badgeBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
      icon: FaGift,
      title: isCredit ? 'Bonus Credited' : 'Wallet Adjusted',
      subtitle: tx?.description || (isCredit ? 'Special reward / bonus added' : 'Balance adjusted'),
      isCredit,
    };
  }

  // Fallback
  return {
    category: isCredit ? 'other_credit' : 'other_debit',
    categoryLabel: isCredit ? 'Credit' : 'Debit',
    marathiLabel: isCredit ? 'जमा' : 'नावे',
    color: isCredit ? 'emerald' : 'rose',
    bgLight: isCredit ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200',
    bgDark: isCredit
      ? 'dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
      : 'dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
    badgeBg: isCredit
      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25',
    icon: isCredit ? MdOutlineCallReceived : MdOutlineArrowOutward,
    title: isCredit ? 'Wallet Credited' : 'Wallet Debited',
    subtitle: tx?.description || (isCredit ? 'Money credited' : 'Money debited'),
    isCredit,
  };
}

/* ───────── Main Wallet Component ───────── */
const Wallet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const liveBalance = useDisplayedWalletBalance();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [gameMap, setGameMap] = useState(() => globalClientGameNameMap || new Map());

  // Filters & Search
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'credit' | 'debit'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'win' | 'bet' | 'deposit' | 'withdrawal' | 'refund' | 'adjustment'
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // 'all' | 'today' | 'yesterday' | 'week' | 'month'

  // Modal & Copy State
  const [selectedTx, setSelectedTx] = useState(null);
  const [copiedId, setCopiedId] = useState('');

  // Fetch Wallet Data
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [txRes, balRes, gMap] = await Promise.all([
        getMyWalletTransactions(500),
        fetchWithAuth(`${API_BASE_URL}/wallet/balance`),
        fetchClientGameMap(),
      ]);

      if (gMap && gMap.size > 0) {
        setGameMap(gMap);
      }

      if (txRes && txRes.success) {
        setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
      } else if (txRes && txRes.message) {
        setError(txRes.message);
      }

      if (balRes && balRes.ok) {
        const balData = await balRes.json();
        const freshBal = balData?.data?.balance ?? balData?.balance;
        if (Number.isFinite(Number(freshBal))) {
          window.dispatchEvent(new CustomEvent('balanceUpdated', { detail: { balance: Number(freshBal) } }));
        }
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
      setError(err?.message || 'Unable to connect to wallet server. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Copy helper with feedback
  const handleCopy = (text, id) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(String(text));
      setCopiedId(id || text);
      setTimeout(() => setCopiedId(''), 2000);
    } catch (_) {}
  };

  // Back Navigation
  const handleBack = () => {
    try {
      const prev = sessionStorage.getItem('prevPathname');
      if (prev && prev !== '/wallet') {
        navigate(prev);
        return;
      }
    } catch (_) {}
    navigate('/');
  };

  // Process & Filter Transactions
  const processedTransactions = useMemo(() => {
    return transactions.map((tx) => ({
      ...tx,
      info: classifyTransaction(tx, t, gameMap),
    }));
  }, [transactions, t, gameMap]);

  // Overall Financial Statistics
  const stats = useMemo(() => {
    let totalCredit = 0;
    let totalDebit = 0;
    let creditCount = 0;
    let debitCount = 0;

    processedTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'credit') {
        totalCredit += amt;
        creditCount++;
      } else {
        totalDebit += amt;
        debitCount++;
      }
    });

    const netMovement = totalCredit - totalDebit;
    return {
      totalCredit,
      totalDebit,
      creditCount,
      debitCount,
      totalCount: processedTransactions.length,
      netMovement,
    };
  }, [processedTransactions]);

  // Filtered List
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const query = searchQuery.trim().toLowerCase();

    return processedTransactions.filter((tx) => {
      // 1. Direction Filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // 2. Category Filter
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'win' && tx.info.category !== 'win') return false;
        if (categoryFilter === 'bet' && tx.info.category !== 'bet') return false;
        if (categoryFilter === 'deposit' && tx.info.category !== 'deposit') return false;
        if (categoryFilter === 'withdrawal' && tx.info.category !== 'withdrawal') return false;
        if (categoryFilter === 'refund' && tx.info.category !== 'refund') return false;
        if (categoryFilter === 'adjustment' && tx.info.category !== 'adjustment') return false;
      }

      // 3. Time Filter
      if (timeFilter !== 'all' && tx.createdAt) {
        const d = new Date(tx.createdAt);
        if (timeFilter === 'today') {
          if (
            d.getDate() !== now.getDate() ||
            d.getMonth() !== now.getMonth() ||
            d.getFullYear() !== now.getFullYear()
          ) return false;
        } else if (timeFilter === 'yesterday') {
          const y = new Date(now);
          y.setDate(now.getDate() - 1);
          if (
            d.getDate() !== y.getDate() ||
            d.getMonth() !== y.getMonth() ||
            d.getFullYear() !== y.getFullYear()
          ) return false;
        } else if (timeFilter === 'week') {
          const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        } else if (timeFilter === 'month') {
          const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) return false;
        }
      }

      // 4. Search Filter
      if (query) {
        const desc = String(tx.description || '').toLowerCase();
        const refId = String(tx.referenceId || '').toLowerCase();
        const id = String(tx._id || tx.id || '').toLowerCase();
        const mName = String(tx?.bet?.marketName || '').toLowerCase();
        const gName = String(tx?.gameName || tx?.game?.name || tx?.info?.gameName || '').toLowerCase();
        const bNum = String(tx?.bet?.betNumber || '').toLowerCase();
        const bType = String(tx?.bet?.betType || '').toLowerCase();
        const title = String(tx.info.title || '').toLowerCase();

        const match =
          desc.includes(query) ||
          refId.includes(query) ||
          id.includes(query) ||
          mName.includes(query) ||
          gName.includes(query) ||
          bNum.includes(query) ||
          bType.includes(query) ||
          title.includes(query);

        if (!match) return false;
      }

      return true;
    });
  }, [processedTransactions, typeFilter, categoryFilter, timeFilter, searchQuery]);

  // Group filtered transactions by Date
  const groupedTransactions = useMemo(() => {
    const map = new Map();
    filteredTransactions.forEach((tx) => {
      const groupKey = getDateGroupKey(tx.createdAt);
      if (!map.has(groupKey)) {
        map.set(groupKey, {
          dateLabel: groupKey,
          items: [],
          dayCredit: 0,
          dayDebit: 0,
        });
      }
      const entry = map.get(groupKey);
      entry.items.push(tx);
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'credit') entry.dayCredit += amt;
      else entry.dayDebit += amt;
    });

    return Array.from(map.values());
  }, [filteredTransactions]);

  return (
    <div className="w-full min-h-screen text-gray-900 bg-[#f5f5f7] dark:bg-[#0d0e11] dark:text-white transition-colors duration-200 pb-28 md:pb-12">
      
      {/* ── Mobile Top Sticky Bar (Appears under AppHeader on phones) ── */}
      <div className="sticky top-0 z-30 md:hidden border-b border-gray-200/80 bg-white/95 dark:border-white/[0.08] dark:bg-[#141518]/95 backdrop-blur-md px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm active:scale-95 dark:border-white/10 dark:bg-[#1f2025] dark:text-white"
            aria-label="Back"
          >
            <HiArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
              Wallet Statement
            </h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Live Ledger & Activity
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex h-8 items-center gap-1.5 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 active:scale-95 dark:border-white/10 dark:bg-[#1f2025] dark:text-white"
          title="Refresh"
        >
          <HiOutlineRefresh className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#e60000]' : ''}`} />
          <span className="text-[11px]">Sync</span>
        </button>
      </div>

      {/* ── Main Container: Responsive 2-Column on Desktop (>=1024px), Single Column on Mobile ── */}
      <div className="max-w-7xl mx-auto px-3.5 pt-3 sm:px-6 md:pt-4">
        
        {/* Desktop Header Row (Hidden on mobile) */}
        <div className="hidden md:flex items-center justify-between pb-4 mb-4 border-b border-gray-200/80 dark:border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-[#e60000]/10 text-[#e60000] dark:bg-[#e60000]/20">
                <MdOutlineAccountBalanceWallet className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Wallet & Ledger Statement
              </h1>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Detailed breakdown of all your bet placements, game winnings, deposits, and withdrawal transactions.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/passbook')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-[#1a1b1e] dark:text-gray-300 dark:hover:bg-[#25262a] transition-all"
            >
              <MdOutlineReceiptLong className="w-4 h-4 text-gray-500" />
              Passbook View
            </button>
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
            >
              <HiOutlineRefresh className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
              <p className="font-semibold">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => loadData(true)}
              className="text-xs font-bold underline shrink-0 hover:opacity-80"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Responsive 2-Column Grid (Laptop: Left Sticky Overview / Right Ledger) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          
          {/* ══════════════════════════════════════════════════════════
              LEFT COLUMN (lg:col-span-5 xl:col-span-4):
              Digital Wallet Card + Financial Statistics + Shortcuts
             ══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-3.5 lg:sticky lg:top-4">
            
            {/* ── Premium Digital Wallet Card ── */}
            <div className="relative overflow-hidden rounded-3xl border border-gray-200/90 bg-gradient-to-br from-white via-[#fbfbfc] to-[#f3f4f7] p-5 shadow-sm sm:p-6 dark:border-white/[0.08] dark:bg-gradient-to-br dark:from-[#1b1c21] dark:via-[#16171b] dark:to-[#111215] dark:shadow-2xl">
              {/* Subtle Ambient Radial Lighting */}
              <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#e60000]/15 blur-3xl dark:bg-[#e60000]/20" />
              <div className="pointer-events-none absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-600/10" />

              <div className="relative z-10 space-y-4">
                {/* Card Top: Live Badge & Chip Graphic */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Available Balance
                  </div>

                  {/* Micro chip graphic */}
                  <div className="h-5 w-7 rounded-md border border-amber-500/40 bg-gradient-to-br from-amber-400/20 via-amber-500/30 to-yellow-600/20 shadow-inner flex items-center justify-center">
                    <div className="h-2.5 w-4 rounded-sm border border-amber-500/30 border-dashed" />
                  </div>
                </div>

                {/* Balance Display */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl lg:text-[40px] font-black tracking-tight text-gray-900 dark:text-white leading-none">
                      ₹{formatWalletAmount(liveBalance != null ? liveBalance : 0)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
                    Ready for instant game bidding & bank withdrawal
                  </p>
                </div>

                {/* Primary Action Buttons (Thumb friendly on mobile, sleek on desktop) */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate('/funds?tab=add-fund')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#e60000] to-[#ff2b2b] hover:from-[#cf0000] hover:to-[#e60000] text-white py-3 px-3 text-xs sm:text-sm font-bold shadow-md shadow-[#e60000]/25 transition-all active:scale-[0.97]"
                  >
                    <span className="text-base font-black leading-none">+</span>
                    Add Funds
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/funds?tab=withdraw-fund')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 dark:border-white/15 dark:bg-[#222429] dark:text-white dark:hover:bg-[#2b2d34] py-3 px-3 text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-[0.97]"
                  >
                    <MdOutlineAccountBalance className="w-4 h-4 text-gray-600 dark:text-gray-300 shrink-0" />
                    Withdraw
                  </button>
                </div>

                {/* Mobile-only Passbook Link */}
                <button
                  type="button"
                  onClick={() => navigate('/passbook')}
                  className="w-full md:hidden flex items-center justify-between px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-[11px] font-semibold text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <MdOutlineReceiptLong className="w-3.5 h-3.5 text-[#e60000]" />
                    View Classic Bank Passbook
                  </span>
                  <HiOutlineChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              </div>
            </div>

            {/* ── Financial Metrics Summary: 2 Columns on Mobile + Full-width Net Flow, Stacks neatly on Laptop ── */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-2.5">
              
              {/* Metric 1: Money In */}
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3 sm:p-3.5 dark:bg-emerald-500/[0.08] flex flex-col justify-between">
                <div className="mb-1.5">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    Money In (+)
                  </span>
                </div>
                <div>
                  <p className="text-base sm:text-lg lg:text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight whitespace-nowrap">
                    +₹{formatMetricCurrency(stats.totalCredit)}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                    {stats.creditCount} wins & deposits
                  </p>
                </div>
              </div>

              {/* Metric 2: Money Out */}
              <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] p-3 sm:p-3.5 dark:bg-rose-500/[0.08] flex flex-col justify-between">
                <div className="mb-1.5">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 whitespace-nowrap">
                    Money Out (-)
                  </span>
                </div>
                <div>
                  <p className="text-base sm:text-lg lg:text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight whitespace-nowrap">
                    -₹{formatMetricCurrency(stats.totalDebit)}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                    {stats.debitCount} bets & payouts
                  </p>
                </div>
              </div>

              {/* Metric 3: Net Movement (Full width row on mobile, single card on laptop) */}
              <div className="col-span-2 sm:col-span-2 lg:col-span-1 rounded-2xl border border-gray-200 bg-white p-3 sm:p-3.5 dark:border-white/[0.08] dark:bg-[#17181c] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-0.5">
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      Net Flow
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                    {stats.totalCount} total activities recorded
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-base sm:text-lg lg:text-xl font-black tracking-tight whitespace-nowrap ${
                    stats.netMovement >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {stats.netMovement >= 0 ? `+₹${formatMetricCurrency(stats.netMovement)}` : `-₹${formatMetricCurrency(Math.abs(stats.netMovement))}`}
                  </p>
                  <span className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Lifetime Net
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop-only Security & Support Badge */}
            <div className="hidden lg:flex items-center justify-between p-3.5 rounded-2xl border border-gray-200/80 bg-white dark:border-white/[0.06] dark:bg-[#16171b] text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <HiOutlineShieldCheck className="w-5 h-5 text-emerald-500" />
                <span>100% Secure Encrypted Ledger</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/support')}
                className="font-bold text-[#e60000] hover:underline"
              >
                24/7 Support
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              RIGHT COLUMN (lg:col-span-7 xl:col-span-8):
              Search & Filters + Structured Statement Timeline
             ══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-3.5">
            
            {/* ── Filter Controls Card ── */}
            <div className="rounded-2xl border border-gray-200/90 bg-white p-3 sm:p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#17181c] space-y-3">
              
              {/* Row 1: Segmented Direction Control (grid on mobile, flex on desktop) + Search Bar */}
              <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
                
                {/* Direction Tabs: 3 Equal Columns on Mobile, Natural on Desktop */}
                <div className="grid grid-cols-3 sm:flex items-center p-1 rounded-xl bg-gray-100 dark:bg-[#202126] gap-1 shrink-0 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setTypeFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                      typeFilter === 'all'
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-[#2c2d34] dark:text-white'
                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
                    }`}
                  >
                    All ({stats.totalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter('credit')}
                    className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                      typeFilter === 'credit'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400'
                    }`}
                  >
                    <MdOutlineCallReceived className="w-3.5 h-3.5 shrink-0" />
                    <span>In ({stats.creditCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter('debit')}
                    className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                      typeFilter === 'debit'
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'text-rose-600 hover:bg-rose-500/10 dark:text-rose-400'
                    }`}
                  >
                    <MdOutlineArrowOutward className="w-3.5 h-3.5 shrink-0" />
                    <span>Out ({stats.debitCount})</span>
                  </button>
                </div>

                {/* Instant Search Bar */}
                <div className="relative flex-1 min-w-[180px]">
                  <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search market, bet, reference ID..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl text-xs border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#e60000] focus:ring-1 focus:ring-[#e60000] dark:border-white/10 dark:bg-[#121316] dark:text-white dark:placeholder-gray-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                    >
                      <HiOutlineX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Category Chips (Swipable on mobile with smooth padding, Wrapped on desktop) */}
              <div className="pt-2 border-t border-gray-100 dark:border-white/[0.05]">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hidden lg:flex-wrap pb-1.5 -mx-1 px-1 touch-pan-x">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
                    Category:
                  </span>

                  {[
                    { id: 'all', label: 'All' },
                    { id: 'win', label: 'Wins' },
                    { id: 'bet', label: 'Bets' },
                    { id: 'deposit', label: 'Deposits' },
                    { id: 'withdrawal', label: 'Withdrawals' },
                    { id: 'refund', label: 'Refunds' },
                    { id: 'adjustment', label: 'Adjustments' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                        categoryFilter === cat.id
                          ? 'bg-[#1e2024] text-white dark:bg-white dark:text-black font-bold shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#22242a] dark:text-gray-300 dark:hover:bg-[#2b2d35]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}

                  {/* Time Range Filter Chips */}
                  <div className="flex items-center gap-1 ml-auto shrink-0 pl-1.5 border-l border-gray-200 dark:border-white/10">
                    {[
                      { id: 'all', label: 'All Time' },
                      { id: 'today', label: 'Today' },
                      { id: 'week', label: '7D' },
                    ].map((tf) => (
                      <button
                        key={tf.id}
                        type="button"
                        onClick={() => setTimeFilter(tf.id)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${
                          timeFilter === tf.id
                            ? 'bg-blue-600 text-white font-bold'
                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Transaction List / Feed ── */}
            <div className="space-y-3.5">
              
              {/* Skeleton State */}
              {loading && (
                <div className="space-y-2.5 animate-pulse">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-white/[0.06] dark:bg-[#17181c] flex items-center gap-3.5"
                    >
                      <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-white/10 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-40 rounded-md bg-gray-200 dark:bg-white/10" />
                        <div className="h-3 w-24 rounded-md bg-gray-200 dark:bg-white/10" />
                      </div>
                      <div className="space-y-2 text-right">
                        <div className="h-4 w-16 rounded-md bg-gray-200 dark:bg-white/10 ml-auto" />
                        <div className="h-3 w-10 rounded-md bg-gray-200 dark:bg-white/10 ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && filteredTransactions.length === 0 && (
                <div className="rounded-3xl border border-dashed border-gray-300 bg-white py-12 px-4 text-center dark:border-white/10 dark:bg-[#17181c]/60">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500 mb-3">
                    <MdOutlineReceiptLong className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    No matching transactions
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-1">
                    {searchQuery || categoryFilter !== 'all' || typeFilter !== 'all' || timeFilter !== 'all'
                      ? 'No records match your selected filter criteria. Try clearing them.'
                      : 'You do not have any wallet entries recorded yet.'}
                  </p>
                  {(searchQuery || categoryFilter !== 'all' || typeFilter !== 'all' || timeFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setCategoryFilter('all');
                        setTypeFilter('all');
                        setTimeFilter('all');
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-3.5 py-1.5 text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              )}

              {/* Date Grouped Timeline */}
              {!loading && groupedTransactions.map((group) => (
                <div key={group.dateLabel} className="space-y-2">
                  
                  {/* Date Divider */}
                  <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-gray-600 dark:text-gray-300">
                    <span className="uppercase tracking-wider text-[11px] font-extrabold text-gray-500 dark:text-gray-400">
                      {group.dateLabel}
                    </span>
                    <div className="flex items-center gap-2.5 text-[11px] font-semibold">
                      {group.dayCredit > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +{formatExactCurrency(group.dayCredit)}
                        </span>
                      )}
                      {group.dayDebit > 0 && (
                        <span className="text-rose-600 dark:text-rose-400">
                          -{formatExactCurrency(group.dayDebit)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cards inside Group */}
                  <div className="space-y-2">
                    {group.items.map((tx) => {
                      const info = tx.info;
                      const Icon = info.icon;
                      const txId = tx._id || tx.id;
                      const isCopied = copiedId === (tx.referenceId || txId);

                      return (
                        <div
                          key={txId || Math.random()}
                          onClick={() => setSelectedTx(tx)}
                          className="group relative cursor-pointer rounded-2xl border border-gray-200/90 bg-white p-3 sm:p-3.5 transition-all duration-150 hover:border-gray-300 hover:shadow-md dark:border-white/[0.06] dark:bg-[#17181c] dark:hover:border-white/15 dark:hover:bg-[#1c1d22] active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-3">
                            
                            {/* Category Icon */}
                            <div
                              className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border ${info.bgLight} ${info.bgDark} transition-transform group-hover:scale-105`}
                            >
                              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>

                            {/* Middle Details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate max-w-[170px] sm:max-w-[280px]">
                                  {info.title}
                                </h4>
                                <span
                                  className={`inline-flex items-center rounded-md border px-1.5 py-0.2 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide shrink-0 ${info.badgeBg}`}
                                >
                                  {info.categoryLabel}
                                </span>
                              </div>

                              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                                {info.subtitle}
                              </p>

                              {/* Time & Reference ID */}
                              <div className="mt-1 flex items-center gap-2 text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 flex-wrap">
                                <span className="whitespace-nowrap">{formatFullTime(tx.createdAt)}</span>
                                <span>•</span>
                                <span className="whitespace-nowrap">{getRelativeTime(tx.createdAt)}</span>
                                {tx.referenceId && (
                                  <>
                                    <span>•</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(tx.referenceId, tx.referenceId);
                                      }}
                                      className="inline-flex items-center gap-1 font-mono hover:text-gray-700 dark:hover:text-gray-300 transition-colors whitespace-nowrap"
                                      title="Copy reference ID"
                                    >
                                      Ref: {tx.referenceId.slice(0, 8)}...
                                      {isCopied ? (
                                        <HiCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                                      ) : (
                                        <HiOutlineClipboardCopy className="w-3 h-3 opacity-60 hover:opacity-100 shrink-0" />
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Amount & Sign (Always fits, never wraps awkwardly) */}
                            <div className="text-right shrink-0 pl-1">
                              <p
                                className={`text-sm sm:text-base font-extrabold tracking-tight whitespace-nowrap ${
                                  info.isCredit
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-gray-900 dark:text-white'
                                }`}
                              >
                                {info.isCredit ? `+₹${formatExactCurrency(tx.amount)}` : `-₹${formatExactCurrency(tx.amount)}`}
                              </p>
                              <span
                                className={`inline-block mt-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                                  info.isCredit
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {info.isCredit ? 'CREDIT' : 'DEBIT'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Transaction Receipt Modal (Optimized for Mobile Bottom Sheet & Laptop Dialog) ── */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedTx(null)}
        >
          <div
            className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1b1f] text-gray-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative p-5 sm:p-6 text-center border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-[#141518]/60">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-200/80 text-gray-600 hover:bg-gray-300 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20 transition-colors"
                aria-label="Close"
              >
                <HiOutlineX className="w-4 h-4" />
              </button>

              <div
                className={`mx-auto mb-2.5 flex h-13 w-13 items-center justify-center rounded-2xl border ${selectedTx.info.bgLight} ${selectedTx.info.bgDark} shadow-sm`}
              >
                {React.createElement(selectedTx.info.icon, { className: 'w-6 h-6' })}
              </div>

              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide mb-1 ${selectedTx.info.badgeBg}`}
              >
                {selectedTx.info.categoryLabel}
              </span>

              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
                {selectedTx.info.title}
              </h3>

              <div className="mt-2 flex items-baseline justify-center gap-1">
                <span
                  className={`text-3xl sm:text-4xl font-black tracking-tight ${
                    selectedTx.info.isCredit
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {selectedTx.info.isCredit
                    ? `+₹${formatExactCurrency(selectedTx.amount)}`
                    : `-₹${formatExactCurrency(selectedTx.amount)}`}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                {selectedTx.info.isCredit ? 'Successfully credited to your wallet balance' : 'Debited from your wallet balance'}
              </p>
            </div>

            {/* Modal Body / Key-Value Breakdown */}
            <div className="p-4 sm:p-5 space-y-3 text-xs sm:text-sm">
              
              {/* Description */}
              <div className="flex justify-between items-start gap-3 pb-2 border-b border-gray-100 dark:border-white/[0.06]">
                <span className="text-gray-500 dark:text-gray-400 font-medium shrink-0">Description</span>
                <span className="font-semibold text-right text-gray-900 dark:text-white break-words">
                  {selectedTx.description || selectedTx.info.subtitle || 'N/A'}
                </span>
              </div>

              {/* Market Name (if bet/win) */}
              {selectedTx?.bet?.marketName && (
                <div className="flex justify-between items-center gap-3 pb-2 border-b border-gray-100 dark:border-white/[0.06]">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Market</span>
                  <span className="font-bold text-[#e60000]">{selectedTx.bet.marketName}</span>
                </div>
              )}

              {/* Game Name (if casino/arcade game) */}
              {(selectedTx?.gameName || selectedTx?.game?.name || selectedTx?.info?.gameName) && (
                <div className="flex justify-between items-center gap-3 pb-2 border-b border-gray-100 dark:border-white/[0.06]">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Game Name</span>
                  <span className="font-bold text-[#e60000]">
                    {selectedTx.gameName || selectedTx.game?.name || selectedTx.info.gameName}
                  </span>
                </div>
              )}

              {/* Bet Type (if bet/win) */}
              {selectedTx?.bet?.betType && (
                <div className="flex justify-between items-center gap-3 pb-2 border-b border-gray-100 dark:border-white/[0.06]">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Bet Type</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {getBidOptionLabel(selectedTx.bet.betType, selectedTx.bet.betNumber, t)}
                  </span>
                </div>
              )}

              {/* Bet Number (if bet/win) */}
              {selectedTx?.bet?.betNumber && (
                <div className="flex justify-between items-center gap-3 pb-2 border-b border-gray-100 dark:border-white/[0.06]">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Bet Number</span>
                  <span className="font-mono font-bold text-sm px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white">
                    {selectedTx.bet.betNumber}
                  </span>
                </div>
              )}

              {/* Date & Time */}
              <div className="flex justify-between items-center gap-3 pb-2 border-b border-gray-100 dark:border-white/[0.06]">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Date & Time</span>
                <span className="font-medium text-right text-gray-700 dark:text-gray-300">
                  {formatFullDate(selectedTx.createdAt)}, {formatFullTime(selectedTx.createdAt)}
                </span>
              </div>

              {/* Reference ID */}
              {selectedTx.referenceId && (
                <div className="flex justify-between items-center gap-3 pb-2 border-b border-gray-100 dark:border-white/[0.06]">
                  <span className="text-gray-500 dark:text-gray-400 font-medium shrink-0">Reference ID</span>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-gray-700 dark:text-gray-300">
                    <span className="truncate max-w-[160px]">{selectedTx.referenceId}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedTx.referenceId, 'modal-ref')}
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"
                      title="Copy Reference ID"
                    >
                      {copiedId === 'modal-ref' ? (
                        <HiCheck className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <HiOutlineClipboardCopy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Internal ID */}
              {(selectedTx._id || selectedTx.id) && (
                <div className="flex justify-between items-center gap-3 pb-2 border-b border-gray-100 dark:border-white/[0.06]">
                  <span className="text-gray-500 dark:text-gray-400 font-medium shrink-0">Transaction ID</span>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-gray-700 dark:text-gray-300">
                    <span className="truncate max-w-[160px]">{selectedTx._id || selectedTx.id}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedTx._id || selectedTx.id, 'modal-id')}
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"
                      title="Copy Transaction ID"
                    >
                      {copiedId === 'modal-id' ? (
                        <HiCheck className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <HiOutlineClipboardCopy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-3.5 sm:p-4 bg-gray-50 dark:bg-[#141518] flex items-center gap-2.5 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
              <button
                type="button"
                onClick={() => {
                  setSelectedTx(null);
                  navigate('/support');
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:border-white/10 dark:bg-[#1f2025] dark:text-gray-300 dark:hover:bg-[#282a31] transition-colors"
              >
                <HiOutlineExternalLink className="w-4 h-4" />
                Support 24/7
              </button>

              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="flex-1 inline-flex items-center justify-center rounded-xl bg-[#e60000] hover:bg-[#cf0000] py-2.5 text-xs font-bold text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Wallet;
