import React, { Suspense, lazy, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import MobileHomeDashboard from '../components/home/MobileHomeDashboard';
import SkeletonBlock from '../components/SkeletonBlock';

const DashboardHero = lazy(() => import('../components/DashboardHero'));
const DesktopHomeSections = lazy(() => import('../components/home/DesktopHomeSections'));
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
      <Suspense fallback={
        <div className="min-h-[40vh] w-full space-y-4 px-4 py-3" aria-hidden>
          <SkeletonBlock className="h-24 w-full" />
          <SkeletonBlock className="h-40 w-full" />
          <SkeletonBlock className="h-40 w-full" />
        </div>
      }>
        <DashboardHero searchQuery={searchQuery} onSearchChange={handleSearchChange} />
        <DesktopHomeSections searchQuery={searchQuery} />
      </Suspense>
    );
  }
  return (
    <div className="min-h-screen min-h-ios-screen w-full max-w-full overflow-x-hidden bg-[#f5f5f7] dark:bg-[#0a0a0a]">
      <MobileHomeDashboard />
    </div>
  );
};

export default Home;
