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
    title: 'Instant\nand seamless\naccess in the app',
    subtitle: 'Play faster and jump into your favorite sections in seconds.',
    path: '/games?category=highEarning',
  },
  {
    src: 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771503014/Black_Gold_Modern_Casino_Night_Party_Facebook_Cover_1545_x_900_px_1080_x_547_px_1_ooz3sj.png',
    alt: 'Black Gold Casino Night Banner',
    title: 'Quick access\nto rewards\nand live action',
    subtitle: 'Explore bonuses, markets and casino play from one place.',
    path: '/markets',
  },
];

const QUICK_LINKS = [
  {
    id: 'free-money',
    label: 'Free\nmoney',
    subtitle: 'Giving away cash\nand prizes',
    eyebrow: 'Promo Drop',
    cta: 'Explore now',
    icon: MarketsIcon,
    imageSrc: '/istockphoto-826661764-640x640.jpg',
    path: '/funds?tab=add-fund',
    featured: true,
    tone: 'warm',
  },
  {
    id: 'bonuses',
    label: 'Bonuses',
    subtitle: 'Claim extra\nrewards',
    eyebrow: 'Special Rewards',
    cta: 'Open now',
    icon: CasinoChipIcon,
    imageSrc: '/boxing-day-celebration-with-gift_23-2151013747.avif',
    path: '/games?category=highEarning',
    tone: 'cool',
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
  const featured = Boolean(item.featured);
  const hasImage = Boolean(item.imageSrc);
  const warmTone = item.tone === 'warm';
  const cardClass = warmTone
    ? isLight
      ? 'border-[#dbc8b5] bg-[linear-gradient(135deg,#ccb79f_0%,#b59c83_52%,#9c846d_100%)] shadow-[0_14px_28px_rgba(120,95,70,0.16)]'
      : 'border-[#6c5949] bg-[linear-gradient(135deg,#bfa78f_0%,#a58d75_52%,#8d755f_100%)] shadow-[0_18px_32px_rgba(0,0,0,0.28)]'
    : isLight
      ? 'border-[#9fb4ca] bg-[linear-gradient(135deg,#6b7e95_0%,#8198b3_52%,#9eb4cb_100%)] shadow-[0_14px_28px_rgba(77,103,134,0.16)]'
      : 'border-[#495768] bg-[linear-gradient(135deg,#4b5d74_0%,#627895_52%,#7990ab_100%)] shadow-[0_18px_32px_rgba(0,0,0,0.28)]';
  const textClass = warmTone ? 'text-white' : 'text-white';
  const subTextClass = warmTone ? 'text-white/90' : 'text-white/88';
  const iconShellClass = warmTone
    ? 'bg-white/12 ring-1 ring-white/15'
    : 'bg-white/10 ring-1 ring-white/16';
  const badgeClass = warmTone
    ? 'bg-black/16 text-white/90 ring-1 ring-white/14'
    : 'bg-black/14 text-white/90 ring-1 ring-white/14';
  const ctaClass = warmTone
    ? 'bg-white text-[#7a624f] shadow-[0_10px_18px_rgba(255,255,255,0.16)]'
    : 'bg-white text-[#51647d] shadow-[0_10px_18px_rgba(255,255,255,0.16)]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative min-h-[132px] w-full min-w-0 overflow-hidden rounded-[26px] border p-4 text-left transition duration-200 active:scale-[0.98] ${cardClass}`}
    >
      {hasImage ? (
        <img
          src={item.imageSrc}
          alt={item.label}
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="lazy"
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04)_42%,rgba(0,0,0,0.08))]" />
      {hasImage ? (
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,14,20,0.1),rgba(10,14,20,0.28)_45%,rgba(10,14,20,0.38)),linear-gradient(90deg,rgba(10,14,20,0.1),rgba(10,14,20,0.08))]" />
      ) : null}
      <div className="absolute inset-x-0 top-0 h-14 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent)]" />
      <div className={`absolute ${featured ? '-right-4 bottom-[-6px] h-28 w-28' : 'right-1 bottom-1 h-24 w-24'} rounded-full bg-white/14 blur-2xl`} />
      <div className={`absolute ${featured ? 'right-14 top-6 h-10 w-10' : 'right-14 top-5 h-8 w-8'} rounded-full border border-white/12 bg-white/8`} />
      {!hasImage ? (
        <div
          className={`absolute ${
            featured ? 'right-3 bottom-2 h-[80px] w-[112px]' : 'right-3 bottom-3 h-[74px] w-[74px]'
          } flex items-center justify-center rounded-[24px] ${iconShellClass}`}
        >
          <Icon className={`${featured ? 'h-11 w-11' : 'h-8 w-8'} text-white drop-shadow-[0_6px_10px_rgba(0,0,0,0.18)]`} />
        </div>
      ) : null}

      <div className="relative z-10 flex h-full flex-col">
        <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${badgeClass}`}>
          {item.eyebrow}
        </span>
        <div className={`mt-3 whitespace-pre-line text-[16px] font-black leading-[1.05] tracking-tight ${textClass}`}>
          {item.label}
        </div>
        <div className={`mt-2 whitespace-pre-line text-[11px] font-medium leading-[1.45] ${subTextClass}`}>
          {item.subtitle}
        </div>
        <span className={`mt-auto inline-flex w-fit items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold ${ctaClass}`}>
          <span>{item.cta}</span>
          <HiMiniArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

function HeroBanner({ navigate, index, setIndex, isLight }) {
  useEffect(() => {
    if (MOBILE_HOME_BANNERS.length <= 1) return undefined;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % MOBILE_HOME_BANNERS.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [setIndex]);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate(MOBILE_HOME_BANNERS[index]?.path || '/games?category=highEarning')}
        className="block w-full text-left"
      >
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0e1116] shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {MOBILE_HOME_BANNERS.map((banner, bannerIndex) => (
              <div key={banner.src} className="relative h-[244px] w-full shrink-0 basis-full overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.18),transparent_22%),linear-gradient(90deg,#0a0c10_0%,#0f1217_42%,#2b3138_100%)]" />
                <img
                  src={banner.src}
                  alt={banner.alt}
                  className="absolute right-[-16%] top-0 h-full w-[76%] object-cover object-right opacity-88"
                  loading={bannerIndex === 0 ? 'eager' : 'lazy'}
                />
                <div className="absolute inset-y-0 left-0 w-[68%] bg-[linear-gradient(90deg,#090b0f_0%,rgba(9,11,15,0.97)_58%,rgba(9,11,15,0.1)_100%)]" />
                <div className="relative z-10 flex h-full flex-col justify-between px-6 py-5">
                  <div className="max-w-[190px] pt-1">
                    <div className="whitespace-pre-line text-[18px] font-black leading-[1.12] tracking-tight text-white">
                      {banner.title}
                    </div>
                    <p className="mt-3 max-w-[170px] text-[11px] leading-5 text-white/70">
                      {banner.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {MOBILE_HOME_BANNERS.map((_, dotIndex) => (
                      <button
                        key={dotIndex}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setIndex(dotIndex);
                        }}
                        className={`h-2.5 rounded-full transition-all ${
                          dotIndex === index ? 'w-6 bg-white' : 'w-2.5 bg-white/35'
                        }`}
                        aria-label={`Go to slide ${dotIndex + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </button>

      <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-2.5">
        {QUICK_LINKS.map((item) => (
          <QuickAccessTile key={item.id} item={item} onClick={() => navigate(item.path)} isLight={isLight} />
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
      <div className="px-3 pt-5 sm:px-4">
        <HeroBanner navigate={navigate} index={heroIndex} setIndex={setHeroIndex} isLight={isLight} />
      </div>

      <div className="space-y-5 px-3 pt-4 sm:px-4">
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
