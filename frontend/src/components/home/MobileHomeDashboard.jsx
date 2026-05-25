import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiMiniArrowRight, HiMiniPlay } from 'react-icons/hi2';
import {
  MdLocalFireDepartment,
  MdOutlineLiveTv,
  MdOutlineSportsEsports,
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
    id: 'casino',
    label: 'Casino',
    icon: CasinoChipIcon,
    path: '/games?category=highEarning',
    imageSrc: '/images/home/casino-card.png',
    iconColor: '#d58cff',
    darkCardClass:
      'border-[#6a3d8e] bg-[linear-gradient(135deg,#2b1438_0%,#17111f_52%,#0d0c14_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(141,88,184,0.18),0_10px_24px_rgba(0,0,0,0.32)]',
    lightCardClass:
      'border-[#dcc6ef] bg-[linear-gradient(135deg,#ffffff_0%,#fcf7ff_52%,#f3e8ff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(120,84,158,0.12)]',
    darkIconClass:
      'border-[#8d58b8]/65 bg-[radial-gradient(circle_at_30%_30%,rgba(213,140,255,0.42),rgba(67,31,95,0.96))]',
    lightIconClass:
      'border-[#d8b4fe] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.98),rgba(233,213,255,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]',
  },
  {
    id: 'markets',
    label: 'Markets',
    icon: MarketsIcon,
    path: '/markets',
    active: true,
    iconColor: '#ff5a52',
    darkCardClass:
      'border-[#8f2a2a] bg-[linear-gradient(135deg,#371015_0%,#211012_52%,#110b0c_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(182,60,60,0.18),0_10px_24px_rgba(0,0,0,0.32)]',
    lightCardClass:
      'border-[#f4c1c1] bg-[linear-gradient(135deg,#ffffff_0%,#fff5f5_52%,#ffe7e7_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(219,74,74,0.12)]',
    darkIconClass:
      'border-[#b63c3c]/65 bg-[radial-gradient(circle_at_30%_30%,rgba(255,94,94,0.46),rgba(85,19,19,0.96))]',
    lightIconClass:
      'border-[#fca5a5] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.98),rgba(254,226,226,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]',
  },
  {
    id: 'starline',
    label: 'Starline',
    icon: StarlineIcon,
    path: '/startline-dashboard',
    iconColor: '#ffd75a',
    darkCardClass:
      'border-[#8b6a1d] bg-[linear-gradient(135deg,#3a2b10_0%,#241d10_52%,#13100b_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(185,146,46,0.18),0_10px_24px_rgba(0,0,0,0.32)]',
    lightCardClass:
      'border-[#f2d89f] bg-[linear-gradient(135deg,#ffffff_0%,#fff9eb_52%,#fff3d6_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(199,155,53,0.12)]',
    darkIconClass:
      'border-[#b9922e]/65 bg-[radial-gradient(circle_at_30%_30%,rgba(255,215,90,0.42),rgba(100,73,14,0.96))]',
    lightIconClass:
      'border-[#facc15] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.98),rgba(254,243,199,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]',
  },
  {
    id: 'king-bazaar',
    label: 'King Bazaar',
    icon: CrownIcon,
    path: '/king-bazaar-market',
    iconColor: '#ffb149',
    darkCardClass:
      'border-[#8f5a1d] bg-[linear-gradient(135deg,#392110_0%,#24170f_52%,#120d0c_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(188,120,48,0.18),0_10px_24px_rgba(0,0,0,0.32)]',
    lightCardClass:
      'border-[#f0c28e] bg-[linear-gradient(135deg,#ffffff_0%,#fff7ed_52%,#ffe8cc_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(206,128,38,0.12)]',
    darkIconClass:
      'border-[#bc7830]/65 bg-[radial-gradient(circle_at_30%_30%,rgba(255,177,73,0.38),rgba(92,52,15,0.96))]',
    lightIconClass:
      'border-[#fdba74] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.98),rgba(255,237,213,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]',
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

function MarketsIcon({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M5 18V11" strokeLinecap="round" />
      <path d="M12 18V7" strokeLinecap="round" />
      <path d="M19 18V4" strokeLinecap="round" />
      <path d="M4 19.5h16" strokeLinecap="round" />
    </svg>
  );
}

function StarlineIcon({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.7l2.58 5.23 5.77.84-4.18 4.08.98 5.75L12 15.86 6.85 18.6l.98-5.75L3.65 8.77l5.77-.84L12 2.7z" />
    </svg>
  );
}

function CasinoChipIcon({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3.5v3.1M12 17.4v3.1M20.5 12h-3.1M6.6 12H3.5M17.85 6.15l-2.2 2.2M8.35 15.65l-2.2 2.2M17.85 17.85l-2.2-2.2M8.35 8.35l-2.2-2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CrownIcon({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 18.5h16l-1.15-8.26-4.23 3.2L12 5.5l-2.62 7.94-4.23-3.2L4 18.5zm3.5-2h9a1 1 0 100-2h-9a1 1 0 100 2z" />
    </svg>
  );
}

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
  const cardClass = isLight ? item.lightCardClass : item.darkCardClass;
  const iconShellClass = isLight ? item.lightIconClass : item.darkIconClass;
  const titleStyle = isLight ? { color: '#1f2937' } : { color: '#ffffff' };
  const iconStyle = { color: item.iconColor };

  if (item.imageSrc) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group relative block w-full min-w-0 overflow-hidden rounded-[18px] text-left transition active:scale-[0.98]"
      >
        <img
          src={item.imageSrc}
          alt={item.label}
          className="block h-auto w-full rounded-[18px] object-contain"
          loading="lazy"
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-[18px] border px-3 py-2.5 text-left transition active:scale-[0.98] ${cardClass}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${
          isLight
            ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.18)_42%,rgba(255,255,255,0.04))]'
            : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.1),transparent_42%,rgba(0,0,0,0.22))]'
        }`}
      />
      <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-[0_4px_12px_rgba(0,0,0,0.22)] ${iconShellClass}`}>
        <Icon className="h-5 w-5" style={iconStyle} />
      </span>
      <span className="relative z-10 min-w-0 flex-1 truncate text-[10.5px] font-semibold" style={titleStyle}>
        {item.label}
      </span>
      <span
        className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          isLight ? 'border-black/10 bg-white/80 shadow-[0_4px_10px_rgba(15,23,42,0.08)]' : 'bg-black/12'
        }`}
        style={isLight ? { color: item.iconColor } : { color: item.iconColor, borderColor: `${item.iconColor}88` }}
      >
        <HiMiniArrowRight className="h-2.5 w-2.5" />
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
    <div className="relative w-[calc((100%-1.5rem)/2.5)] min-w-[132px] max-w-[152px] shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#141414] dark:shadow-[0_16px_34px_rgba(0,0,0,0.42)]">
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
              ? t('markets.statusClosed', { defaultValue: 'Closed' })
              : t('markets.statusOpen', { defaultValue: 'Open' })}
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
        <div className="grid grid-cols-2 gap-2.5 pt-0.5">
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
                  className="h-[156px] w-[calc((100%-1.5rem)/2.5)] min-w-[132px] max-w-[152px] shrink-0 rounded-2xl border border-gray-200 bg-white skeleton-shimmer dark:border-white/10 dark:bg-[#151515]"
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
                  className="h-[138px] w-[calc((100%-1.5rem)/2.5)] min-w-[132px] max-w-[152px] shrink-0 rounded-2xl border border-gray-200 bg-white skeleton-shimmer dark:border-white/10 dark:bg-[#151515]"
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

      </div>
    </div>
  );
}
