import React from 'react';
import { GAMES } from '../config/games';
import { useBreakpoint } from '../hooks/useBreakpoint';

const GamesSection = () => {
  const { isDesktop } = useBreakpoint();
  const gamesToShow = isDesktop ? GAMES : GAMES.filter((g) => !g.desktopOnly);

  if (!gamesToShow?.length) return null;

  const handleGameClick = (game) => {
    if (game.external && game.url) {
      window.open(game.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section className="w-full bg-black py-6 sm:py-8 px-3 sm:px-4 md:px-6 max-w-full overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-4 sm:mb-5">
          <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent" />
          <h2 className="text-white text-base sm:text-lg font-bold tracking-wider uppercase shrink-0">
            Other Games
          </h2>
          <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-[#d4af37]/50 to-transparent" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
          {gamesToShow.map((game) => {
            const isUpcoming = game.upcoming || !game.url;
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => !isUpcoming && handleGameClick(game)}
                disabled={isUpcoming}
                className={`group flex flex-col items-center text-left ${
                  isUpcoming
                    ? 'opacity-75 cursor-default'
                    : 'hover:[&_.game-card]:border-amber-500/40 hover:[&_.game-card]:bg-[#222] active:scale-[0.98] cursor-pointer'
                }`}
              >
                <div
                  className={`game-card relative rounded-xl sm:rounded-2xl aspect-[4/3] min-h-[100px] sm:min-h-[120px] md:min-h-[90px] w-full shadow-[0_4px_12px_rgba(0,0,0,0.4)] overflow-hidden transition-all duration-200 ${
                    isUpcoming
                      ? 'bg-gradient-to-br from-slate-800/90 via-amber-950/30 to-slate-900 border border-amber-500/20'
                      : 'bg-[#1a1a1a] border border-white/10'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 ${!isUpcoming && 'group-hover:opacity-100'} transition-opacity`} />
                  {isUpcoming && (
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
                  )}
                  <div className="absolute inset-0">
                    {game.image ? (
                      <img
                        src={game.image}
                        alt={game.name}
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className={`w-full h-full flex flex-col items-center justify-center gap-1 sm:gap-2 ${
                        isUpcoming
                          ? 'bg-gradient-to-br from-slate-800 via-amber-950/40 to-slate-900'
                          : ''
                      }`}>
                        <span className={`${isUpcoming ? 'text-3xl sm:text-4xl md:text-3xl drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]' : 'text-4xl sm:text-5xl'}`}>
                          {game.icon}
                        </span>
                        {isUpcoming && (
                          <span className="text-amber-400/90 text-[10px] sm:text-xs font-semibold tracking-wider uppercase">
                            Coming Soon
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {!isUpcoming && (
                  <p className="text-amber-400 text-[11px] sm:text-sm font-semibold mt-1.5 sm:mt-2 text-center w-full">Tap to Play</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default GamesSection;
