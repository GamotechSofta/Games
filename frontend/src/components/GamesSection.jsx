import React from 'react';
import { useTranslation } from 'react-i18next';
import { GAMES } from '../config/games';

const GamesSection = () => {
  const { t } = useTranslation();
  const gamesToShow = GAMES;

  if (!gamesToShow?.length) return null;

  const handleGameClick = (game) => {
    if (game.external && game.url) {
      window.open(game.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section className="w-full bg-black pt-2 pb-6 sm:pt-3 sm:pb-8 max-w-full overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        {/* Section header - orange-yellow tab (parallelogram style) */}
        <div className="mb-3 sm:mb-4">
          <div
            className="inline-block bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 px-5 sm:px-6 py-2 sm:py-2.5 rounded-sm shadow-[0_2px_8px_rgba(212,175,55,0.3)]"
            style={{ transform: 'skewX(-8deg)' }}
          >
            <h2
              className="text-white text-sm sm:text-base font-bold tracking-wider uppercase"
              style={{ transform: 'skewX(8deg)' }}
            >
              {t('games.otherGames')}
            </h2>
          </div>
        </div>

        <div
          className="grid grid-rows-2 grid-flow-col overflow-x-auto md:overflow-visible pb-2 -mx-3 sm:-mx-4 md:mx-0 px-3 sm:px-4 md:px-0 scroll-smooth scrollbar-hidden md:grid-flow-row md:grid-cols-6 gap-2 sm:gap-3 md:gap-4"
          style={{ gridAutoColumns: 'minmax(120px, 150px)' }}
        >
          {gamesToShow.map((game) => {
            const isUpcoming = game.upcoming || !game.url;
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => !isUpcoming && handleGameClick(game)}
                disabled={isUpcoming}
                className={`group block text-left w-full ${
                  isUpcoming
                    ? 'opacity-75 cursor-default'
                    : 'hover:[&_.game-card]:border-white/40 active:scale-[0.98] cursor-pointer'
                }`}
              >
                <div
                  className={`game-card relative rounded-xl overflow-hidden h-[56px] min-[375px]:h-[64px] sm:h-[80px] w-full border-2 border-white transition-all duration-200 ${
                    isUpcoming
                      ? 'bg-black'
                      : 'bg-[#1a1a1a]'
                  }`}
                >
                  {/* Image / content */}
                  <div className="absolute inset-0">
                    {game.image ? (
                      <img
                        src={game.image}
                        alt={game.name}
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div
                        className={`w-full h-full flex flex-col items-center justify-center ${
                          isUpcoming
                            ? 'bg-black'
                            : 'bg-gradient-to-br from-slate-800 to-slate-900'
                        }`}
                      >
                        <span
                          className={`${
                            isUpcoming ? 'text-3xl sm:text-4xl drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]' : 'text-4xl sm:text-5xl'
                          }`}
                        >
                          {game.icon}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom gradient overlay + title (like reference cards) */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pt-14 pb-2.5 px-2.5 sm:px-3">
                    <p className="text-white text-xs sm:text-sm font-bold uppercase leading-tight tracking-wide line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {isUpcoming ? t('games.comingSoon') : game.name}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default GamesSection;
