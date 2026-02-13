import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SupportLanding = () => {
  const navigate = useNavigate();

  // Mobile only: prevent page scrolling (as requested)
  useEffect(() => {
    let cleanup = () => {};
    try {
      const mql = window.matchMedia('(max-width: 767px)');
      const apply = () => {
        cleanup();
        if (!mql.matches) return;
        const prevBody = document.body.style.overflow;
        const prevHtml = document.documentElement.style.overflow;
        const prevOverscrollBody = document.body.style.overscrollBehavior;
        const prevOverscrollHtml = document.documentElement.style.overscrollBehavior;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';
        document.documentElement.style.overscrollBehavior = 'none';
        cleanup = () => {
          document.body.style.overflow = prevBody;
          document.documentElement.style.overflow = prevHtml;
          document.body.style.overscrollBehavior = prevOverscrollBody;
          document.documentElement.style.overscrollBehavior = prevOverscrollHtml;
        };
      };
      apply();
      mql.addEventListener?.('change', apply);
      return () => {
        mql.removeEventListener?.('change', apply);
        cleanup();
      };
    } catch (_) {
      return () => cleanup();
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white px-3 sm:px-6 md:px-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-xl mx-auto">
        <div className="flex items-center gap-3 pt-4 pb-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="min-w-[44px] min-h-[44px] rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center hover:bg-gray-700 transition-colors shrink-0 touch-manipulation"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Help Desk</h1>
        </div>
        <p className="text-gray-400 text-sm sm:text-base mb-8">Choose an option below.</p>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => navigate('/support/new')}
            className="w-full min-h-[72px] sm:min-h-[80px] bg-[#202124] rounded-2xl border-2 border-white/15 py-4 px-4 sm:py-5 sm:px-5 shadow-[0_12px_24px_rgba(0,0,0,0.35)] text-left flex items-center gap-4 hover:border-[#f3b61b]/50 hover:bg-[#25282c] active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#f3b61b] flex items-center justify-center shrink-0 shadow-[0_8px_16px_rgba(243,182,27,0.3)]">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4m8-8V8a2 2 0 012-2h4a2 2 0 012 2v0" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="block font-semibold text-white text-base sm:text-lg">Raise help ticket</span>
              <span className="block text-sm text-gray-400 mt-0.5">Submit a new problem with description and screenshots.</span>
            </div>
            <div className="w-9 h-9 rounded-full border border-white/20 bg-black/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/support/status')}
            className="w-full min-h-[72px] sm:min-h-[80px] bg-[#202124] rounded-2xl border-2 border-white/15 py-4 px-4 sm:py-5 sm:px-5 shadow-[0_12px_24px_rgba(0,0,0,0.35)] text-left flex items-center gap-4 hover:border-[#25d366]/50 hover:bg-[#25282c] active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25d366] flex items-center justify-center shrink-0 shadow-[0_8px_16px_rgba(37,211,102,0.3)]">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="block font-semibold text-white text-base sm:text-lg">Check previous problem status</span>
              <span className="block text-sm text-gray-400 mt-0.5">See status and reply for your submitted tickets.</span>
            </div>
            <div className="w-9 h-9 rounded-full border border-white/20 bg-black/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupportLanding;
