import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HiOutlineArrowLeft,
  HiOutlineCash,
  HiOutlineLogout,
  HiOutlineDuplicate,
  HiOutlineCheck,
  HiOutlineBookOpen,
  HiOutlineClipboardList,
  HiOutlineClock,
  HiOutlineLibrary,
  HiOutlineBell,
  HiOutlineChartBar,
  HiOutlineCurrencyDollar,
  HiOutlineStar,
  HiOutlineDownload,
  HiOutlineChatAlt2,
  HiOutlineTicket,
  HiOutlineTrendingUp,
} from 'react-icons/hi';
import { clearUserAuth } from '../utils/auth';
import { triggerApkDownload } from '../utils/downloads';
import {
  bidAccent,
  borderButton,
  borderDivider,
  borderNested,
  iconBtn,
  surfaceElevated,
  textPrimary,
  textMuted,
} from '../styles/appTheme';

const readUserFromStorage = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const pick = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
};

const signOutButtonBase =
  'flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-red-600 bg-red-600 text-sm font-bold text-white shadow-[0_4px_14px_rgba(220,38,38,0.35)] transition-all hover:bg-red-700 hover:border-red-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-red-400 dark:bg-red-600 dark:shadow-[0_4px_14px_rgba(239,68,68,0.25)] dark:hover:bg-red-500 dark:hover:border-red-300';

const signOutDesktopClass = `${signOutButtonBase} w-auto min-w-[200px] px-8`;
const signOutMobileClass = `${signOutButtonBase} w-full text-base touch-manipulation`;

const profileBackBtnClass = `min-h-[44px] min-w-[44px] flex shrink-0 items-center justify-center touch-manipulation transition-transform active:scale-95 select-none ${iconBtn}`;

