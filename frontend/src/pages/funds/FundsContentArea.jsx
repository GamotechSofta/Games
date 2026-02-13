import React from 'react';

/**
 * Main content area for Funds screen: desktop (header + component) or mobile (component only).
 */
export default function FundsContentArea({
  isDesktop,
  activeItem,
  ActiveComponent,
  mobileDetailItem,
  shouldRemoveCardBackground,
}) {
  if (isDesktop) {
    return (
      <main className="rounded-2xl bg-[#202124] border border-white/10 shadow-[0_12px_24px_rgba(0,0,0,0.35)] p-6">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-black shadow-[0_10px_20px_rgba(0,0,0,0.35)]"
            style={{ backgroundColor: activeItem?.color || '#f3b61b' }}
          >
            {activeItem?.icon}
          </div>
          <div className="min-w-0 text-center">
            <div className="text-xl font-bold text-white truncate">{activeItem?.title}</div>
            <div className="text-sm text-gray-400">{activeItem?.subtitle}</div>
          </div>
        </div>
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-hidden">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </main>
    );
  }

  return (
    <div
      className={`min-h-[280px] ${
        shouldRemoveCardBackground
          ? 'p-0 min-h-[60vh] max-h-[calc(100dvh-180px)] overflow-y-auto overflow-x-hidden scrollbar-hidden ios-scroll-touch'
          : 'bg-[#202124] border border-white/10 rounded-2xl shadow-[0_12px_24px_rgba(0,0,0,0.35)] p-4 min-h-[50vh] max-h-[calc(100dvh-140px)] overflow-y-auto overflow-x-hidden scrollbar-hidden ios-scroll-touch'
      }`}
    >
      {mobileDetailItem?.component && React.createElement(mobileDetailItem.component)}
    </div>
  );
}
