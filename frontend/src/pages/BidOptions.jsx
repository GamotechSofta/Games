import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { textPrimary } from '../styles/appTheme';
import useLiveMarket from '../hooks/useLiveMarket';
import { isBettingAllowed } from '../utils/marketTiming';
import { isCloseDeclarationGame } from '../utils/closeDeclarationBets';

import { BID_OPTION_IMAGES, assetUrl } from '../config/homeAssets';

const SINGLE_DICE_IMAGE = assetUrl(BID_OPTION_IMAGES.singleDice);
const DOUBLE_DICE_IMAGE = assetUrl(BID_OPTION_IMAGES.doubleDice);
const SINGLE_PATTI_IMAGE = assetUrl(BID_OPTION_IMAGES.singlePatti);
const DOUBLE_PATTI_IMAGE = assetUrl(BID_OPTION_IMAGES.doublePatti);
const TRIPLE_PATTI_IMAGE = assetUrl(BID_OPTION_IMAGES.triplePatti);
const HALF_SANGAM_IMAGE = assetUrl(BID_OPTION_IMAGES.halfSangam);
const FULL_SANGAM_IMAGE = assetUrl(BID_OPTION_IMAGES.fullSangam);

const BidOptions = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();
  const initialMarket = location.state?.market;
  const marketType = (location.state?.marketType || '').toString().trim().toLowerCase();
  const kingBazaarMarketKey = location.state?.kingBazaarMarketKey;
  const kingBazaarMarketLabel = location.state?.kingBazaarMarketLabel || 'King Bazaar';
  const starlineMarketKey = location.state?.starlineMarketKey;
  const starlineMarketLabel = location.state?.starlineMarketLabel || 'Starline';
  const market = useLiveMarket(initialMarket, {
    marketType,
    groupKey: kingBazaarMarketKey || starlineMarketKey || '',
  });
  const inferredKing = (() => {
    const t = marketType;
    if (t === 'king' || t === 'king-bazaar' || t === 'kingbazaar') return true;
    const mType = (market?.marketType || '').toString().trim().toLowerCase();
    if (mType === 'king' || mType === 'king-bazaar' || mType === 'kingbazaar') return true;
    const name = (market?.marketName || market?.gameName || '').toString().toLowerCase();
    return name.includes('king bazaar') || name.includes('king-bazaar') || name.includes('kingbazaar');
  })();
  const isKingBazaar = inferredKing;
  const inferredStarline = (() => {
    const t = marketType;
    if (t === 'starline' || t === 'startline' || t === 'star-line') return true;
    const mType = (market?.marketType || '').toString().trim().toLowerCase();
    if (mType === 'startline' || mType === 'starline') return true;
    const name = (market?.marketName || market?.gameName || '').toString().toLowerCase();
    return name.includes('starline') || name.includes('startline') || name.includes('star line') || name.includes('start line');
  })();
  const isStarline = inferredStarline;
  const scheduleForTomorrow =
    location.state?.scheduleForTomorrow === true ||
    (market?.status === 'closed' && !isStarline && !isKingBazaar);
  const [closeOnlyWindow, setCloseOnlyWindow] = useState(
    () => !scheduleForTomorrow && isBettingAllowed(market)?.closeOnly === true,
  );

  useEffect(() => {
    if (scheduleForTomorrow) {
      setCloseOnlyWindow(false);
      return undefined;
    }
    const tick = () => {
      setCloseOnlyWindow(isBettingAllowed(market)?.closeOnly === true);
    };
    tick();
    const id = setInterval(tick, 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [market, scheduleForTomorrow]);

  // Redirect to home if no market (direct URL access or refresh)
  useEffect(() => {
    if (!market) {
      navigate('/', { replace: true });
      return;
    }
    if (isStarline && market?.status === 'closed') {
      navigate('/startline-dashboard', { replace: true });
    }
  }, [market, navigate]);

  const getGameTitle = (key) => {
    const map = {
      'Single Digit': t('gameRate.singleDigit'),
      'Jodi': t('gameRate.jodi'),
      'Jodi Bulk': t('gameRate.jodiBulk'),
      'Single Pana': t('gameRate.singlePana'),
      'Single Pana Bulk': t('gameRate.singlePanaBulk'),
      'Double Pana': t('gameRate.doublePana'),
      'Double Pana Bulk': t('gameRate.doublePanaBulk'),
      'Triple Pana': t('gameRate.triplePana'),
      'Full Sangam': t('gameRate.fullSangam'),
      'Half Sangam': t('gameRate.halfSangam'),
      'Half Sangam (O)': t('gameRate.halfSangamOpen'),
      'Half Sangam (C)': t('gameRate.halfSangamClose'),
      'Odd Even': 'Odd Even',
      'SP Common': 'SP Common',
      'DP Common': 'DP Common',
      'CP': 'CP',
      'SP Motor': 'SP Motor',
      'DP Motor': 'DP Motor',
      'SP DP Motor': 'SP DP Motor',
      'SP DP T Motor': 'SP DP T Motor',
      'Chart Game': 'Chart Game',
    };
    return map[key] || key;
  };

  const optionDisplayOrder = [
    'Single Digit',
    'Jodi',
    'Jodi Bulk',
    'Single Pana',
    'Single Pana Bulk',
    'Double Pana',
    'Double Pana Bulk',
    'Triple Pana',
    'Half Sangam',
    'Full Sangam',
    'SP Common',
    'DP Common',
    'CP',
    'SP Motor',
    'DP Motor',
    'SP DP Motor',
    'SP DP T Motor',
    'Odd Even',
    'Chart Game',
  ];

  const options = [
    {
      id: 1,
      title: 'Single Digit',
      displayTitle: getGameTitle('Single Digit'),
      icon: (
        <img
          src={SINGLE_DICE_IMAGE}
          alt={getGameTitle('Single Digit')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 2.5,
      title: 'Odd Even',
      displayTitle: getGameTitle('Odd Even'),
      icon: (
        <img
          src={SINGLE_DICE_IMAGE}
          alt={getGameTitle('Odd Even')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 3,
      title: 'Jodi',
      displayTitle: getGameTitle('Jodi'),
      icon: (
        <img
          src={DOUBLE_DICE_IMAGE}
          alt={getGameTitle('Jodi')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 4,
      title: 'Jodi Bulk',
      displayTitle: getGameTitle('Jodi Bulk'),
      icon: (
        <img
          src={DOUBLE_DICE_IMAGE}
          alt={getGameTitle('Jodi Bulk')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 5,
      title: 'Single Pana',
      displayTitle: getGameTitle('Single Pana'),
      icon: (
        <img
          src={SINGLE_PATTI_IMAGE}
          alt={getGameTitle('Single Pana')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 6,
      title: 'Single Pana Bulk',
      displayTitle: getGameTitle('Single Pana Bulk'),
      icon: (
        <img
          src={SINGLE_PATTI_IMAGE}
          alt={getGameTitle('Single Pana Bulk')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 6.5,
      title: 'SP Common',
      displayTitle: getGameTitle('SP Common'),
      icon: (
        <img
          src={SINGLE_PATTI_IMAGE}
          alt={getGameTitle('SP Common')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 6.6,
      title: 'DP Common',
      displayTitle: getGameTitle('DP Common'),
      icon: (
        <img
          src={DOUBLE_PATTI_IMAGE}
          alt={getGameTitle('DP Common')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 6.55,
      title: 'CP',
      displayTitle: getGameTitle('CP'),
      icon: (
        <img
          src={SINGLE_PATTI_IMAGE}
          alt={getGameTitle('CP')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 7,
      title: 'Double Pana',
      displayTitle: getGameTitle('Double Pana'),
      icon: (
        <img
          src={DOUBLE_PATTI_IMAGE}
          alt={getGameTitle('Double Pana')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 8,
      title: 'Double Pana Bulk',
      displayTitle: getGameTitle('Double Pana Bulk'),
      icon: (
        <img
          src={DOUBLE_PATTI_IMAGE}
          alt={getGameTitle('Double Pana Bulk')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 9,
      title: 'Triple Pana',
      displayTitle: getGameTitle('Triple Pana'),
      icon: (
        <img
          src={TRIPLE_PATTI_IMAGE}
          alt={getGameTitle('Triple Pana')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 10,
      title: 'Full Sangam',
      displayTitle: getGameTitle('Full Sangam'),
      icon: (
        <img
          src={FULL_SANGAM_IMAGE}
          alt={getGameTitle('Full Sangam')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 11,
      title: 'Half Sangam',
      displayTitle: getGameTitle('Half Sangam'),
      icon: (
        <img
          src={HALF_SANGAM_IMAGE}
          alt={getGameTitle('Half Sangam')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 12,
      title: 'SP Motor',
      displayTitle: getGameTitle('SP Motor'),
      icon: (
        <img
          src={SINGLE_PATTI_IMAGE}
          alt={getGameTitle('SP Motor')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 13,
      title: 'DP Motor',
      displayTitle: getGameTitle('DP Motor'),
      icon: (
        <img
          src={DOUBLE_PATTI_IMAGE}
          alt={getGameTitle('DP Motor')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 14,
      title: 'SP DP Motor',
      displayTitle: getGameTitle('SP DP Motor'),
      icon: (
        <img
          src={SINGLE_PATTI_IMAGE}
          alt={getGameTitle('SP DP Motor')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 15,
      title: 'SP DP T Motor',
      displayTitle: getGameTitle('SP DP T Motor'),
      icon: (
        <img
          src={SINGLE_PATTI_IMAGE}
          alt={getGameTitle('SP DP T Motor')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
    {
      id: 16,
      title: 'Chart Game',
      displayTitle: getGameTitle('Chart Game'),
      icon: (
        <img
          src={SINGLE_PATTI_IMAGE}
          alt={getGameTitle('Chart Game')}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ),
    },
  ];

  if (!market) {
    return null; // Will redirect via useEffect
  }

  // When market is "CLOSED IS RUNNING", hide options that require OPEN session.
  const isRunning = market.status === 'running';
  const visibleOptionsBase = isKingBazaar
    ? [
        {
          id: 'king-single-open',
          title: 'Single Digit',
          displayTitle: t('bidOptions.firstDigit'),
          sessionPreset: 'OPEN',
          icon: options.find((o) => o.title === 'Single Digit')?.icon,
        },
        {
          id: 'king-single-close',
          title: 'Single Digit',
          displayTitle: t('bidOptions.secondDigit'),
          sessionPreset: 'CLOSE',
          icon: options.find((o) => o.title === 'Single Digit')?.icon,
        },
        {
          id: 'king-jodi',
          title: 'Jodi',
          displayTitle: getGameTitle('Jodi'),
          icon: options.find((o) => o.title === 'Jodi')?.icon,
        },
        {
          id: 'king-jodi-bulk',
          title: 'Jodi Bulk',
          displayTitle: getGameTitle('Jodi Bulk'),
          icon: options.find((o) => o.title === 'Jodi Bulk')?.icon,
        },
      ]
    : isStarline
    ? options.filter((opt) => {
        const t = (opt.title || '').toString().trim();
        const allowed = new Set([
          'Single Digit',
          'Odd Even',
          'SP Common',
          'CP',
          'DP Common',
          'Chart Game',
          'Single Pana',
          'Single Pana Bulk',
          'Double Pana',
          'Double Pana Bulk',
          'Triple Pana',
          'Half Sangam',
          'SP Motor',
          'DP Motor',
          'SP DP Motor',
          'SP DP T Motor',
        ]);
        return allowed.has(t);
      })
    : options;

  const visibleOptions = (!isStarline && (isRunning || closeOnlyWindow))
    ? visibleOptionsBase.filter((opt) => {
        const t = (opt.title || '').toLowerCase().trim();
        // After open time (or when open is declared), hide Jodi / Sangam options.
        return !isCloseDeclarationGame(t);
      })
    : visibleOptionsBase;

  const orderedVisibleOptions = [...visibleOptions].sort((a, b) => {
    const ia = optionDisplayOrder.indexOf(a.title);
    const ib = optionDisplayOrder.indexOf(b.title);
    const safeA = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
    const safeB = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
    return safeA - safeB;
  });

  return (
    <div className="w-full text-gray-900 dark:text-white">
      <div className="mx-auto w-full max-w-[1440px] px-3 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-4 sm:pt-5 lg:px-6 xl:px-8">
      {/* Header */}
      <div className="relative flex w-full items-center pb-3 sm:pb-4">
        <button
          onClick={() => {
            if (isStarline && starlineMarketKey != null) {
              navigate('/starline-market', {
                state: { marketKey: starlineMarketKey, marketLabel: starlineMarketLabel },
              });
            } else if (isStarline) {
              navigate('/startline-dashboard');
            } else if (isKingBazaar && kingBazaarMarketKey != null) {
              navigate('/king-bazaar-market', {
                state: { marketKey: kingBazaarMarketKey, marketLabel: kingBazaarMarketLabel },
              });
            } else {
              navigate('/');
            }
          }}
          className="absolute left-3 sm:left-4 flex items-center justify-center min-w-[44px] min-h-[44px] -ml-1 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10 dark:hover:text-white active:scale-95 touch-manipulation"
          aria-label={t('common.back')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="w-full min-w-0 px-12 text-center">
          {/* Dynamic market name from selected market */}
          <h1 className="inline-block max-w-full truncate px-2 py-1 text-base font-bold tracking-wider uppercase text-gray-900 dark:text-white sm:text-lg">
            {market?.gameName || t('bidOptions.selectMarket')}
          </h1>
          <div className="mx-auto mt-1 h-[2px] w-[min(280px,72vw)] bg-[linear-gradient(90deg,rgba(230,0,0,0)_0%,rgba(230,0,0,0.65)_30%,rgba(230,0,0,1)_50%,rgba(230,0,0,0.65)_70%,rgba(230,0,0,0)_100%)]" />
          {isStarline ? (
            <div className="mt-2 text-xs font-extrabold tracking-[0.22em] text-[#d4af37] uppercase">
              {t('bidOptions.starlineMarket')}
            </div>
          ) : null}
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-2 gap-3 pt-1 sm:gap-4 sm:pt-2 md:grid-cols-4 lg:grid-cols-6">
        {orderedVisibleOptions.map((option) => (
          <div
            key={option.id}
            onClick={() => navigate('/game-bid', {
              state: {
                market,
                betType: option.title,
                sessionPreset: option.sessionPreset,
                gameMode: (option.title || '').toLowerCase().includes('bulk') ? 'bulk' : 'easy',
                ...((location.state?.scheduleForTomorrow || market?.status === 'closed') && {
                  scheduleForTomorrow: true,
                }),
                ...(isKingBazaar && kingBazaarMarketKey != null && {
                  marketType: 'king',
                  kingBazaarMarketKey,
                  kingBazaarMarketLabel,
                }),
                ...(isStarline && starlineMarketKey != null && {
                  marketType: 'starline',
                  starlineMarketKey,
                  starlineMarketLabel,
                }),
              }
            })}
            className="relative rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer group touch-manipulation min-h-[104px] flex flex-col items-center justify-center gap-2 sm:min-h-[120px] sm:gap-2.5 sm:p-4 md:min-h-[132px] hover:border-amber-400/50 hover:bg-amber-50/30 hover:shadow-md dark:border-white/10 dark:bg-gradient-to-br dark:from-[#1b1d22] dark:via-[#15171b] dark:to-[#0f1013] dark:shadow-[0_10px_24px_rgba(0,0,0,0.24)] dark:hover:from-[#23262d] dark:hover:via-[#1a1d22] dark:hover:to-[#121418] dark:hover:border-white/20"
          >
            {/* Icon Container with subtle glow effect */}
            <div className="flex h-[72px] w-[72px] items-center justify-center transition-transform duration-300 group-hover:scale-[1.03] [&_img]:drop-shadow-[0_0_14px_rgba(156,28,28,0.34)] [&_img]:transition-[filter,transform] [&_img]:duration-300 group-hover:[&_img]:drop-shadow-[0_0_22px_rgba(220,68,68,0.48)] sm:h-[84px] sm:w-[84px] md:h-[96px] md:w-[96px]">
              {option.icon}
            </div>

            {/* Title */}
            <span className={`${textPrimary} text-[10px] sm:text-[11px] md:text-sm font-semibold tracking-[0.14em] sm:tracking-[0.18em] uppercase text-center line-clamp-2 leading-tight`}>
              {option.displayTitle || option.title}
            </span>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
};

export default BidOptions;

