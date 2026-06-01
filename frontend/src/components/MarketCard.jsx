import React, { memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const toMarketNameKey = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toLowerCase());
};

function PlayIcon({ color = '#22c55e', size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{ width: size, height: size, display: 'block', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" fill="none" />
      <path d="M10 8.2v7.6l6.2-3.8L10 8.2z" fill={color} />
    </svg>
  );
}

function ClockIcon({ color = 'rgba(255,255,255,0.8)', size = 18 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, color }}
    >
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 8.8v4.2l2.8 1.7" />
      <path d="M9.2 3h5.6" />
      <path d="M10.2 5.5h3.6" />
    </svg>
  );
}

function MarketCard({ market }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showClosedModal, setShowClosedModal] = useState(false);
  const getIsDarkTheme = () => {
    if (typeof document === 'undefined') return true;
    const rootClasses = document.documentElement.classList;
    return rootClasses.contains('theme-dark') || rootClasses.contains('dark');
  };
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return getIsDarkTheme();
  });

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    const syncTheme = () => setIsDarkMode(getIsDarkTheme());
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const isOpen = market.status === 'open' || market.status === 'running';
  const isClosed = market.status === 'closed';

  const handleClick = () => {
    if (isOpen) {
      navigate('/bidoptions', { state: { market } });
      return;
    }
    setShowClosedModal(true);
  };

  const handlePlaceBetTomorrow = () => {
    navigate('/bidoptions', { state: { market, scheduleForTomorrow: true } });
    setShowClosedModal(false);
  };

  const displayName = t(`markets.names.${toMarketNameKey(market.gameName)}`, {
    defaultValue: market.gameName,
  });
  const tomorrowLabel = t('markets.runningForTomorrow', { defaultValue: 'Running For Tomorrow' });
  const openLabel = t('markets.marketIsOpen', { defaultValue: 'MARKET IS OPEN' });

  const resultValue = market.result || '***-**-***';
  const [openTime = '--', closeTime = '--'] = (market.timeRange || '').split(' - ');
  const theme = isDarkMode
    ? {
        cardBg: '#141a24',
        cardBorder: 'rgba(255,255,255,0.08)',
        cardBorderHover: 'rgba(255,255,255,0.18)',
        nameColor: '#ffffff',
        resultColor: '#ef4444',
        timeBarBg: '#3f424d',
        timeText: '#ffffff',
        timeLabel: '#d7dbe3',
        iconColor: '#b9beca',
        modalBg: '#14161d',
        modalBorder: '1px solid rgba(255,255,255,0.1)',
        modalText: '#fff',
        modalSubText: 'rgba(255,255,255,0.75)',
      }
    : {
        cardBg: '#ffffff',
        cardBorder: 'rgba(15,23,42,0.12)',
        cardBorderHover: 'rgba(15,23,42,0.12)',
        nameColor: '#0f172a',
        resultColor: '#ef4444',
        timeBarBg: '#f1f5f9',
        timeText: '#0f172a',
        timeLabel: '#475569',
        iconColor: '#334155',
        modalBg: '#ffffff',
        modalBorder: '1px solid rgba(15,23,42,0.12)',
        modalText: '#0f172a',
        modalSubText: '#475569',
      };

  const closedModal = showClosedModal ? (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.70)',
        padding: 16,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 340,
          borderRadius: 16,
          background: theme.modalBg,
          color: theme.modalText,
          border: theme.modalBorder,
          padding: 16,
          textAlign: 'center',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setShowClosedModal(false)}
          style={{
            position: 'absolute',
            right: 10,
            top: 10,
            background: 'none',
            border: 'none',
            color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.6)',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p style={{ fontSize: 12, fontWeight: 700, color: theme.modalText, lineHeight: 1.4 }}>
          {t('markets.closedForToday', { defaultValue: 'Market is closed for today.' })}
        </p>
        <p style={{ marginTop: 4, fontSize: 12, color: theme.modalSubText }}>
          {t('markets.betTomorrowHint', { defaultValue: 'You can place your bet for tomorrow.' })}
        </p>
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={handlePlaceBetTomorrow}
            style={{
              flex: 1,
              borderRadius: 10,
              background: '#d32f2f',
              border: 'none',
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 700,
              color: theme.modalText,
              cursor: 'pointer',
            }}
          >
            {t('markets.placeBet', { defaultValue: 'Place Bet' })}
          </button>
          <button
            type="button"
            onClick={() => setShowClosedModal(false)}
            style={{
              flex: 1,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.05)',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(15,23,42,0.18)',
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 700,
              color: theme.modalText,
              cursor: 'pointer',
            }}
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <style>{`
        @keyframes marketTomorrowBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        .market-tomorrow-label-text {
          animation: marketTomorrowBlink 1.1s ease-in-out infinite;
        }
        .market-card-time-bar {
          width: 100%;
          box-sizing: border-box;
          padding: 8px;
          border-radius: 14px;
        }
        .market-card-time-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 18px minmax(0, 1fr);
          align-items: center;
          gap: 3px;
          width: 100%;
          min-width: 0;
        }
        .market-card-time-col {
          container-type: inline-size;
          min-width: 0;
          text-align: center;
        }
        .market-card-time-value {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 800;
          white-space: nowrap;
          line-height: 1.15;
          letter-spacing: 0;
          font-size: 9px;
          font-size: clamp(7px, 19cqi, 11px);
          overflow: visible;
          text-overflow: clip;
        }
        .market-card-time-label {
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-top: 2px;
          line-height: 1.1;
          font-size: 8px;
          font-size: clamp(6px, 14cqi, 9px);
        }
      `}</style>
      {/* Card */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
        style={{
          position: 'relative',
          width: '100%',
          borderRadius: 16,
          overflow: 'hidden',
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          cursor: 'pointer',
          fontFamily: "'Barlow', sans-serif",
          transition: 'border-color 0.2s ease',
          boxShadow: 'none',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Header — market name */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 40,
            padding: '4px 8px 0',
            background: 'transparent',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: '0.03em',
              color: theme.nameColor,
              textTransform: 'uppercase',
              textAlign: 'center',
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              lineHeight: 1.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              width: '100%',
            }}
          >
            {displayName}
          </h3>
        </div>

        {/* Body — same horizontal padding as header / footer */}
        <div style={{ padding: '0 8px 6px' }}>
          {/* Result */}
          <div
            style={{
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              fontSize: 17,
              fontWeight: 800,
              color: theme.resultColor,
              letterSpacing: '0.08em',
              lineHeight: 1,
              textAlign: 'center',
              marginBottom: 6,
            }}
          >
            {resultValue}
          </div>

          {/* Time bar — font scales per column; full time always visible (no ellipsis) */}
          <div
            className="market-card-time-bar"
            style={{
              background: theme.timeBarBg,
            }}
          >
            <div className="market-card-time-grid">
              <div className="market-card-time-col">
                <div className="market-card-time-value" style={{ color: theme.timeText }}>
                  {market.startingTime ? openTime : '--'}
                </div>
                <div className="market-card-time-label" style={{ color: theme.timeLabel }}>
                  OPEN
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <ClockIcon color={theme.iconColor} size={18} />
              </div>

              <div className="market-card-time-col">
                <div className="market-card-time-value" style={{ color: theme.timeText }}>
                  {market.closingTime ? closeTime : '--'}
                </div>
                <div className="market-card-time-label" style={{ color: theme.timeLabel }}>
                  CLOSE
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Running for tomorrow — red bg static; text blinks only */}
        {isClosed ? (
          <div
            style={{
              padding: '7px 8px',
              textAlign: 'center',
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: '#ffffff',
              background: isDarkMode ? 'rgba(220,38,38,0.85)' : '#ef4444',
              borderTop: isDarkMode
                ? '1px solid rgba(248,113,113,0.25)'
                : '1px solid rgba(185,28,28,0.35)',
            }}
          >
            <span className="market-tomorrow-label-text">{tomorrowLabel}</span>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '7px 8px',
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#ffffff',
              background: isDarkMode ? '#15803d' : '#22c55e',
              
            }}
          >
            {/* <PlayIcon color="#ffffff" size={18} /> */}
            <span>{openLabel}</span>
          </div>
        )}
      </div>

      {typeof document !== 'undefined' && closedModal
        ? createPortal(closedModal, document.body)
        : null}
    </>
  );
}

export default memo(MarketCard);