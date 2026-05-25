import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiMiniArrowRight, HiMiniPlay } from 'react-icons/hi2';
import {
  MdAccountBalanceWallet,
  MdAutoAwesome,
  MdEmojiEvents,
  MdFlashOn,
  MdLocalFireDepartment,
  MdOutlineHeadsetMic,
  MdOutlineLiveTv,
  MdOutlineSecurity,
  MdOutlineSportsEsports,
  MdOutlineWorkspacePremium,
  MdShowChart,
} from 'react-icons/md';
import { API_BASE_URL } from '../../config/api';
import { GAMES } from '../../config/games';
import { getMarketImageUrl } from '../../config/marketCardThemes';
import { useTheme } from '../../context/ThemeContext';
import { useRefreshOnMarketReset } from '../../hooks/useRefreshOnMarketReset';
import { isPastClosingTime } from '../../utils/marketTiming';

const SUITS = ['♠', '♥', '♦', '♣'];

const MOBILE_HOME_BANNERS = [
  {
    src: 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771501969/Black_Orange_Minimalis_Offline_Gaming_Banner_Landscape_1920_x_500_px_1080_x_547_px_npbht7.png',
    alt: 'Black Orange Gaming Banner',
  },
  {
    src: 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771503014/Black_Gold_Modern_Casino_Night_Party_Facebook_Cover_1545_x_900_px_1080_x_547_px_1_ooz3sj.png',
    alt: 'Black Gold Casino Night Banner',
  },
];

const QUICK_LINKS = [
  {
    id: 'markets',
    label: 'Markets',
    icon: MdShowChart,
    path: '/markets',
    active: true,
    accent: 'text-[#e53935] dark:text-[#ff5a52]',
    ring: 'ring-[#e53935]/20 dark:ring-[#ff5a52]/25',
    bg: 'bg-red-50 dark:bg-[#2a1212]',
  },
  {
    id: 'starline',
    label: 'Starline',
    icon: MdAutoAwesome,
    path: '/startline-dashboard',
    accent: 'text-amber-500 dark:text-amber-300',
    ring: 'ring-amber-200 dark:ring-amber-400/20',
    bg: 'bg-amber-50 dark:bg-[#2b210d]',
  },
  {
    id: 'casino',
    label: 'Casino',
    icon: MdOutlineWorkspacePremium,
    path: '/games?category=highEarning',
    accent: 'text-amber-500 dark:text-amber-300',
    ring: 'ring-amber-200 dark:ring-amber-400/20',
    bg: 'bg-amber-50 dark:bg-[#2b210d]',
  },
  {
    id: 'skill-games',
    label: 'Skill Games',
    icon: MdOutlineSportsEsports,
    path: '/games?category=skills',
    accent: 'text-violet-500 dark:text-violet-300',
    ring: 'ring-violet-200 dark:ring-violet-400/20',
    bg: 'bg-violet-50 dark:bg-[#1c1630]',
  },
  {
    id: 'king-bazaar',
    label: 'King Bazaar',
    icon: MdEmojiEvents,
    path: '/king-bazaar-market',
    accent: 'text-amber-500 dark:text-amber-300',
    ring: 'ring-amber-200 dark:ring-amber-400/20',
    bg: 'bg-amber-50 dark:bg-[#2b210d]',
  },
];

const WHY_CHOOSE_ITEMS = [
  {
    id: 'secure',
    icon: MdOutlineSecurity,
    title: '100% Secure',
    subtitle: 'Safe & trusted platform',
    iconClass: 'text-orange-500 dark:text-orange-300',
    bgClass: 'bg-orange-50 dark:bg-[#2a1a12]',
  },
  {
    id: 'fast-payouts',
    icon: MdFlashOn,
    title: 'Fast Payouts',
    subtitle: 'Quick deposits & withdrawals',
    iconClass: 'text-amber-500 dark:text-amber-300',
    bgClass: 'bg-amber-50 dark:bg-[#2a220d]',
  },
  {
    id: 'support',
    icon: MdOutlineHeadsetMic,
    title: '24/7 Support',
    subtitle: "We're here for you anytime",
    iconClass: 'text-indigo-500 dark:text-indigo-300',
    bgClass: 'bg-indigo-50 dark:bg-[#151b31]',
  },
  {
    id: 'fair-play',
    icon: MdOutlineWorkspacePremium,
    title: 'Fair Play',
    subtitle: 'Transparent & fair gameplay',
    iconClass: 'text-purple-500 dark:text-purple-300',
    bgClass: 'bg-purple-50 dark:bg-[#221633]',
  },
];

