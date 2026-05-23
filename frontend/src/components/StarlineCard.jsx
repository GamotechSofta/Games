import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const STARLINE_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771486283/Black_and_White_Vintage_Star_Company_Logo_nbhlfi.png';

const StarlineCard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <button
      onClick={() => navigate('/startline-dashboard')}
      className="group relative rounded-2xl sm:rounded-3xl bg-white dark:bg-black overflow-hidden w-full text-left active:scale-95 transition-all duration-200 border-2 border-[#D32F2F] shadow-[0_0_8px_rgba(211,47,47,0.25)] hover:border-[#e60000] hover:shadow-[0_0_12px_rgba(211,47,47,0.4)] dark:border-[#e60000] dark:shadow-[0_0_10px_rgba(230,0,0,0.35)]"
    >
      <div className="flex items-center gap-2 min-[375px]:gap-2.5 sm:gap-4 py-3 px-3 min-[375px]:py-4 min-[375px]:px-4 sm:py-2.5 sm:px-4">
        <div className="h-9 w-9 min-[375px]:h-10 min-[375px]:w-10 sm:h-14 sm:w-14 rounded-lg min-[375px]:rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-gray-50 dark:bg-black">
          <img
            src={STARLINE_IMAGE_URL}
            alt="Starline"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <p className="text-gray-900 dark:text-white text-xs min-[375px]:text-sm sm:text-lg md:text-xl font-bold uppercase leading-tight tracking-wide">
            {t('markets.starline')}
          </p>
          <p className="text-amber-400/90 text-[9px] min-[375px]:text-[10px] sm:text-xs font-semibold mt-0.5">{t('markets.tapToPlay')}</p>
        </div>
      </div>
    </button>
  );
};

export default StarlineCard;