function InfoField({ label, value, onCopy, copied, mono }) {
  return (
    <div className={`rounded-lg border bg-gray-50 px-2.5 py-2 dark:bg-[#1a1a1a] ${borderNested}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`${textMuted} text-[11px] font-medium uppercase tracking-wide`}>{label}</p>
          <p
            className={`mt-1 text-sm font-semibold text-gray-900 dark:text-white break-all ${mono ? 'font-mono text-xs' : ''}`}
          >
            {value}
          </p>
        </div>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-200/80 dark:hover:bg-white/10"
            aria-label="Copy"
          >
            {copied ? (
              <HiOutlineCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <HiOutlineDuplicate className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function SettingsCard({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[4.75rem] w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg border bg-white px-2 py-2.5 text-center transition-colors hover:bg-gray-50 active:scale-[0.99] dark:bg-[#141416] dark:hover:bg-white/[0.04] md:min-h-[58px] md:flex-row md:items-center md:gap-2.5 md:px-3 md:py-3 md:text-left lg:gap-3 ${borderButton}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-gray-300 md:h-8 md:w-8">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span
        className={`w-full text-[11px] font-medium leading-snug line-clamp-2 md:min-w-0 md:flex-1 md:text-xs md:leading-tight lg:text-sm md:line-clamp-none md:truncate ${textPrimary}`}
      >
        {label}
      </span>
    </button>
  );
}

const Profile = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState(() => readUserFromStorage());
  const [profileLoading, setProfileLoading] = useState(true);
  const [copiedField, setCopiedField] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setProfileLoading(false), 120);
    return () => clearTimeout(id);
  }, []);

  const form = useMemo(() => {
    const u = user || {};
    return {
      username: pick(u, ['username', 'name', 'fullName']),
      phone: pick(u, ['phone', 'mobile', 'mobileNumber', 'phoneNumber', 'phone_number', 'mobilenumber']),
      email: pick(u, ['email']),
      role: pick(u, ['role']),
    };
  }, [user]);

  useEffect(() => {
    const onLogout = () => {
      setUser(null);
      navigate('/login');
    };
    const onLogin = () => {
      const u = readUserFromStorage();
      if (u) setUser(u);
    };
    window.addEventListener('userLogout', onLogout);
    window.addEventListener('userLogin', onLogin);
    window.addEventListener('storage', () => {
      const u = readUserFromStorage();
      if (!u) onLogout();
      else setUser(u);
    });
    return () => {
      window.removeEventListener('userLogout', onLogout);
      window.removeEventListener('userLogin', onLogin);
    };
  }, [navigate]);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const walletValue = useMemo(() => {
    const v = pick(user, ['wallet', 'balance', 'points', 'walletAmount', 'wallet_amount', 'amount']);
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, [user]);

  const settingsItems = useMemo(
    () => [
      { id: 'myBets', icon: HiOutlineClipboardList, label: t('navigation.myBets'), path: '/bids' },
      { id: 'betHistory', icon: HiOutlineClock, label: t('bids.betHistory'), path: '/bet-history' },
      { id: 'passbook', icon: HiOutlineBookOpen, label: t('passbook.title'), path: '/passbook' },
      { id: 'bank', icon: HiOutlineLibrary, label: t('funds.bankDetails'), path: '/bank' },
      { id: 'notifications', icon: HiOutlineBell, label: t('notifications.title'), path: '/notifications' },
      { id: 'gameRate', icon: HiOutlineChartBar, label: t('header.updateRate'), path: '/game-rate' },
      { id: 'markets', icon: HiOutlineCurrencyDollar, label: t('sidebar.markets'), path: '/markets' },
      { id: 'starline', icon: HiOutlineStar, label: t('markets.starline'), path: '/startline-dashboard' },
      { id: 'topWinners', icon: HiOutlineTrendingUp, label: t('header.topWinners'), path: '/top-winners' },
      { id: 'support', icon: HiOutlineChatAlt2, label: t('header.helpDesk'), path: '/support' },
      { id: 'tickets', icon: HiOutlineTicket, label: t('support.myTickets'), path: '/support/status' },
      { id: 'download', icon: HiOutlineDownload, label: t('header.downloadApp'), action: triggerApkDownload },
    ],
    [t],
  );

  const handleCopy = (text, label) => {
    if (!text || text === t('profile.notSet') || text === t('profile.na')) return;
    navigator.clipboard?.writeText(String(text)).then(() => {
      setCopiedField(label);
      setTimeout(() => setCopiedField(''), 1500);
    });
  };

  const handleLogout = () => clearUserAuth();

  const handleBack = () => {
    try {
      if (window.matchMedia?.('(min-width: 768px)')?.matches) {
        navigate('/');
        return;
      }
      const prev = sessionStorage.getItem('prevPathname');
      if (prev && prev !== '/profile') {
        navigate(prev);
        return;
      }
      if (window.history.length > 1) {
        navigate(-1);
        return;
      }
    } catch (_) {}
    navigate('/');
  };

  const cardClass = `rounded-2xl ${surfaceElevated}`;

  if (profileLoading) {
    return (
      <div className="flex w-full min-w-0 flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(240px,300px)_1fr] lg:gap-4">
          <div className={`h-44 animate-pulse ${cardClass}`} />
          <div className={`h-32 animate-pulse ${cardClass}`} />
        </div>
        <div className={`h-24 animate-pulse ${cardClass}`} />
      </div>
    );
  }

  if (!user) return null;

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(i18n.language === 'en' ? 'en-US' : i18n.language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const avatarInitial = (form.username || 'U').charAt(0).toUpperCase();
  const formattedBalance = walletValue.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="w-full min-w-0 px-4 md:px-0">
      {/* Mobile sticky header */}
      <div
        className={`sticky top-0 z-30 -mx-4 mb-3 flex items-center gap-3 border-b bg-[#f5f5f7]/95 px-4 pb-3 pt-[max(0.25rem,env(safe-area-inset-top,0px))] backdrop-blur-md dark:bg-black/95 md:hidden ${borderDivider}`}
      >
        <button type="button" onClick={handleBack} className={profileBackBtnClass} aria-label={t('common.back')}>
          <HiOutlineArrowLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>
        <h1 className={`min-w-0 flex-1 truncate text-lg font-bold ${textPrimary}`}>{t('profile.title')}</h1>
      </div>

      <h1 className={`mb-3 hidden text-xl font-bold md:block lg:text-2xl ${textPrimary}`}>{t('profile.title')}</h1>

      <div className="flex w-full min-w-0 flex-col gap-3">
        <div className="grid w-full min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(240px,300px)_1fr] lg:items-start lg:gap-4">
          <section className={`${cardClass} p-3 md:p-4`}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-base font-bold text-black">
                {avatarInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-semibold md:text-base ${textPrimary}`}>
                  {form.username || t('profile.user')}
                </p>
                <p className={`text-[11px] ${textMuted}`}>
                  {form.role && form.role !== 'user' && form.role !== 'User' ? String(form.role) : t('profile.user')}
                  <span className="text-emerald-700 dark:text-emerald-400"> · {t('profile.active')}</span>
                </p>
              </div>
            </div>

            <div className={`mt-3 rounded-lg border bg-gray-50 px-3 py-2 dark:bg-[#1a1a1a] ${borderNested}`}>
              <p className={`text-[10px] font-medium uppercase tracking-wide ${textMuted}`}>
                {t('profile.walletBalance')}
              </p>
              <p className={`text-xl font-bold leading-tight md:text-2xl ${bidAccent}`}>₹{formattedBalance}</p>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => navigate('/funds?tab=add-fund')}
                className="flex min-h-[48px] items-center justify-center gap-1 rounded-lg border border-gray-900/20 bg-[#D32F2F] py-3 text-xs font-semibold text-white hover:border-gray-900/30 hover:bg-[#c62828] active:scale-[0.99] dark:border-red-400/70 sm:text-sm"
              >
                <HiOutlineCash className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t('funds.addFund')}</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/funds?tab=withdraw-fund')}
                className={`flex min-h-[48px] items-center justify-center gap-1 rounded-lg border bg-white py-3 text-xs font-semibold text-gray-900 hover:bg-gray-50 active:scale-[0.99] dark:bg-[#1a1a1a] dark:text-white dark:hover:bg-white/[0.06] sm:text-sm ${borderButton}`}
              >
                <span className="truncate">{t('funds.withdrawFund')}</span>
              </button>
            </div>
          </section>

          <section className={`${cardClass} p-3 md:p-4`}>
            <h2 className={`mb-2 text-sm font-semibold ${textPrimary}`}>{t('profile.accountInformation')}</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <InfoField
                label={t('profile.username')}
                value={form.username || t('profile.notSet')}
                onCopy={form.username ? () => handleCopy(form.username, 'username') : undefined}
                copied={copiedField === 'username'}
              />
              <InfoField
                label={t('profile.phone')}
                value={form.phone || t('profile.notSet')}
                onCopy={form.phone ? () => handleCopy(form.phone, 'phone') : undefined}
                copied={copiedField === 'phone'}
              />
              <InfoField
                label={t('profile.email')}
                value={form.email || t('profile.notSet')}
                onCopy={form.email ? () => handleCopy(form.email, 'email') : undefined}
                copied={copiedField === 'email'}
              />
              {memberSince && <InfoField label={t('profile.memberSince')} value={memberSince} />}
            </div>
          </section>
        </div>

        <section className={`${cardClass} w-full p-3 md:p-4`}>
          <div className="mb-3">
            <h2 className={`text-sm font-semibold ${textPrimary}`}>{t('profile.settings')}</h2>
            <p className={`mt-0.5 text-[11px] ${textMuted}`}>{t('profile.settingsSubtitle')}</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-4 md:gap-2.5 lg:grid-cols-6">
            {settingsItems.map((item) => (
              <SettingsCard
                key={item.id}
                icon={item.icon}
                label={item.label}
                onClick={() => (item.path ? navigate(item.path) : item.action?.())}
              />
            ))}
          </div>
        </section>

        <div className="hidden w-full justify-end pt-2 md:flex">
          <button
            type="button"
            onClick={handleLogout}
            className={signOutDesktopClass}
          >
            <HiOutlineLogout className="h-5 w-5 shrink-0" aria-hidden />
            {t('profile.signOut')}
          </button>
        </div>
      </div>

      {/* Mobile: last item in page — sits above bottom nav when scrolled (no fixed overlap) */}
      <button
        type="button"
        onClick={handleLogout}
        className={`${signOutMobileClass} mt-3 mb-1 md:hidden`}
      >
        <HiOutlineLogout className="h-5 w-5 shrink-0" aria-hidden />
        {t('profile.signOut')}
      </button>
    </div>
  );
};

export default Profile;
