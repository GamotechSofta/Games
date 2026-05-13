import React from 'react';
import { useTranslation } from 'react-i18next';
import BannersSection from './BannersSection';
import CasinoGamesCard from './CasinoGamesCard';
import SkillsGamesCard from './SkillsGamesCard';
import StarlineCard from './StarlineCard';
import KingBazaarCard from './KingBazaarCard';

const WalletSection = () => {
  const { t } = useTranslation();

  return (
    <section className="w-full bg-black pt-0 pb-1 sm:pb-3 sm:pt-0 max-w-full overflow-x-hidden">
      <BannersSection />

      <div className="px-2 min-[375px]:px-4 sm:px-6">
      {/* Other Games section title - Markets-style design (mobile only) */}
      <div className="md:hidden flex items-center justify-center mt-4 min-[375px]:mt-5 sm:mt-6 mb-4 min-[375px]:mb-5 sm:mb-6 w-full max-w-lg mx-auto gap-1 min-[375px]:gap-2 sm:gap-4">
        <div className="flex-1 h-[2px] bg-white shrink min-w-0" />
        <div className="flex items-center gap-2 shrink-0">
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 0l1.8 4.2L12 6l-4.2 1.8L6 12l-1.8-4.2L0 6l4.2-1.8z"/>
          </svg>
          <h2 className="text-white text-sm min-[375px]:text-base sm:text-xl font-bold tracking-[0.15em] uppercase">
            {t('games.otherGames').toUpperCase()}
          </h2>
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 0l1.8 4.2L12 6l-4.2 1.8L6 12l-1.8-4.2L0 6l4.2-1.8z"/>
          </svg>
        </div>
        <div className="flex-1 h-[2px] bg-white shrink min-w-0" />
      </div>

      <div className="grid grid-cols-2 gap-2 min-[375px]:gap-3 sm:gap-4 max-w-lg mx-auto">
        <CasinoGamesCard />
        <SkillsGamesCard />
        <StarlineCard />
        <KingBazaarCard />
      </div>
      </div>
    </section>
  );
};

export default WalletSection;
