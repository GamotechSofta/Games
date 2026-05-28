import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiMiniArrowRight } from 'react-icons/hi2';
import { API_BASE_URL } from '../../config/api';
import { GAMES } from '../../config/games';
import { HOME_QUICK_LINKS } from '../../config/homeAssets';
import { useTheme } from '../../context/ThemeContext';
import useGameList from '../../hooks/useGameList';
  
const filterByCategory = (games, category) => {
  if (category === 'highEarning') return games.filter((g) => g.highEarning);
  if (category === 'skills' || category === 'upcoming') return games.filter((g) => g.upcoming);
  if (category === 'other') return games.filter((g) => !g.highEarning && !g.upcoming);
  return games;
};

const TOP_GAME_TILES = [
  {
    id: 'aviator',
    title: 'Aviator',
    provider: 'Spribe',
    image: GAMES.find((game) => game.id === 'aviator')?.image || null,
    bg: 'from-[#20060a] via-[#4d0f1f] to-[#0d0608]',
    icon: '✈',
  },
  {
    id: 'andar-bahar',
    title: 'Andar Bahar',
    provider: 'Aakda',
    image: null,
    bg: 'from-[#5b0f19] via-[#8f1b1f] to-[#22100e]',
    icon: 'A♠',
  },
  {
    id: 'teen-patti',
    title: 'Teen Patti',
    provider: 'Aakda',
    image: null,
    bg: 'from-[#4f123d] via-[#8b5cf6] to-[#1f1147]',
    icon: '3',
  },
  {
    id: 'ludo',
    title: 'Ludo',
    provider: 'Aakda',
    image: null,
    bg: 'from-[#0f4c81] via-[#1d78ff] to-[#20104a]',
    icon: '🎲',
  },
  {
    id: 'king-bazaar',
    title: 'King Bazaar',
    provider: 'Aakda',
    image: HOME_QUICK_LINKS.kingBazaar.webp,
    bg: 'from-[#2e2008] via-[#7c5310] to-[#160f05]',
    icon: '♛',
  },
];

const isAviatorGame = (game) => {
  const id = (game?.id || game?.gameId || '').toString().trim().toLowerCase();
  const title = (game?.title || game?.name || '').toString().trim().toLowerCase();
  return id === 'aviator' || title === 'aviator';
};

const placeAviatorFirst = (games) => {
  const aviatorGames = games.filter((game) => isAviatorGame(game));
  const otherGames = games.filter((game) => !isAviatorGame(game));
  return [...aviatorGames, ...otherGames];
};

function GamesSectionHeader({ title, actionLabel, onAction, isLight }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="grid grid-cols-2 gap-1">
          {[0, 1, 2, 3].map((dot) => (
            <span
              key={dot}
              className={`h-2.5 w-2.5 rounded-[4px] ${isLight ? 'bg-gray-400' : 'bg-white/85'}`}
            />
          ))}
        </span>
        <h2 className={`text-[15px] font-extrabold tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
          {title}
        </h2>
      </div>
      <button
        type="button"
        onClick={onAction}
        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold transition active:scale-[0.98] ${
          isLight
            ? 'bg-[#2a2b2f] text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]'
            : 'bg-[#2a2a2e] text-white shadow-[0_10px_26px_rgba(0,0,0,0.34)]'
        }`}
      >
        <span>{actionLabel}</span>
        <HiMiniArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function TopGameCard({ game, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-[130px] shrink-0 overflow-hidden rounded-[16px] bg-[#18191d] shadow-[0_12px_28px_rgba(0,0,0,0.28)] transition active:scale-[0.98]"
    >
      <div className={`relative h-[174px] overflow-hidden bg-gradient-to-br ${game.bg}`}>
        {game.image ? (
          <img
            src={game.image}
            alt={game.title}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-active:scale-[1.01]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[34px] font-black text-white/95">
            {game.icon}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/18 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-3 pb-2.5 pt-8 text-left">
          <div className="line-clamp-2 text-[10px] font-black uppercase leading-[1.02] tracking-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
            {game.title}
          </div>
          <div className="mt-2 text-center text-[8px] font-semibold uppercase tracking-[0.16em] text-white/72">
            {game.provider || 'Aakda'}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function HomeGamesPanel({ category = 'highEarning', titleOverride = '' }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isLight } = useTheme();
  const [launchingGameId, setLaunchingGameId] = useState('');
  const { games, loading, error } = useGameList();
  const baseApi = useMemo(() => API_BASE_URL.replace(/\/api\/v1\/?$/, ''), []);

  const filteredGames = useMemo(() => filterByCategory(games, category), [games, category]);

  const pageTitle =
    titleOverride ||
    (category === 'highEarning'
      ? t('markets.casinoGames')
      : category === 'skills' || category === 'upcoming'
        ? t('markets.skillsGames')
        : t('games.allGames'));

  const topGames = useMemo(
    () =>
      filteredGames.length
        ? placeAviatorFirst(filteredGames.filter((game) => game?.image || game?.icon || game?.name))
            .slice(0, 8)
            .map((game, index) => ({
                id: game._id || game.gameId || game.id || game.name || `game-${index}`,
                title: game.name || game.title || 'Game',
                provider: game.provider || 'Aakda',
                image: game.image || null,
                bg:
                  TOP_GAME_TILES[index % TOP_GAME_TILES.length]?.bg ||
                  'from-[#18181b] via-[#27272a] to-[#0f0f10]',
                icon: game.icon || '🎮',
              }))
        : placeAviatorFirst(
            TOP_GAME_TILES.map((game) => {
              const mappedGame = GAMES.find((entry) => entry.id === game.id);
              return mappedGame ? { ...game, image: mappedGame.image || game.image } : game;
            }),
          ),
    [filteredGames],
  );

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

  if (category === 'all') {
    return (
      <section className="mt-2">
        <GamesSectionHeader
          title={pageTitle}
          actionLabel={pageTitle}
          onAction={() => navigate('/games')}
          isLight={isLight}
        />
        {error && (
          <div className="mb-3 rounded-lg border border-red-700 bg-red-900/40 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
        <div className="scrollbar-hidden flex gap-2.5 overflow-x-auto pb-1">
          {topGames.map((game) => (
            <TopGameCard key={game.id} game={game} onClick={() => navigate('/games')} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-2">
      <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">{pageTitle}</h2>
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
                  <img src={game.image} alt={game.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-black">
                    <span className="text-5xl">{game.icon}</span>
                  </div>
                )}
              </div>
              <div className="bg-gray-900 p-3">
                <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{game.name}</h3>
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
