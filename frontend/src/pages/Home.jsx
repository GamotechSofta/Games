import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import DashboardHero from '../components/DashboardHero';
import DesktopHomeSections from '../components/home/DesktopHomeSections';
import MobileHomeDashboard from '../components/home/MobileHomeDashboard';

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDesktop } = useBreakpoint();
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
      <>
        <DashboardHero searchQuery={searchQuery} onSearchChange={handleSearchChange} />
        <DesktopHomeSections searchQuery={searchQuery} />
      </>
    );
  }

  return (
    <div className="min-h-screen min-h-ios-screen w-full max-w-full overflow-x-hidden bg-[#f5f5f7] dark:bg-[#0a0a0a]">
      <MobileHomeDashboard />
    </div>
  );
};

export default Home;
