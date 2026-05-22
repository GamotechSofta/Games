import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../config/api';

const filterByCategory = (games, category) => {
  if (category === 'highEarning') return games.filter((g) => g.highEarning);
  if (category === 'skills' || category === 'upcoming') return games.filter((g) => g.upcoming);
  if (category === 'other') return games.filter((g) => !g.highEarning && !g.upcoming);
  return games;
};

export default function HomeGamesPanel({ category = 'highEarning' }) {
  const { t } = useTranslation();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [launchingGameId, setLaunchingGameId] = useState('');

  const baseApi = useMemo(() => API_BASE_URL.replace(/\/api\/v1\/?$/, ''), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${baseApi}/api/game/list`);
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || 'Failed to load games');
        }
        if (!cancelled) setGames(data.data || []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Unable to fetch games');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baseApi]);

  const filteredGames = useMemo(() => filterByCategory(games, category), [games, category]);

  const pageTitle =
    category === 'highEarning'
      ? t('markets.casinoGames')
      : category === 'skills' || category === 'upcoming'
        ? t('markets.skillsGames')
        : t('games.allGames');

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

  return (
    <section className="mt-2">
      <h2 className="mb-4 text-lg font-bold text-white">{pageTitle}</h2>
      {error && (
        <div className="mb-3 rounded-lg border border-red-700 bg-red-900/40 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {loading ? (
        <div className="text-sm text-gray-300">Loading games...</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
          {filteredGames.map((game) => (
            <div
              key={game._id || game.gameId || game.id}
              className="overflow-hidden rounded-2xl border-2 border-white bg-black shadow-[0_0_8px_rgba(255,255,255,0.3)]"
            >
              <div className="relative aspect-[4/3] bg-black">
                {game.image ? (
                  <img src={game.image} alt={game.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-black">
                    <span className="text-5xl">{game.icon}</span>
                  </div>
                )}
              </div>
              <div className="bg-gray-900 p-3">
                <h3 className="truncate text-sm font-semibold text-white">{game.name}</h3>
                <p className="mt-0.5 text-xs text-gray-400">{game.provider || 'GAP'}</p>
                <button
                  type="button"
                  onClick={() => launchGame(game.gameId || game.id)}
                  disabled={launchingGameId === (game.gameId || game.id)}
                  className="mt-2 w-full rounded bg-yellow-500 py-1.5 text-xs font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
                >
                  {launchingGameId === (game.gameId || game.id)
                    ? 'Launching...'
                    : t('common.play') || 'Play'}
                </button>
              </div>
            </div>
          ))}
          {filteredGames.length === 0 && (
            <div className="col-span-full text-sm text-gray-400">No active games available.</div>
          )}
        </div>
      )}
    </section>
  );
}
