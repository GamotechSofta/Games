import React, { useState } from 'react';
import DesktopSidebar from './DesktopSidebar';
import DashboardHeader from './DashboardHeader';

export default function DesktopDashboardLayout({
  children,
  activePanel,
  onPanelChange,
  contentClassName = 'flex flex-1 flex-col px-5 py-5',
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  return (
    <div className="flex min-h-screen w-full bg-[#f5f5f7] dark:bg-[#141415]">
      <DesktopSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />
      <div className="flex h-screen min-h-0 min-w-0 flex-1 flex-col">
        <main className="custom-scrollbar-light dark:custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
          <DashboardHeader activePanel={activePanel} onPanelChange={onPanelChange} />
          <div className={contentClassName}>{children}</div>
        </main>
      </div>
    </div>
  );
}