const TOP_GAME_TILES = [
  {
    id: 'andar-bahar',
    title: 'Andar Bahar',
    image: null,
    bg: 'from-[#5b0f19] via-[#8f1b1f] to-[#22100e]',
    icon: 'A♠',
  },
  {
    id: 'teen-patti',
    title: 'Teen Patti',
    image: null,
    bg: 'from-[#4f123d] via-[#8b5cf6] to-[#1f1147]',
    icon: '3',
  },
  {
    id: 'ludo',
    title: 'Ludo',
    image: null,
    bg: 'from-[#0f4c81] via-[#1d78ff] to-[#20104a]',
    icon: '🎲',
  },
  {
    id: 'aviator',
    title: 'Aviator',
    image: GAMES.find((game) => game.id === 'aviator')?.image || null,
    bg: 'from-[#20060a] via-[#4d0f1f] to-[#0d0608]',
    icon: '✈',
  },
  {
    id: 'king-bazaar',
    title: 'King Bazaar',
    image: getMarketImageUrl('king-bazaar'),
    bg: 'from-[#2e2008] via-[#7c5310] to-[#160f05]',
    icon: '♛',
  },
];

const toMarketNameKey = (name) =>
  (name || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toLowerCase());

const formatTime = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const getMarketStatus = (market) => {
  if (isPastClosingTime(market)) return { status: 'closed' };
  const hasOpening = market.openingNumber && /^\d{3}$/.test(String(market.openingNumber));
  const hasClosing = market.closingNumber && /^\d{3}$/.test(String(market.closingNumber));
  if (hasOpening && hasClosing) return { status: 'closed' };
  if (hasOpening && !hasClosing) return { status: 'running' };
  return { status: 'open' };
};

function SectionHeader({ icon: Icon, iconClassName, title, actionLabel, onAction }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconClassName}`} />
        <h2 className="text-[15px] font-extrabold tracking-tight text-gray-900 dark:text-white">{title}</h2>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#e53935] dark:text-[#ff726b]"
      >
        {actionLabel}
        <HiMiniArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function QuickAccessTile({ item, onClick, isLight }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 transition active:scale-[0.98]',
        isLight
          ? 'bg-white text-gray-900 border-gray-200 shadow-[0_6px_18px_rgba(15,23,42,0.06)]'
          : 'bg-[#111111] text-white border-white/8 shadow-[0_10px_24px_rgba(0,0,0,0.3)]',
        item.active
          ? isLight
            ? 'border-[#ef5350]/40 shadow-[0_10px_24px_rgba(239,83,80,0.1)]'
            : 'border-[#ff3030] shadow-[0_0_22px_rgba(255,48,48,0.16)]'
          : '',
      ].join(' ')}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          item.active
            ? isLight
              ? 'bg-red-50'
              : 'bg-[#1a0f11]'
            : isLight
              ? item.bg
              : 'bg-white/[0.03]'
        }`}
      >
        <Icon className={`h-6 w-6 ${item.active ? 'text-[#e53935] dark:text-[#ff5a52]' : item.accent}`} />
      </span>
      <span className={`line-clamp-2 text-center text-[11px] font-semibold leading-tight ${item.active ? 'text-[#e53935] dark:text-[#ff5a52]' : ''}`}>
        {item.label}
      </span>
    </button>
  );
}

