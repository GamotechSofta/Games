import React from 'react';

/**
 * One layout for "sidebar + main" that works on mobile (stacked) and desktop (side-by-side).
 * - Mobile: single column, sidebar content first (full width).
 * - Desktop: grid with sticky sidebar (`default` 360px, `narrow` ~11rem for compact nav).
 */
export default function ResponsiveSidebarLayout({ sidebar, content, className = '', sidebarSize = 'default' }) {
  const gridCols = sidebarSize === 'narrow' ? 'md:grid-cols-[11rem_1fr]' : 'md:grid-cols-[360px_1fr]';
  const gap = sidebarSize === 'narrow' ? 'md:gap-4' : 'md:gap-6';

  return (
    <div className={`grid grid-cols-1 ${gridCols} ${gap} md:items-start min-w-0 ${className}`}>
      <aside className="min-w-0 w-full flex flex-col min-h-0 md:sticky md:top-4 md:space-y-2">
        {sidebar}
      </aside>
      <main className="min-w-0 flex-1">
        {content}
      </main>
    </div>
  );
}
