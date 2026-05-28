import React, { memo, useState } from 'react';
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

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 22, height: 22, color: 'rgba(255,255,255,0.8)' }}
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

  const isOpen = market.status === 'open' || market.status === 'running';
  const isLive = market.status === 'running';
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

  const resultValue = market.result || '***-**-***';
  const [openTime = '--', closeTime = '--'] = (market.timeRange || '').split(' - ');

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
          border: '1px solid rgba(255,255,255,0.1)',
          background: '#14161d',
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
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>
          {t('markets.closedForToday', { defaultValue: 'Market is closed for today.' })}
        </p>
        <p style={{ marginTop: 4, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
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
              color: '#fff',
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
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
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
          background: '#0f111a',
          border: '1px solid rgba(255,255,255,0.08)',
          cursor: 'pointer',
          fontFamily: "'Barlow', sans-serif",
          transition: 'border-color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        }}
      >
        {/* Banner */}
        <div style={{ position: 'relative', height: 106, overflow: 'hidden' }}>
          <img
            src="/marketCard.jpg"
            alt=""
            loading="lazy"
            aria-hidden
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
          />
          {/* Gradient overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, transparent 40%, rgba(10,12,22,0.65) 100%)',
            }}
          />
          {/* Live badge */}
          {isLive && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                background: 'rgba(220,50,50,0.92)',
                color: '#fff',
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '0.08em',
                padding: '2px 7px',
                borderRadius: 20,
                border: '1px solid rgba(255,100,100,0.4)',
                textTransform: 'uppercase',
              }}
            >
              LIVE
            </div>
          )}
          {/* Status chip */}
          <div
            style={{
              position: 'absolute',
              top: 7,
              right: 8,
              borderRadius: 999,
              border: isOpen ? '1px solid rgba(52,211,153,0.5)' : '1px solid rgba(248,113,113,0.45)',
              background: isOpen ? 'rgba(16,185,129,0.18)' : 'rgba(220,38,38,0.22)',
              color: isOpen ? '#86efac' : '#fecaca',
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '3px 8px',
            }}
          >
            {isOpen ? t('markets.statusOpen', { defaultValue: 'Open' }) : t('markets.statusClosed', { defaultValue: 'Closed' })}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '9px 10px 10px' }}>
          {/* Market name */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: '#ffffff',
              textTransform: 'uppercase',
              marginBottom: 3,
            }}
          >
            {displayName}
          </div>

          {/* Result */}
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 24,
              fontWeight: 900,
              color: '#d4a020',
              letterSpacing: '0.04em',
              lineHeight: 1,
              marginBottom: 1,
            }}
          >
            {resultValue}
          </div>

          {/* Time bar */}
          <div
            style={{
              background: '#1e2230',
              borderRadius: 14,
              padding: '7px 8px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 24px 1fr',
                alignItems: 'center',
                gap: 4,
                marginBottom: 5,
              }}
            >
              {/* Open */}
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#fff',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    letterSpacing: '0.02em',
                  }}
                >
                  {market.startingTime ? openTime : '--'}
                </div>
                <div
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.7)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginTop: 1,
                  }}
                >
                  OPEN
                </div>
              </div>

              {/* Clock icon */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <ClockIcon />
              </div>

              {/* Close */}
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#fff',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    letterSpacing: '0.02em',
                  }}
                >
                  {market.closingTime ? closeTime : '--'}
                </div>
                <div
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.7)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginTop: 1,
                  }}
                >
                  CLOSE
                </div>
              </div>
            </div>

          </div>

          {/* Bottom action row */}
          <div style={{ textAlign: 'center', paddingTop: 5 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isOpen) handleClick();
                else setShowClosedModal(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 700,
                color: isClosed ? 'rgba(248, 113, 113, 0.72)' : '#6ee7b7',
                letterSpacing: '0.03em',
                animation: isClosed ? 'marketTomorrowBlink 1.15s ease-in-out infinite' : 'none',
              }}
            >
              {isClosed
                ? t('markets.runningForTomorrow', { defaultValue: 'Running For Tomorrow' })
                : t('markets.tapToPlay', { defaultValue: 'Tap to Play' })}
            </button>
          </div>
        </div>
      </div>

      {typeof document !== 'undefined' && closedModal
        ? createPortal(closedModal, document.body)
        : null}
    </>
  );
}

export default memo(MarketCard);