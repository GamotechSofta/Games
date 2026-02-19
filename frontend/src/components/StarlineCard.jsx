import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const STARLINE_IMAGE_URL = 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771484988/Black_and_White_Vintage_Star_Company_Logo_u2f6mb.png';

const StarlineCard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <button
      onClick={() => navigate('/startline-dashboard')}
      className="group relative rounded-2xl sm:rounded-3xl bg-black overflow-hidden w-full text-left active:scale-95 transition-all duration-200 border-2 border-amber-500 hover:border-amber-400"
    >
      <div className="flex items-center gap-2 min-[375px]:gap-3 sm:gap-5 p-2 min-[375px]:p-3 sm:p-5">
        <div className="h-10 w-10 min-[375px]:h-12 min-[375px]:w-12 sm:h-20 sm:w-20 rounded-lg min-[375px]:rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-black">
          <img
            src={STARLINE_IMAGE_URL}
            alt="Starline"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <p className="text-white text-xs min-[375px]:text-sm sm:text-lg md:text-xl font-bold uppercase leading-tight tracking-wide">
            {t('markets.starline')}
          </p>
          <p className="text-amber-400/90 text-[9px] min-[375px]:text-[10px] sm:text-sm font-semibold mt-0.5 min-[375px]:mt-1">{t('markets.tapToPlay')}</p>
        </div>
      </div>
    </button>
  );
};

export default StarlineCard;
