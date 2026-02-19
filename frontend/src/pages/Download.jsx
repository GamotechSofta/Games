import React from 'react';
import { useTranslation } from 'react-i18next';

const Download = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#d4af37]">{t('header.downloadApp')}</h1>
      <p className="mt-4 text-xl sm:text-2xl font-semibold text-white">{t('games.comingSoon')}</p>
    </div>
  );
};

export default Download;
