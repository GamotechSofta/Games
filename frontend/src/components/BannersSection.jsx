import React, { useState, useEffect, useRef } from 'react';
import { HOME_BANNERS } from '../config/banners';

const BannersSection = () => {
  const [bannerIdx, setBannerIdx] = useState(0);
  const bannerTimerRef = useRef(null);
  const touchStartRef = useRef(0);
  const touchEndRef = useRef(0);
  const SWIPE_THRESHOLD = 50;

  useEffect(() => {
    if (HOME_BANNERS.length <= 1) return undefined;

    const advance = () => setBannerIdx((i) => (i + 1) % HOME_BANNERS.length);
    const start = () => {
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
      bannerTimerRef.current = setInterval(advance, 6000);
    };
    const stop = () => {
      if (bannerTimerRef.current) {
        clearInterval(bannerTimerRef.current);
        bannerTimerRef.current = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartRef.current - touchEndRef.current;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) {
        setBannerIdx((i) => (i + 1) % HOME_BANNERS.length);
      } else {
        setBannerIdx((i) => (i - 1 + HOME_BANNERS.length) % HOME_BANNERS.length);
      }
    }
  };
  const handleTouchMove = (e) => {
    touchEndRef.current = e.touches[0].clientX;
  };

  return (
    <div className="mt-0 md:hidden">
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
            transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {HOME_BANNERS.map((b, i) => (
            <div key={i} className="w-full shrink-0 grow-0 basis-full self-start">
              <img
                src={b.src}
                alt={b.alt}
                className="block w-full h-auto max-w-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
                draggable="false"
              />
            </div>
          ))}
        </div>

        {HOME_BANNERS.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 z-10">
            {HOME_BANNERS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setBannerIdx(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === bannerIdx ? 'w-6 bg-amber-500' : 'w-1.5 bg-white/40'
                }`}
                aria-label={`Banner ${i + 1}`}
              />
            ))}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
      </div>
    </div>
  );
};

export default BannersSection;
