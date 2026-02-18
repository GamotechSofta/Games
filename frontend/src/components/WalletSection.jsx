import React from 'react';
import BannersSection from './BannersSection';
import StarlineCard from './StarlineCard';
import KingBazaarCard from './KingBazaarCard';

const WalletSection = () => {
  return (
    <section className="w-full bg-black pt-2 pb-2 sm:py-4 px-2 min-[375px]:px-4 sm:px-6 max-w-full overflow-x-hidden">
      <BannersSection />

      <div className="mt-4 min-[375px]:mt-6 sm:mt-8 grid grid-cols-2 gap-2 min-[375px]:gap-3 sm:gap-4 max-w-lg mx-auto">
        <StarlineCard />
        <KingBazaarCard />
      </div>
    </section>
  );
};

export default WalletSection;
