import React, { Suspense, lazy, useState } from 'react';

const DesktopSidebar = lazy(() => import('./DesktopSidebar'));
const DashboardHeader = lazy(() => import('./DashboardHeader'));

export default function DesktopDashboardLayout({
  children,
  activePanel,
  onPanelChange,
  contentClassName = 'flex flex-1 flex-col px-5 py-5',
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  return (
    <div className="flex h-screen min-h-screen w-full flex-col overflow-hidden bg-[#f5f5f7] dark:bg-[#141415]">
      <Suspense fallback={null}>
        <DashboardHeader
          activePanel={activePanel}
          onPanelChange={onPanelChange}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
        />
      </Suspense>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Suspense fallback={null}>
          <DesktopSidebar collapsed={sidebarCollapsed} />
        </Suspense>
        <main className="custom-scrollbar-light dark:custom-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          <div className={contentClassName}>{children}</div>
        </main>
      </div>
    </div>
  );
}
