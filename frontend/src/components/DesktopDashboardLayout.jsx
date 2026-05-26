import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import DesktopSidebar from './DesktopSidebar';
import DashboardHeader from './DashboardHeader';

export default function DesktopDashboardLayout({
  children,
  activePanel,
  onPanelChange,
  contentClassName = 'flex flex-1 flex-col px-5 py-5',
}) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const resolvedContentClassName =
    location.pathname === '/bidoptions'
      ? 'flex flex-1 flex-col'
      : contentClassName;

  return (
    <div className="flex h-screen min-h-screen w-full flex-col overflow-hidden bg-[#f5f5f7] dark:bg-[#141415]">
      <DashboardHeader
        activePanel={activePanel}
        onPanelChange={onPanelChange}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DesktopSidebar collapsed={sidebarCollapsed} />
        <main className="custom-scrollbar-light dark:custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className={resolvedContentClassName}>{children}</div>
        </main>
      </div>
    </div>
  );
}
