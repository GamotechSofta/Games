import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaDice, FaGamepad, FaSearch, FaTimes, FaLayerGroup } from 'react-icons/fa';
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

const CATEGORIES = [
  { id: 'ALL', labelKey: 'games.allGames', fallback: 'All' },
  { id: 'SLOTS', labelKey: 'games.slots', fallback: 'Slots' },
  { id: 'LIVE', labelKey: 'games.liveCasino', fallback: 'Live Casino' },
  { id: 'VIRTUAL', labelKey: 'games.virtual', fallback: 'Virtual' },
  { id: 'CRASH', labelKey: 'games.crash', fallback: 'Crash' },
  { id: 'LOTTERY', labelKey: 'games.lottery', fallback: 'Lottery' },
];

const Games = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [launchingId, setLaunchingId] = useState('');
  const [activeGame, setActiveGame] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [visibleCount, setVisibleCount] = useState(100);

  const loadGames = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/game/enabled`);
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to load games');
      }

      // Robust extraction: handles data.data as an array, or data.data.message / data.data.games object
      const rawList = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.data?.message)
        ? data.data.message
        : Array.isArray(data?.data?.games)
        ? data.data.games
        : Array.isArray(data?.message)
        ? data.message
        : [];

      const normalized = rawList.map((game, index) => {
        const code = String(game?.id ?? game?.gameCode ?? game?.gameId ?? index);
        const thumb = String(game?.media || game?.thumbnail || game?.image || '').trim();
        const providerName =
          game?.provider_details?.name ||
          game?.provider ||
          'Casino';
        const typeRaw = String(game?.type || '').toUpperCase();

        let category = 'OTHER';
        if (typeRaw.includes('SLOT')) category = 'SLOTS';
        else if (typeRaw.includes('LIVE')) category = 'LIVE';
        else if (typeRaw.includes('VIRTUAL')) category = 'VIRTUAL';
        else if (typeRaw.includes('LOTTERY')) category = 'LOTTERY';
        else if (typeRaw.includes('CRASH')) category = 'CRASH';
        else if (typeRaw.includes('TABLE')) category = 'TABLE';

        return {
          ...game,
          _key: `${code}_${index}`,
          id: game?.id ?? code,
          gameCode: code,
          gameId: code,
          name: game?.name || game?.title || `Game #${code}`,
          thumbnail: thumb,
          image: thumb,
          provider: providerName,
          category,
          type: typeRaw || 'CASINO',
        };
      });

      setGames(normalized);
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

  // Sync searchQuery with URL param if updated from navigation
  useEffect(() => {
    const urlQ = searchParams.get('q');
    if (urlQ != null && urlQ !== searchQuery) {
      setSearchQuery(urlQ);
    }
  }, [searchParams]);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setVisibleCount(100);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (val.trim()) next.set('q', val.trim());
        else next.delete('q');
        return next;
      },
      { replace: true }
    );
  };

  const handleCategoryChange = (catId) => {
    setSelectedCategory(catId);
    setVisibleCount(100);
  };

  const selectedProvider = searchParams.get('provider') || '';

  const handleClearProvider = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('provider');
        return next;
      },
      { replace: true }
    );
    setVisibleCount(100);
  };

  const filteredGames = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const provFilter = selectedProvider.trim().toLowerCase();

    return games.filter((g) => {
      if (provFilter) {
        const provName = (g.provider || '').toLowerCase();
        const provCode = (g.provider_details?.code || '').toLowerCase();
        if (
          provName !== provFilter &&
          provCode !== provFilter &&
          !provName.includes(provFilter) &&
          !provFilter.includes(provName)
        ) {
          return false;
        }
      }
      const matchCat = selectedCategory === 'ALL' || g.category === selectedCategory;
      if (!matchCat) return false;
      if (!query) return true;
      const nameMatch = (g.name || '').toLowerCase().includes(query);
      const provMatch = (g.provider || '').toLowerCase().includes(query);
      return nameMatch || provMatch;
    });
  }, [games, selectedCategory, searchQuery, selectedProvider]);

  const displayedGames = useMemo(() => {
    return filteredGames.slice(0, visibleCount);
  }, [filteredGames, visibleCount]);

  const closeGame = useCallback(() => {
    setActiveGame(null);
  }, []);

  const handlePlay = async (game) => {
    const authToken = String(getUserToken() || '').trim();
    if (!authToken) {
      setError(t('games.loginRequired', { defaultValue: 'Please login to play.' }));
      return;
    }
    const gameCode = String(game?.gameCode || game?.gameId || game?.id || '').trim();
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
    <div className="w-full text-gray-900 dark:text-white px-3 py-4 min-h-[50vh] flex flex-col max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
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
          <div>
            <h1 className={`text-xl font-bold ${textPrimary}`}>
              {t('sidebar.games', { defaultValue: 'Casino Games' })}
            </h1>
            {!loading && games.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {games.length.toLocaleString()} {t('games.available', { defaultValue: 'games available' })}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons and Search input */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-md justify-end">
          <button
            type="button"
            onClick={() => navigate('/providers')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-800 dark:text-white transition"
          >
            <FaLayerGroup className="text-xs text-[#d32f2f]" />
            <span>{t('providers.title', { defaultValue: 'Providers' })}</span>
          </button>

          <div className="relative flex-1 min-w-[180px]">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('common.search', { defaultValue: 'Search games or providers...' })}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c] pl-9 pr-8 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#d32f2f]/50 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <FaTimes className="text-xs" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Provider filter banner */}
      {selectedProvider && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-red-500/15 to-red-500/5 border border-red-500/30 px-3.5 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-500 dark:text-gray-400">
              {t('providers.filteringBy', { defaultValue: 'Provider:' })}
            </span>
            <span className="font-bold text-[#d32f2f] dark:text-[#ff726b] text-sm">
              {selectedProvider}
            </span>
            <span className="rounded-full bg-[#d32f2f] text-white px-2 py-0.5 text-[10px] font-bold">
              {filteredGames.length} {t('sidebar.games', { defaultValue: 'games' })}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearProvider}
            className="flex items-center gap-1 font-semibold text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition"
          >
            <FaTimes className="text-xs" />
            <span>{t('common.clear', { defaultValue: 'Clear' })}</span>
          </button>
        </div>
      )}

      {/* Category Pills */}
      {!loading && games.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hidden">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition active:scale-95 ${
                  active
                    ? 'bg-[#d32f2f] text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15'
                }`}
              >
                {t(cat.labelKey, { defaultValue: cat.fallback })}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-gray-200/80 animate-pulse dark:bg-white/10"
            />
          ))}
        </div>
      ) : displayedGames.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center px-4 py-12">
          <FaGamepad className="mb-3 h-10 w-10 text-gray-400 dark:text-white/30" />
          <p className="text-lg font-semibold text-gray-700 dark:text-white/80">
            {searchQuery
              ? t('games.noSearchResults', { defaultValue: 'No games match your search' })
              : t('games.noneAvailable', { defaultValue: 'No games available yet' })}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            {searchQuery
              ? t('games.tryDifferentSearch', { defaultValue: 'Try searching for another game title or provider.' })
              : t('games.noneAvailableProviderHint', {
                  defaultValue: 'No enabled games returned for this operator yet.',
                })}
          </p>
          {searchQuery ? (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="mt-4 rounded-xl bg-gray-200 dark:bg-white/10 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-white"
            >
              {t('common.clearSearch', { defaultValue: 'Clear Search' })}
            </button>
          ) : (
            <button
              type="button"
              onClick={loadGames}
              className="mt-4 rounded-xl bg-[#d32f2f] px-4 py-2 text-sm font-semibold text-white"
            >
              {t('common.retry', { defaultValue: 'Retry' })}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {displayedGames.map((game) => {
              const code = game.gameCode || game.gameId || game.id;
              const busy = launchingId === String(code);
              const thumb = String(game.thumbnail || game.image || '').trim();
              return (
                <button
                  key={game._key || code}
                  type="button"
                  disabled={busy}
                  onClick={() => handlePlay(game)}
                  className="group relative overflow-hidden rounded-2xl border border-gray-200 text-left shadow-sm transition hover:shadow-md  disabled:opacity-60 dark:border-white/10 dark:bg-[#1a1a1c] flex flex-col justify-between"
                >
                  <div className="relative flex  w-full items-center justify-center overflow-hidden rounded-xl">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={game.name || String(code)}
                        className="h-full aspect-[4/3] w-full object-cover rounded-xl"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                    ) : null}

                    {/* <FaDice
                      className={`h-10 w-10 text-[#f0c27a] ${thumb ? 'hidden' : ''}`}
                      aria-hidden={Boolean(thumb)}
                    /> */}
                    {game.type && (
                      <span className="absolute top-2 left-2 rounded-md bg-black/60 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                        {game.type}
                      </span>
                    )}
                  </div>

                  <div className="hidden min-w-0 mt-2">
                    <p className="truncate text-xs sm:text-sm font-bold text-gray-900 dark:text-white" title={game.name}>
                      {game.name || code}
                    </p> 
                    <p className="truncate text-[10px] text-gray-500 dark:text-white/45">
                      {game.provider || code}
                    </p>
                  </div>

                  <span className="hidden mt-2 w-full text-center rounded-lg bg-[#d32f2f] hover:bg-[#b71c1c] py-1.5 text-[11px] font-semibold text-white transition">
                    {busy
                      ? t('games.opening', { defaultValue: 'Opening...' })
                      : t('games.play', { defaultValue: 'Play' })}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Load More Button - loads next 100 games */}
          {visibleCount < filteredGames.length && (
            <div className="mt-8 flex flex-col items-center gap-2 pb-8">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 100)}
                className="rounded-xl border border-gray-300 dark:border-white/20 bg-white dark:bg-[#1a1a1c] px-6 py-2.5 text-sm font-semibold text-gray-900 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.98] transition"
              >
                {t('games.loadMore', {
                  defaultValue: `Load Next 100 Games (${displayedGames.length} of ${filteredGames.length.toLocaleString()})`,
                })}
              </button>
            </div>
          )}
        </>
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
