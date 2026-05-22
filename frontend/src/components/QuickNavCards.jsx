import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdShowChart } from 'react-icons/md';

const BTN_BORDER =
  'border-2 border-[#E53935] shadow-[0_0_0_1px_#E53935,0_0_12px_rgba(229,57,53,0.4),0_2px_0_rgba(229,57,53,0.25)] hover:border-[#FF1744] hover:shadow-[0_0_0_1px_#FF1744,0_0_18px_rgba(229,57,53,0.55),0_0_28px_rgba(229,57,53,0.2)] dark:border-[#e60000] dark:shadow-[0_0_0_1px_#e60000,0_0_14px_rgba(230,0,0,0.35)] dark:hover:border-[#ff1a1a] dark:hover:shadow-[0_0_20px_rgba(230,0,0,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935]/60 focus-visible:ring-offset-2 dark:focus-visible:ring-[#e60000]/60 dark:focus-visible:ring-offset-black';

const BTN_BASE = `relative w-full min-h-[88px] rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-all duration-200 ${BTN_BORDER}`;

const STARLINE_IMG =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771484988/Black_and_White_Vintage_Star_Company_Logo_u2f6mb.png';
const CASINO_IMG =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771607262/Yellow_and_Brown_Illustrated_Dice_Casino_Logo_1_p0rjs1.png';
const SKILLS_IMG =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771608382/Yellow_and_Brown_Illustrated_Dice_Casino_Logo_2_n2nfdl.png';
const KING_IMG =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771485291/Yellow_and_Black_Illustrative_Esports_The_Lion_King_Logo_1_s7gnuh.png';

const quickLinks = [
  {
    key: 'starline',
    layout: 'banner',
    labelKey: 'markets.starline',
    subtitleKey: 'markets.tapToPlay',
    path: '/startline-dashboard',
    image: STARLINE_IMG,
    logoFit: true,
  },
  {
    key: 'casino',
    layout: 'banner',
    line1Key: 'markets.casinoGamesLine1',
    line2Key: 'markets.casinoGamesLine2',
    path: '/games?category=highEarning',
    image: CASINO_IMG,
  },
  {
    key: 'skills',
    layout: 'banner',
    line1Key: 'markets.skillsGamesLine1',
    line2Key: 'markets.skillsGamesLine2',
    path: '/games?category=skills',
    image: SKILLS_IMG,
  },
  {
    key: 'markets',
    layout: 'plain',
    labelKey: 'sidebar.markets',
    subtitleKey: 'markets.tapToPlay',
    path: '/',
    Icon: MdShowChart,
  },
  {
    key: 'kingBazaar',
    layout: 'banner',
    labelKey: 'markets.kingBazaar',
    subtitleKey: 'markets.tapToPlay',
    path: '/king-bazaar-market',
    image: KING_IMG,
    logoFit: true,
  },
];

function BannerText({ link, t }) {
  if (link.line1Key) {
    return (
      <>
        <p className="text-white text-xs sm:text-sm font-bold uppercase leading-tight tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
          {t(link.line1Key)}
        </p>
        <p className="text-white text-xs sm:text-sm font-bold uppercase leading-tight tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
          {t(link.line2Key)}
        </p>
      </>
    );
  }
  return (
    <>
      <p className="text-white text-xs sm:text-sm font-bold uppercase leading-tight tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
        {t(link.labelKey)}
      </p>
      {link.subtitleKey && (
        <p className="text-amber-300 text-[10px] sm:text-xs font-semibold mt-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
          {t(link.subtitleKey)}
        </p>
      )}
    </>
  );
}

/** Starline / King Bazaar — black btn, logo fully visible (contain) */
function LogoFitBannerButton({ link, t, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${BTN_BASE} bg-black dark:bg-gradient-to-br dark:from-[#1a1a1a] dark:to-black flex items-stretch`}
    >
      <div className="relative z-10 flex flex-col justify-center min-h-[88px] px-3 py-3 shrink-0 w-[45%]">
        <BannerText link={link} t={t} />
      </div>
      <div className="flex-1 relative min-h-[88px] flex items-center justify-end p-2">
        <img
          src={link.image}
          alt=""
          className="h-full max-h-[80px] w-full max-w-full object-contain object-right"
        />
      </div>
    </button>
  );
}

/** Casino / Skills — full-bleed cover banner */
function CoverBannerButton({ link, t, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${BTN_BASE} bg-cover bg-center bg-no-repeat`}
      style={{ backgroundImage: `url(${link.image})` }}
    >
      <div className="relative z-10 flex flex-col justify-center min-h-[88px] px-3 py-3 max-w-[55%]">
        <BannerText link={link} t={t} />
      </div>
    </button>
  );
}

function BannerButton({ link, t, onClick }) {
  if (link.logoFit) {
    return <LogoFitBannerButton link={link} t={t} onClick={onClick} />;
  }
  return <CoverBannerButton link={link} t={t} onClick={onClick} />;
}

function PlainButton({ link, t, onClick }) {
  const Icon = link.Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-white dark:bg-gradient-to-br dark:from-[#1a1a1a] dark:to-[#0a0a0a] rounded-2xl overflow-hidden w-full text-left min-h-[88px] ${BTN_BORDER} active:scale-[0.98] transition-all duration-200 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black`}
    >
      <div className="flex items-center gap-3 px-3 py-3 h-full min-h-[88px]">
        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl shrink-0 flex items-center justify-center bg-red-50 dark:bg-[#1a1a1a] border border-red-100 dark:border-red-900/40">
          <Icon className="w-7 h-7 text-[#E53935] dark:text-[#e60000]" aria-hidden />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <p className="text-gray-900 dark:text-gray-100 text-xs sm:text-sm font-bold uppercase leading-tight tracking-wide truncate">
            {t(link.labelKey)}
          </p>
          {link.subtitleKey && (
            <p className="text-[#E53935] text-[10px] sm:text-xs font-semibold mt-0.5">
              {t(link.subtitleKey)}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

export default function QuickNavCards() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      {quickLinks.map((link) => {
        const onClick = () => navigate(link.path);
        if (link.layout === 'banner') {
          return <BannerButton key={link.key} link={link} t={t} onClick={onClick} />;
        }
        return <PlainButton key={link.key} link={link} t={t} onClick={onClick} />;
      })}
    </div>
  );
}
