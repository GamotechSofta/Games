import React, { useState, useEffect, useRef } from 'react';

const BANNERS = [
  {
    src: "https://res.cloudinary.com/dnyp5jknp/image/upload/v1771873663/Black_and_White_Minimalist_Casino_Night_Facebook_Cover_5839_x_3402_px_thbbms.svg",
    alt: "Casino banner"
  },
  {
    src: "https://res.cloudinary.com/dnyp5jknp/image/upload/v1771503014/Black_Gold_Modern_Casino_Night_Party_Facebook_Cover_1545_x_900_px_1080_x_547_px_1_ooz3sj.png",
    alt: "Black Gold Casino Night Banner"
  },
  {
    src: "https://res.cloudinary.com/dnyp5jknp/image/upload/v1771501969/Black_Orange_Minimalis_Offline_Gaming_Banner_Landscape_1920_x_500_px_1080_x_547_px_npbht7.png",
    alt: "Casino banner"
  },
  
];

const BannersSection = () => {
  const [bannerIdx, setBannerIdx] = useState(0);
  const bannerTimerRef = useRef(null);
  const touchStartRef = useRef(0);
  const touchEndRef = useRef(0);
  const SWIPE_THRESHOLD = 50;

  useEffect(() => {
    if (BANNERS.length <= 1) return;
    bannerTimerRef.current = setInterval(() => {
      setBannerIdx((i) => (i + 1) % BANNERS.length);
    }, 4000);
    return () => clearInterval(bannerTimerRef.current);
  }, []);

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartRef.current - touchEndRef.current;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) {
        setBannerIdx((i) => (i + 1) % BANNERS.length);
      } else {
        setBannerIdx((i) => (i - 1 + BANNERS.length) % BANNERS.length);
      }
    }
  };
  const handleTouchMove = (e) => {
    touchEndRef.current = e.touches[0].clientX;
  };

  return (
    <div className="mt-0 sm:hidden">
      <div
        className="relative overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.35)] touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex items-start will-change-transform"
          style={{
            transform: `translateX(-${bannerIdx * 100}%)`,
            transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {BANNERS.map((b, i) => (
            <div key={i} className="w-full shrink-0 grow-0 basis-full self-start">
              <img
                src={b.src}
                alt={b.alt}
                className="block w-full h-auto max-w-full"
                loading="eager"
                draggable="false"
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
      </div>
    </div>
  );
};

export default BannersSection;
