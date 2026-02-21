import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GAMES } from '../config/games';

const PROVIDER_NAME = 'DPBOSS KING';

const Games = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const category = searchParams.get('category') || 'all';

  const filteredGames = GAMES.filter((game) => {
    if (category === 'highEarning') return game.highEarning;
    if (category === 'upcoming') return game.upcoming;
    if (category === 'other') return !game.highEarning && !game.upcoming;
    return true;
  });

  const handleGameClick = (game) => {
    if (game.upcoming) return;
    if (game.url) {
      window.open(game.url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-black px-3 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white text-xl font-bold">
          {category === 'highEarning' ? 'Casino Games' : category === 'upcoming' ? 'Skills Games' : 'All Games'}
        </h1>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {filteredGames.map((game) => (
          <div
            key={game.id}
            onClick={() => handleGameClick(game)}
            className={`rounded-2xl overflow-hidden border-2 border-white shadow-[0_0_8px_rgba(255,255,255,0.3)] hover:shadow-[0_0_12px_rgba(255,255,255,0.4)] transition-all bg-black ${
              game.upcoming ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'
            }`}
          >
            {/* Game Image */}
            <div className="relative aspect-[4/3] bg-black">
              {game.image ? (
                <img
                  src={game.image}
                  alt={game.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black">
                  <span className="text-5xl">{game.icon}</span>
                </div>
              )}
              {/* Coming Soon badge */}
              {game.upcoming && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <span className="text-amber-400 text-xs font-bold px-2 py-1 bg-black/80 rounded">Coming Soon</span>
                </div>
              )}
            </div>

            {/* Game Info */}
            <div className="p-3 bg-gray-900">
              <h3 className="text-white text-sm font-semibold truncate">
                {game.name}
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">
                {PROVIDER_NAME}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Games;
