import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../config/api';

const KING_BAZAAR_IMAGE_URL =
  'https://res.cloudinary.com/dzd47mpdo/image/upload/v1770641576/Untitled_1080_x_1080_px_1_gyjbpl.svg';

export default function HomeKingBazaarPanel() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <section className="mt-2">
      <h2 className="mb-4 text-lg font-bold text-white">{t('markets.kingBazaar')}</h2>
      <p className="mb-6 text-sm text-white/60">{t('kingBazaarMarket.selectTimeSlot')}</p>
      <button
        type="button"
        onClick={() => navigate('/king-bazaar-market')}
        className="group flex w-full max-w-md items-center gap-4 rounded-2xl border-2 border-amber-500 bg-black p-5 transition-all hover:border-amber-400 active:scale-[0.98]"
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black">
          <img src={KING_BAZAAR_IMAGE_URL} alt={t('markets.kingBazaar')} className="h-full w-full object-contain" />
        </div>
        <div className="text-left">
          <h3 className="text-lg font-bold uppercase tracking-wide text-white">{t('markets.kingBazaar')}</h3>
          <p className="mt-1 text-sm font-semibold text-amber-400/90">{t('markets.tapToPlay')}</p>
          {!loading && (
            <p className="mt-2 text-xs text-white/50">{t('kingBazaarMarket.pageTitle')}</p>
          )}
        </div>
        <span className="ml-auto text-white/40 transition group-hover:text-white/70">→</span>
      </button>
    </section>
  );
}