function HeroBanner({ t, navigate, index, setIndex, isLight }) {
  useEffect(() => {
    if (MOBILE_HOME_BANNERS.length <= 1) return undefined;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % MOBILE_HOME_BANNERS.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [setIndex]);

  return (
    <div className="relative w-full overflow-hidden">
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {MOBILE_HOME_BANNERS.map((banner, bannerIndex) => (
          <div key={banner.src} className="relative w-full shrink-0 basis-full overflow-hidden">
            <img
              src={banner.src}
              alt={banner.alt}
              className="block w-full h-auto object-contain opacity-95 dark:opacity-85"
              loading={bannerIndex === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactMarketCard({ market, t, navigate, liveVariant = false, suit }) {
  const imageUrl = getMarketImageUrl(market.gameName);
  const statusTone =
    market.status === 'closed'
      ? {
          badge: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30',
          action: 'text-red-500 dark:text-red-300',
          button: 'text-red-500 dark:text-red-300',
        }
      : {
          badge: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
          action: 'text-emerald-500 dark:text-emerald-300',
          button: 'bg-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,0.35)]',
        };

  const handlePrimaryAction = () => {
    if (market.status === 'closed') {
      navigate('/bidoptions', { state: { market, scheduleForTomorrow: true } });
      return;
    }
    navigate('/bidoptions', { state: { market } });
  };

  return (
    <div className="relative w-[162px] shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#141414] dark:shadow-[0_16px_34px_rgba(0,0,0,0.42)]">
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-right opacity-[0.18] dark:opacity-[0.28]"
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/75 dark:from-[#111111] dark:via-[#111111]/94 dark:to-[#111111]/75" />
        </>
      ) : null}
      <div className="relative z-10 p-3">
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusTone.badge}`}>
          {liveVariant
            ? t('homeMobile.live', { defaultValue: 'Live' })
            : market.status === 'closed'
              ? t('markets.marketClosed', { defaultValue: 'Market Closed' })
              : t('markets.marketIsOpen', { defaultValue: 'Market Open' })}
        </span>

        <div className="mt-2 text-[10px] font-medium text-gray-500 dark:text-white/55">{market.timeRange}</div>
        <div className="mt-1 line-clamp-1 text-[14px] font-bold leading-tight text-gray-900 dark:text-white">
          {t(`markets.names.${toMarketNameKey(market.gameName)}`, { defaultValue: market.gameName })}
        </div>

        {!liveVariant ? (
          <>
            <div className="mt-2 text-[20px] font-black leading-none tracking-wider text-[#f5c542]">{market.result}</div>
            <button
              type="button"
              onClick={handlePrimaryAction}
              className={`mt-3 text-left text-[11px] font-bold ${statusTone.action}`}
            >
              {market.status === 'closed'
                ? t('markets.runningForTomorrow')
                : t('markets.tapToPlay', { defaultValue: 'Tap to Play' })}
            </button>
          </>
        ) : (
          <>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div>
                <div className="text-[17px] font-black leading-none tracking-tight text-[#f5c542]">{market.result}</div>
              </div>
              <button
                type="button"
                onClick={handlePrimaryAction}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${statusTone.button}`}
                aria-label={t('homeMobile.playNow', { defaultValue: 'Play now' })}
              >
                <HiMiniPlay className="ml-0.5 h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TopGameCard({ game, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-[124px] shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.07)] transition active:scale-[0.98] dark:border-white/10 dark:bg-[#151515] dark:shadow-[0_16px_32px_rgba(0,0,0,0.38)]"
    >
      <div className={`relative h-[82px] overflow-hidden bg-gradient-to-br ${game.bg}`}>
        {game.image ? (
          <img src={game.image} alt={game.title} className="h-full w-full object-cover object-center" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[28px] font-black text-white/95">
            {game.icon}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-3 py-2 text-left">
          <div className="line-clamp-1 text-xs font-bold text-white">{game.title}</div>
        </div>
      </div>
    </button>
  );
}

function WhyChooseCard({ item }) {
  const Icon = item.icon;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-[#141414] dark:shadow-[0_14px_28px_rgba(0,0,0,0.34)]">
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.bgClass}`}>
        <Icon className={`h-6 w-6 ${item.iconClass}`} />
      </span>
      <div className="mt-3 text-[15px] font-bold text-gray-900 dark:text-white">{item.title}</div>
      <div className="mt-1 text-xs leading-5 text-gray-500 dark:text-white/60">{item.subtitle}</div>
    </div>
  );
}

export default function MobileHomeDashboard() {
  const { t } = useTranslation();
  const { isLight } = useTheme();
  const navigate = useNavigate();
  const [heroIndex, setHeroIndex] = useState(0);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);

  const fetchMarkets = async () => {
    const showLoading = isInitialLoad.current;
    if (showLoading) setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=main`);
      const data = await response.json();
      if (data.success) {
        const transformed = (data.data || [])
          .filter((market) => market.marketType !== 'startline')
          .map((market) => ({
            id: market._id,
            gameName: market.marketName,
            timeRange: `${formatTime(market.startingTime)} - ${formatTime(market.closingTime)}`,
            result: market.displayResult || '***-**-***',
            startingTime: market.startingTime,
            closingTime: market.closingTime,
            openingNumber: market.openingNumber,
            closingNumber: market.closingNumber,
            ...getMarketStatus(market),
          }));
        setMarkets(transformed);
      }
    } catch (error) {
      console.error('Error fetching home markets:', error);
    } finally {
      if (showLoading) {
        isInitialLoad.current = false;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchMarkets();
    const dataInterval = window.setInterval(fetchMarkets, 30000);
    return () => window.clearInterval(dataInterval);
  }, []);

  useRefreshOnMarketReset(fetchMarkets);

  const popularMarkets = useMemo(() => markets.slice(0, 6), [markets]);
  const liveMarkets = useMemo(() => markets.filter((market) => market.status !== 'closed').slice(0, 6), [markets]);

  const topGames = useMemo(
    () =>
      TOP_GAME_TILES.map((game) => {
        const mapped = GAMES.find((entry) => entry.id === game.id);
        return mapped ? { ...game, image: mapped.image || game.image } : game;
      }),
    [],
  );

  return (
    <div className="mx-auto w-full max-w-md pb-8">
      <HeroBanner t={t} navigate={navigate} index={heroIndex} setIndex={setHeroIndex} isLight={isLight} />

      <div className="space-y-5 px-3 pt-3 sm:px-4">
        <div className="grid grid-cols-5 gap-2">
          {QUICK_LINKS.map((item) => (
            <QuickAccessTile key={item.id} item={item} onClick={() => navigate(item.path)} isLight={isLight} />
          ))}
        </div>

        <div>
          <SectionHeader
            icon={MdLocalFireDepartment}
            iconClassName="text-[#ff5a52]"
            title={t('dashboard.popularMarkets', { defaultValue: 'Popular Markets' })}
            actionLabel={t('dashboard.viewAll', { defaultValue: 'View All' })}
            onAction={() => navigate('/markets')}
          />
          {loading ? (
            <div className="scrollbar-hidden flex gap-3 overflow-x-auto pb-1">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-[156px] w-[162px] shrink-0 rounded-2xl border border-gray-200 bg-white skeleton-shimmer dark:border-white/10 dark:bg-[#151515]"
                />
              ))}
            </div>
          ) : (
            <div className="scrollbar-hidden flex gap-3 overflow-x-auto pb-1">
              {popularMarkets.map((market, index) => (
                <CompactMarketCard
                  key={market.id}
                  market={market}
                  t={t}
                  navigate={navigate}
                  suit={SUITS[index % SUITS.length]}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionHeader
            icon={MdOutlineLiveTv}
            iconClassName="text-emerald-500"
            title={t('dashboard.liveMarkets', { defaultValue: 'Live Markets' })}
            actionLabel={t('dashboard.viewAll', { defaultValue: 'View All' })}
            onAction={() => navigate('/markets')}
          />
          {loading ? (
            <div className="scrollbar-hidden flex gap-3 overflow-x-auto pb-1">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-[138px] w-[162px] shrink-0 rounded-2xl border border-gray-200 bg-white skeleton-shimmer dark:border-white/10 dark:bg-[#151515]"
                />
              ))}
            </div>
          ) : (
            <div className="scrollbar-hidden flex gap-3 overflow-x-auto pb-1">
              {liveMarkets.map((market, index) => (
                <CompactMarketCard
                  key={market.id}
                  market={market}
                  t={t}
                  navigate={navigate}
                  suit={SUITS[index % SUITS.length]}
                  liveVariant
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionHeader
            icon={MdOutlineSportsEsports}
            iconClassName="text-violet-500"
            title={t('homeMobile.topGames', { defaultValue: 'Top Games' })}
            actionLabel={t('dashboard.viewAll', { defaultValue: 'View All' })}
            onAction={() => navigate('/games')}
          />
          <div className="scrollbar-hidden flex gap-3 overflow-x-auto pb-1">
            {topGames.map((game) => (
              <TopGameCard
                key={game.id}
                game={game}
                onClick={() => navigate(game.id === 'aviator' ? '/games?category=highEarning' : '/games')}
              />
            ))}
          </div>
        </div>

        <div>
          <SectionHeader
            icon={MdOutlineSecurity}
            iconClassName="text-amber-500"
            title={t('homeMobile.whyChooseAakda', { defaultValue: 'Why Choose Aakda' })}
            actionLabel={t('common.more', { defaultValue: 'More' })}
            onAction={() => navigate('/support')}
          />
          <div className="grid grid-cols-2 gap-3">
            {WHY_CHOOSE_ITEMS.map((item) => (
              <WhyChooseCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-gradient-to-r from-[#fff7ea] via-white to-[#fff2f0] px-4 py-4 shadow-[0_8px_22px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-gradient-to-r dark:from-[#17100c] dark:via-[#131313] dark:to-[#160d0d] dark:shadow-[0_16px_32px_rgba(0,0,0,0.34)]">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <MdAccountBalanceWallet className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                {t('homeMobile.walletBoost', { defaultValue: 'Boost your wallet instantly' })}
              </div>
              <div className="mt-1 text-xs leading-5 text-gray-600 dark:text-white/60">
                {t('homeMobile.walletBoostSubtitle', {
                  defaultValue: 'Add funds, place bids faster, and track every market from one place.',
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/funds?tab=add-fund')}
              className="rounded-full bg-[#e53935] px-4 py-2 text-xs font-bold text-white shadow-[0_10px_24px_rgba(229,57,53,0.28)]"
            >
              {t('header.deposit', { defaultValue: 'Deposit' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
