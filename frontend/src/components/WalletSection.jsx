import React from 'react';
import BannersSection from './BannersSection';
import StarlineCard from './StarlineCard';
import KingBazaarCard from './KingBazaarCard';

const WalletSection = () => {
  return (
    <section className="w-full bg-black pt-1.5 pb-1 sm:pb-3 sm:pt-4 px-2 min-[375px]:px-4 sm:px-6 max-w-full overflow-x-hidden">
      <BannersSection />

      <div className="mt-4 min-[375px]:mt-5 sm:mt-6 grid grid-cols-2 gap-2 min-[375px]:gap-3 sm:gap-4 max-w-lg mx-auto">
        <StarlineCard />
        <KingBazaarCard />
      </div>
    </section>
  );
};

export default WalletSection;
