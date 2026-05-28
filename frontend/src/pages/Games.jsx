import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config/api';
import { iconBtn, textPrimary } from '../styles/appTheme';

const Games = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const category = searchParams.get('category') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [launchingGameId, setLaunchingGameId] = useState('');

  const baseApi = useMemo(() => API_BASE_URL.replace(/\/api\/v1\/?$/, ''), []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${baseApi}/api/game/list`);
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || 'Failed to load games');
        }
        setGames(data.data || []);
      } catch (e) {
        setError(e.message || 'Unable to fetch games');
      } finally {
        setLoading(false);
      }
    })();
  }, [baseApi]);

  const filteredGames = useMemo(() => {
    let list = games;
    if (category === 'highEarning') list = list.filter((g) => g.highEarning);
    else if (category === 'upcoming') list = list.filter((g) => g.upcoming);
    else if (category === 'other') list = list.filter((g) => !g.highEarning && !g.upcoming);

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter((g) => {
      const name = (g.name || g.title || '').toLowerCase();
      const desc = (g.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [games, category, searchQuery]);

  const launchGame = async (gameId) => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (!currentUser?._id && !currentUser?.id) {
      setError('Please login first');
      return;
    }

    setLaunchingGameId(gameId);
    setError('');
    const res = await fetch(`${baseApi}/api/game/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser._id || currentUser.id,
        gameId,
      }),
    });

    const data = await res.json();
    if (data.success && data.launchUrl) {
      window.open(data.launchUrl, '_blank');
    } else {
      setError(data?.message || 'Failed to launch game');
    }
    setLaunchingGameId('');
  };

  const handleGameClick = (game) => {
    launchGame(game.gameId || game.id).catch((e) => {
      setError(e.message || 'Failed to launch game');
      setLaunchingGameId('');
    });
  };

  const pageTitle =
    category === 'highEarning'
      ? t('markets.casinoGames')
      : category === 'upcoming'
        ? t('markets.skillsGames')
        : t('games.allGames');

  return (
    <div className="w-full text-gray-900 dark:text-white px-3 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`w-10 h-10 flex items-center justify-center ${iconBtn}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className={`text-xl font-bold ${textPrimary}`}>
          {pageTitle}
        </h1>
      </div>
      {error && (
        <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/40 dark:border-red-700 dark:text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Games Grid */}
      {loading ? (
        <div className="text-gray-500 dark:text-gray-300 text-sm">Loading games...</div>
      ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {filteredGames.map((game) => (
          <div
            key={game._id || game.gameId || game.id}
            className="rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-white shadow-md dark:shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all bg-white dark:bg-black"
          >
            {/* Game Image */}
            <div className="relative aspect-[4/3] bg-gray-100 dark:bg-black">
              {game.image ? (
                <img
                  src={game.image}
                  alt={game.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-black">
                  <span className="text-5xl">{game.icon}</span>
                </div>
              )}
            </div>

            {/* Game Info */}
            <div className="p-3 bg-gray-50 dark:bg-gray-900">
              <h3 className={`text-sm font-semibold truncate ${textPrimary}`}>
                {game.name}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                {game.provider || 'GAP'}
              </p>
              <button
                type="button"
                onClick={() => handleGameClick(game)}
                disabled={launchingGameId === (game.gameId || game.id)}
                className="mt-2 w-full py-1.5 rounded bg-yellow-500 text-black text-xs font-semibold hover:bg-yellow-400 disabled:opacity-60"
              >
                {launchingGameId === (game.gameId || game.id) ? 'Launching...' : (t('common.play') || 'Play')}
              </button>
            </div>
          </div>
        ))}
        {filteredGames.length === 0 && (
          <p className="col-span-full text-center text-gray-500 dark:text-gray-400 py-8">No games found</p>
        )}
      </div>
      )}
    </div>
  );
};

export default Games;
