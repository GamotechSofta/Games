import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import MarketSections from '../components/MarketSections';
import DesktopDashboardLayout from '../components/DesktopDashboardLayout';
import { getActivePanelFromLocation, useDashboardNav } from '../utils/dashboardNav';

export default function MarketsPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const onPanelChange = useDashboardNav();
  const activePanel = getActivePanelFromLocation(location.pathname, location.search) || 'markets';
  const searchQuery = searchParams.get('q') ?? '';

  const { isDesktop } = useBreakpoint();

  if (isDesktop) {
    return (
      <DesktopDashboardLayout activePanel={activePanel} onPanelChange={onPanelChange}>
        <MarketSections searchQuery={searchQuery} />
      </DesktopDashboardLayout>
    );
  }

  return (
    <div className="px-3 pb-8">
      <MarketSections />
    </div>
  );
}
