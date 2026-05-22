import React, { useState } from 'react';
import WalletSection from '../components/WalletSection';
import Section1 from '../components/Section1';
import DesktopSidebar from '../components/DesktopSidebar';
import DashboardHeader from '../components/DashboardHeader';
import DashboardHero from '../components/DashboardHero';
import QuickNavCards from '../components/QuickNavCards';
import MarketSections from '../components/MarketSections';

/**
 * Mobile (md:hidden): banners + game cards + markets grid (Section1)
 * Desktop (md+): Aakda dashboard — sidebar, header, hero, quick nav, market rows
 */
const Home = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <>
      {/* Mobile home */}
      <div className="md:hidden min-h-screen min-h-ios-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] w-full max-w-full overflow-x-hidden">
        <WalletSection />
        <Section1 />
      </div>

      {/* Desktop dashboard — mockup dark theme via .dashboard-shell in index.css */}
      <div className="dashboard-shell hidden md:flex min-h-screen bg-[#f5f5f7] dark:bg-black w-full">
        <DesktopSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
        <div className="flex-1 flex flex-col min-w-0 min-h-0 h-screen">
          <main className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar-light dark:custom-scrollbar">
            <DashboardHeader />
            <div className="px-5 py-5">
              <DashboardHero />
              <QuickNavCards />
              <MarketSections />
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default Home;
