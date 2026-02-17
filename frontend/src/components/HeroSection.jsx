import React, { useState, useEffect } from 'react';

const desktopBanners = [
  {
    src: 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1770635561/Black_Gold_Modern_Casino_Night_Party_Facebook_Cover_1545_x_900_px_1920_x_500_px_1_l8iyri.png',
    alt: 'Black Gold Casino Night Banner',
  },
  {
    src: 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771338484/Black_Orange_Minimalis_Offline_Gaming_Banner_Landscape_1920_x_500_px_1_shojp0.png',
    alt: 'Black Orange Offline Gaming Banner',
  },
];

const HeroSection = () => {
  const [bannerIdx, setBannerIdx] = useState(0);

  useEffect(() => {
    if (desktopBanners.length <= 1) return;
    const id = setInterval(() => {
      setBannerIdx((i) => (i + 1) % desktopBanners.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="w-full bg-black">
      {/* Desktop Banner - carousel */}
      <div className="hidden md:block">
        <div className="relative overflow-hidden leading-[0]">
          <div
            className="flex will-change-transform"
            style={{
              transform: `translateX(-${bannerIdx * 100}%)`,
              transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {desktopBanners.map((b, i) => (
              <div key={i} className="w-full shrink-0 grow-0 basis-full">
                <img
                  src={b.src}
                  alt={b.alt}
                  className="block w-full h-auto object-contain"
                  style={{ aspectRatio: '1920 / 500' }}
                  loading="eager"
                  draggable="false"
                />
              </div>
            ))}
          </div>
          {desktopBanners.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 z-10">
              {desktopBanners.map((_, i) => (
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
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
