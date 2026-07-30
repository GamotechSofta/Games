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

function getLoggedInUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return String(user?.id || user?._id || '').trim();
  } catch {
    return '';
  }
}

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
      const res = await fetch(`${BACKEND_BASE_URL}/api/game/list`);
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
    const userId = getLoggedInUserId();
    if (!userId) {
      setError(t('games.loginRequired', { defaultValue: 'Please login to play.' }));
      return;
    }
    const gameId = String(game?.gameId || '').trim();
    if (!gameId) return;

    setError('');
    setLaunchingId(gameId);
    try {
      const authToken = String(getUserToken() || '').trim();

      const res = await fetch(`${BACKEND_BASE_URL}/api/game/launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ userId, gameId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data?.launchUrl) {
        throw new Error(data?.message || 'Failed to launch game');
      }
      const launchUrl = String(data.launchUrl);
      const provider = String(game?.provider || '').toLowerCase();
      const external =
        /fashionbuddies\.in/i.test(launchUrl) ||
        /doormart\.shop/i.test(launchUrl) ||
        provider.includes('potludo') ||
        provider.includes('teenpatti') ||
        provider.includes('doormart');

      // Operator games: full redirect with user API token as `id`.
      if (external) {
        window.location.href = launchUrl;
        return;
      }

      setActiveGame({
        title: game.name || game.title || gameId,
        launchUrl,
      });
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
          {t('markets.casinoGames', { defaultValue: 'All Casino Games' })}
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
            {t('games.noneAvailableHint', {
              defaultValue: 'Ask admin to add an active game in Game Management.',
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
            const busy = launchingId === game.gameId;
            return (
              <button
                key={game.gameId || game._id}
                type="button"
                disabled={busy}
                onClick={() => handlePlay(game)}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-sm transition active:scale-[0.98] disabled:opacity-60 dark:border-white/10 dark:bg-[#1a1a1c]"
              >
                <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-[#2a1212] to-[#120808]">
                  {game.image ? (
                    <img
                      src={game.image}
                      alt=""
                      className="h-full w-full object-cover rounded-xl"
                    />
                  ) : (
                    <FaDice className="h-10 w-10 text-[#f0c27a]" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                    {game.name || game.title || game.gameId}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-white/45">
                    {game.provider || 'Game'}
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
