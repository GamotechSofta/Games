import React, { useState, useEffect, useRef } from 'react';
import { HOME_BANNERS } from '../config/banners';

export default function DashboardHero() {
  const [bannerIdx, setBannerIdx] = useState(0);
  const touchStartRef = useRef(0);
  const touchEndRef = useRef(0);
  const SWIPE_THRESHOLD = 50;

  useEffect(() => {
    if (HOME_BANNERS.length <= 1) return;
    const id = setInterval(() => {
      setBannerIdx((i) => (i + 1) % HOME_BANNERS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e) => {
    touchEndRef.current = e.touches[0].clientX;
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

  return (
    <section className="mb-6">
      <div
        className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-red-900/30 dark:shadow-[0_0_28px_rgba(230,0,0,0.12)] shadow-sm leading-[0] touch-pan-y bg-black"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex will-change-transform"
          style={{
            transform: `translateX(-${bannerIdx * 100}%)`,
            transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {HOME_BANNERS.map((b, i) => (
            <div key={i} className="w-full shrink-0 grow-0 basis-full">
              <img
                src={b.src}
                alt={b.alt}
                className="block w-full h-auto object-cover"
                style={{ aspectRatio: '1920 / 500' }}
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
                  i === bannerIdx ? 'w-6 bg-[#e60000]' : 'w-1.5 bg-white/50'
                }`}
                aria-label={`Banner ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
