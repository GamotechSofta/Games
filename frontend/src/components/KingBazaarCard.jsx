import React from 'react';
import { useNavigate } from 'react-router-dom';

const KingBazaarCard = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/king-bazaar-dashboard')}
      className="group relative rounded-lg min-[375px]:rounded-xl sm:rounded-2xl bg-[#1a1a1a] p-2 min-[375px]:p-3 sm:p-4 md:p-5 text-left shadow-[0_4px_12px_rgba(0,0,0,0.4)] border border-white/10 hover:border-purple-500/30 hover:bg-[#222] active:scale-95 transition-all duration-200 w-full"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-[375px]:gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="h-8 w-8 min-[375px]:h-9 min-[375px]:w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#e8e1ff] to-[#d4c5ff] text-[#4a3c9a] flex items-center justify-center text-base min-[375px]:text-lg sm:text-xl md:text-2xl shadow-[0_4px_12px_rgba(232,225,255,0.4)] shrink-0">
            🎲
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-white text-[11px] min-[375px]:text-xs sm:text-sm md:text-base font-bold leading-tight whitespace-normal break-words">
              KING BAZAAR
            </p>
            <p className="text-[#f2c14e] text-[9px] min-[375px]:text-[10px] sm:text-xs font-semibold animate-pulse drop-shadow-[0_0_6px_rgba(242,193,78,0.6)] mt-0.5">Tap to Play</p>
          </div>
        </div>
        <span className="text-white/30 text-lg sm:text-xl group-hover:text-purple-500/60 transition-colors shrink-0">›</span>
      </div>
    </button>
  );
};

export default KingBazaarCard;
