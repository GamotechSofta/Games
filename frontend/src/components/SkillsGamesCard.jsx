import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SKILLS_BG_IMAGE_URL = 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771608382/Yellow_and_Brown_Illustrated_Dice_Casino_Logo_2_n2nfdl.png';

const SkillsGamesCard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <button
      onClick={() => navigate('/games?category=all')}
      className="group relative rounded-2xl sm:rounded-3xl overflow-hidden w-full text-left active:scale-95 transition-all duration-200 border-2 border-white hover:border-white/90 bg-black bg-cover bg-center"
      style={{ backgroundImage: `url(${SKILLS_BG_IMAGE_URL})` }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative flex items-center gap-2 min-[375px]:gap-2.5 sm:gap-4 py-1.5 px-2 min-[375px]:py-2 min-[375px]:px-3 sm:py-2.5 sm:px-4">
        <div className="flex flex-col min-w-0 flex-1">
          <p className="text-white text-xs min-[375px]:text-sm sm:text-lg md:text-xl font-bold uppercase leading-tight tracking-wide">
            {t('markets.skillsGamesLine1')}
          </p>
          <p className="text-white text-xs min-[375px]:text-sm sm:text-lg md:text-xl font-bold uppercase leading-tight tracking-wide">
            {t('markets.skillsGamesLine2')}
          </p>
        </div>
      </div>
    </button>
  );
};

export default SkillsGamesCard;
