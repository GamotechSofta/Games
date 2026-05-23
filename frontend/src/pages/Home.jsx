import React, { useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import WalletSection from '../components/WalletSection';
import Section1 from '../components/Section1';
import DesktopDashboardLayout from '../components/DesktopDashboardLayout';
import DashboardHero from '../components/DashboardHero';
import MarketSections from '../components/MarketSections';
import { getActivePanelFromLocation, useDashboardNav } from '../utils/dashboardNav';

const Home = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDesktop } = useBreakpoint();
  const onPanelChange = useDashboardNav();
  const activePanel = getActivePanelFromLocation(location.pathname, location.search) || 'home';
  const searchQuery = searchParams.get('q') ?? '';

  const handleSearchChange = useCallback(
    (value) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const trimmed = value.trim();
          if (trimmed) next.set('q', trimmed);
          else next.delete('q');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  if (isDesktop) {
    return (
      <DesktopDashboardLayout activePanel={activePanel} onPanelChange={onPanelChange}>
        <DashboardHero searchQuery={searchQuery} onSearchChange={handleSearchChange} />
        <MarketSections searchQuery={searchQuery} />
      </DesktopDashboardLayout>
    );
  }

  return (
    <div className="min-h-screen min-h-ios-screen w-full max-w-full overflow-x-hidden bg-[#f5f5f7] dark:bg-[#0a0a0a]">
      <WalletSection />
      <Section1 />
    </div>
  );
};

export default Home;
