import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BACKEND_BASE_URL } from '../config/api';
import { getUserToken } from '../utils/auth';
import { getApiErrorMessage } from '../utils/apiErrorMessage';

export default function GamePlayer() {
  const { gameId: paramGameId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Resolved game identifier
  const resolvedGameId = useMemo(() => {
    return String(
      paramGameId ||
      searchParams.get('id') ||
      searchParams.get('gid') ||
      searchParams.get('gameCode') ||
      location.state?.game?.id ||
      location.state?.game?.gameCode ||
      location.state?.game?.gid ||
      ''
    ).trim();
  }, [paramGameId, searchParams, location.state]);

  // User details for header display (e.g. "alex" + avatar)
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch (_) {
      return null;
    }
  });

  useEffect(() => {
    const handleAuthSync = () => {
      try {
        setUser(JSON.parse(localStorage.getItem('user') || 'null'));
      } catch (_) {
        setUser(null);
      }
    };
    window.addEventListener('userLogin', handleAuthSync);
    window.addEventListener('userLogout', handleAuthSync);
    window.addEventListener('storage', handleAuthSync);
    return () => {
      window.removeEventListener('userLogin', handleAuthSync);
      window.removeEventListener('userLogout', handleAuthSync);
      window.removeEventListener('storage', handleAuthSync);
    };
  }, []);

  const displayName = useMemo(() => {
    try {
      const u = user || JSON.parse(localStorage.getItem('user') || 'null');
      if (u) {
        const val = u.username || u.name || u.firstName || u.phone;
        if (val && String(val).trim()) return String(val).trim();
      }
    } catch (_) {}
    return 'alex';
  }, [user]);

  // Resolve game title (fallback to session / state / fetch)
  const [gameTitle, setGameTitle] = useState(() => {
    const fromState = location.state?.game?.name || location.state?.game?.title;
    if (fromState && String(fromState).trim()) return String(fromState).trim();
    if (resolvedGameId) {
      try {
        const cachedTitle = sessionStorage.getItem(`game_title_${resolvedGameId}`);
        if (cachedTitle && String(cachedTitle).trim()) return String(cachedTitle).trim();
        const activeInfo = JSON.parse(sessionStorage.getItem('active_game_info') || 'null');
        if (activeInfo && String(activeInfo.id) === resolvedGameId && activeInfo.name) {
          return String(activeInfo.name).trim();
        }
      } catch (_) {}
    }
    return resolvedGameId ? `Game #${resolvedGameId}` : 'Casino Game';
  });

  const [launchUrl, setLaunchUrl] = useState(() => location.state?.launchUrl || '');
  const [loading, setLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [error, setError] = useState('');
  const iframeRef = useRef(null);

  // Lock document scrolling and hide background clutter
  useEffect(() => {
    document.documentElement.classList.add('game-iframe-open');
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.classList.remove('game-iframe-open');
      document.body.style.overflow = '';
    };
  }, []);

  // Fetch enabled games if title is just a fallback ID
  useEffect(() => {
    if (!resolvedGameId) return;
    if (gameTitle && !gameTitle.startsWith('Game #')) return;

    let mounted = true;
    fetch(`${BACKEND_BASE_URL}/api/game/enabled?currency=INR`)
      .then((res) => res.json())
      .then((data) => {
        if (!mounted || !data?.success) return;
        const list = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.data?.message)
          ? data.data.message
          : Array.isArray(data?.data?.games)
          ? data.data.games
          : [];
        const found = list.find((g) => {
          const c = String(g?.id ?? g?.gameCode ?? g?.gameId ?? '');
          return c === resolvedGameId;
        });
        if (found && (found.name || found.title)) {
          const tName = String(found.name || found.title).trim();
          setGameTitle(tName);
          try {
            sessionStorage.setItem(`game_title_${resolvedGameId}`, tName);
          } catch (_) {}
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [resolvedGameId, gameTitle]);

  // Launch game via backend API
  const launchGame = useCallback(async () => {
    if (!resolvedGameId) {
      setError(t('games.invalidGame', { defaultValue: 'Invalid game identifier.' }));
      setLoading(false);
      return;
    }

    const authToken = String(getUserToken() || '').trim();
    if (!authToken) {
      setError(t('games.loginRequired', { defaultValue: 'Please login to play.' }));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/game/launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          gameCode: resolvedGameId,
          gid: resolvedGameId,
          gameId: resolvedGameId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success || !data?.launchUrl) {
        throw new Error(data?.message || 'Failed to launch game');
      }

      setLaunchUrl(String(data.launchUrl));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to launch casino game'));
    } finally {
      setLoading(false);
    }
  }, [resolvedGameId, t]);

  useEffect(() => {
    if (launchUrl) {
      setLoading(false);
      return;
    }
    launchGame();
  }, [launchUrl, launchGame]);

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/games');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex h-[100dvh] w-full flex-col bg-black overflow-hidden select-none">
      {/* Top Header Bar matching user reference image */}
      <div
        className="game-player-bar relative flex h-[28px] sm:h-[30px] w-full shrink-0 items-center justify-between border-b border-white/10 bg-black px-2 sm:px-3 text-white z-50 select-none"
        style={{ visibility: 'visible', minHeight: '28px' }}
      >
        {/* Left: Back button + Game Name */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-[70%]">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded text-white/90 hover:text-white hover:bg-white/10 active:scale-90 transition p-0.5"
            aria-label="Back to games"
          >
            <svg
              className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span
            className="truncate font-bold text-[11px] sm:text-xs uppercase tracking-wide text-white leading-none"
            title={gameTitle}
          >
            {gameTitle}
          </span>
        </div>

        {/* Right: Username + Avatar Icon */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] sm:text-xs font-semibold tracking-wide text-white truncate max-w-[120px] sm:max-w-[200px] leading-none">
            {displayName}
          </span>
          <div
            className="flex h-4 w-4 sm:h-[18px] sm:w-[18px] shrink-0 items-center justify-center rounded-full bg-white text-black shadow-sm overflow-hidden"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5 sm:h-3 sm:w-3">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Game Stage / Iframe */}
      <div className="relative flex-1 w-full bg-black overflow-hidden min-h-0">
        {/* Loading Spinner */}
        {(loading || (!iframeLoaded && launchUrl)) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black gap-3 text-center px-4">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-[#d32f2f]" />
            <p className="text-xs sm:text-sm text-gray-300 font-medium">
              {t('games.opening', { defaultValue: 'Launching game...' })}
            </p>
          </div>
        )}

        {/* Error View */}
        {error && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/95 px-4 text-center">
            <div className="max-w-md rounded-2xl border border-red-500/30 bg-[#1a1112] p-6 shadow-xl text-white">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-500">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-base font-bold text-white mb-1">
                {t('common.error', { defaultValue: 'Game Launch Error' })}
              </h2>
              <p className="text-xs text-gray-400 mb-5">{error}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
                >
                  {t('common.back', { defaultValue: 'Back to Games' })}
                </button>
                <button
                  type="button"
                  onClick={launchGame}
                  className="rounded-xl bg-[#d32f2f] px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition"
                >
                  {t('common.retry', { defaultValue: 'Retry' })}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Casino Game Iframe */}
        {launchUrl && (
          <iframe
            ref={iframeRef}
            title={gameTitle || 'Casino Game'}
            src={launchUrl}
            className="h-full w-full border-0 block bg-black"
            style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; gamepad; accelerometer; gyroscope; screen-wake-lock; orientation"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setIframeLoaded(true)}
          />
        )}
      </div>
    </div>
  );
}
