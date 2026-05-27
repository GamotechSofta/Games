import React from 'react';

/**
 * One layout for "sidebar + main" that works on mobile (stacked) and desktop (side-by-side).
 * Use one grid; no duplicate mobile/desktop blocks.
 * - Mobile: single column, sidebar content first (full width).
 * - Desktop: grid [360px 1fr], sidebar sticky.
 */
export default function ResponsiveSidebarLayout({ sidebar, content, className = '' }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-[360px_1fr] md:gap-6 md:items-start min-w-0 ${className}`}>
      <aside className="min-w-0 w-full flex flex-col min-h-0 md:sticky md:top-4 md:space-y-5">
        {sidebar}
      </aside>
      <main className="min-w-0">
        {content}
      </main>
    </div>
  );
}
