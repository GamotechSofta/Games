import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaDice, FaGamepad, FaTimes } from 'react-icons/fa';
import { iconBtn, textPrimary } from '../styles/appTheme';
import { BACKEND_BASE_URL } from '../config/api';
import { getApiErrorMessage } from '../utils/apiErrorMessage';
import { getUserToken } from '../utils/auth';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

function GameIframeOverlay({ title, launchUrl, onClose }) {
  const { t } = useTranslation();
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useBodyScrollLock(true);

  useEffect(() => {
    document.documentElement.classList.add('game-iframe-open');
    return () => document.documentElement.classList.remove('game-iframe-open');
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const overlay = (
    <div
      className="game-iframe-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Game'}
    >
      <div className="game-iframe-toolbar">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/15"
          aria-label={t('common.close', { defaultValue: 'Close' })}
        >
          <FaTimes className="h-4 w-4" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
          {title || t('games.play', { defaultValue: 'Play' })}
        </h2>
      </div>

      <div className="game-iframe-stage">
        {!iframeLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#d32f2f]" />
          </div>
        )}
        <iframe
          title={title || 'Game'}
          src={launchUrl}
          className="game-iframe-frame"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; gamepad; accelerometer; gyroscope"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => setIframeLoaded(true)}
        />
      </div>
    </div>
  );

  if (typeof document === 'undefined' || !document.body) return overlay;
  return createPortal(overlay, document.body);
}

const Games = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [launchingId, setLaunchingId] = useState('');
  const [activeGame, setActiveGame] = useState(null);

  const loadGames = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/game/enabled`);
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to load games');
      }
      setGames(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load games'));
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const closeGame = useCallback(() => {
    setActiveGame(null);
  }, []);

  const handlePlay = async (game) => {
    const authToken = String(getUserToken() || '').trim();
    if (!authToken) {
      setError(t('games.loginRequired', { defaultValue: 'Please login to play.' }));
      return;
    }
    const gameCode = String(game?.gameCode || game?.gameId || '').trim();
    if (!gameCode) return;

    setError('');
    setLaunchingId(gameCode);
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/game/launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ gameCode }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data?.launchUrl) {
        throw new Error(data?.message || 'Failed to launch game');
      }
      window.location.href = String(data.launchUrl);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to launch game'));
    } finally {
      setLaunchingId('');
    }
  };

  return (
    <div className="w-full text-gray-900 dark:text-white px-3 py-4 min-h-[50vh] flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`w-10 h-10 flex items-center justify-center ${iconBtn}`}
          aria-label={t('common.back')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className={`text-xl font-bold ${textPrimary}`}>
          {t('sidebar.games', { defaultValue: 'Games' })}
        </h1>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-2xl bg-gray-200/80 animate-pulse dark:bg-white/10"
            />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center px-4 py-12">
          <FaGamepad className="mb-3 h-10 w-10 text-gray-400 dark:text-white/30" />
          <p className="text-lg font-semibold text-gray-700 dark:text-white/80">
            {t('games.noneAvailable', { defaultValue: 'No games available yet' })}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            {t('games.noneAvailableProviderHint', {
              defaultValue: 'No enabled games returned for this operator yet.',
            })}
          </p>
          <button
            type="button"
            onClick={loadGames}
            className="mt-4 rounded-xl bg-[#d32f2f] px-4 py-2 text-sm font-semibold text-white"
          >
            {t('common.retry', { defaultValue: 'Retry' })}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {games.map((game) => {
            const code = game.gameCode || game.gameId;
            const busy = launchingId === code;
            const thumb = String(game.thumbnail || game.image || '').trim();
            return (
              <button
                key={game._key || code}
                type="button"
                disabled={busy}
                onClick={() => handlePlay(game)}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-sm transition active:scale-[0.98] disabled:opacity-60 dark:border-white/10 dark:bg-[#1a1a1c]"
              >
                <div className="mb-3 relative flex h-28 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#2a1212] to-[#120808]">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={game.name || code}
                      className="h-full w-full object-cover rounded-xl"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <FaDice
                    className={`h-10 w-10 text-[#f0c27a] ${thumb ? 'hidden' : ''}`}
                    aria-hidden={Boolean(thumb)}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                    {game.name || game.title || code}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-white/45">
                    {game.provider || code}
                  </p>
                </div>
                <span className="mt-3 inline-flex rounded-lg bg-[#d32f2f] px-2.5 py-1 text-[11px] font-semibold text-white">
                  {busy
                    ? t('games.opening', { defaultValue: 'Opening...' })
                    : t('games.play', { defaultValue: 'Play' })}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {activeGame?.launchUrl && (
        <GameIframeOverlay
          title={activeGame.title}
          launchUrl={activeGame.launchUrl}
          onClose={closeGame}
        />
      )}
    </div>
  );
};

export default Games;
