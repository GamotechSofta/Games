import React from 'react';
import { useLocation } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import MarketSections from '../components/MarketSections';
import DesktopDashboardLayout from '../components/DesktopDashboardLayout';
import { getActivePanelFromLocation, useDashboardNav } from '../utils/dashboardNav';

export default function MarketsPage() {
  const location = useLocation();
  const onPanelChange = useDashboardNav();
  const activePanel = getActivePanelFromLocation(location.pathname, location.search) || 'markets';

  const { isDesktop } = useBreakpoint();

  if (isDesktop) {
    return (
      <DesktopDashboardLayout activePanel={activePanel} onPanelChange={onPanelChange}>
        <MarketSections />
      </DesktopDashboardLayout>
    );
  }

  return (
    <div className="px-3 pb-8">
      <MarketSections />
    </div>
  );
}
