import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useHeartbeat } from '../hooks/useHeartbeat';
import { useBreakpoint } from '../hooks/useBreakpoint';
import DesktopDashboardLayout from '../components/DesktopDashboardLayout';
import { getActivePanelFromLocation, useDashboardNav } from '../utils/dashboardNav';
import AppHeader from '../components/AppHeader';
import SubHeader from '../components/SubHeader';
import BottomNavbar from '../components/BottomNavbar';
import Home from '../pages/Home';
import MarketsPage from '../pages/MarketsPage';
import BidOptions from '../pages/BidOptions';
import GameBid from '../pages/GameBid/index';
import Funds from '../pages/Funds';
import Download from '../pages/Download';
import Login from '../pages/Login';
import Passbook from '../pages/Passbook';
import SupportNew from '../pages/Support/SupportNew';
import SupportStatus from '../pages/Support/SupportStatus';
import Bids from '../pages/Bids';
import Profile from '../pages/Profile';
import BetHistory from '../pages/BetHistory';
import StarlineBetHistory from '../pages/StarlineBetHistory';
import KingBazaarBetHistory from '../pages/KingBazaarBetHistory';
import MarketResultHistory from '../pages/MarketResultHistory';
import StartlineDashboard from '../pages/StartlineDashboard';
import TopWinners from '../pages/TopWinners';
import StarlineMarket from '../pages/StarlineMarket';
import KingBazaarMarket from '../pages/KingBazaarMarket';
import Notifications from '../pages/Notifications';
import GameRate from '../pages/GameRate';
import Games from '../pages/Games';
import Wallet from '../pages/Wallet';
import AdminDashboard from '../admin/AdminDashboard';
import GameManager from '../admin/GameManager';
import Transactions from '../admin/Transactions';
import {
  isMobileInstallBannerDismissed,
  MOBILE_INSTALL_BANNER_EVENT,
  shouldShowMobileInstallBanner,
  getMobileDashboardContentTop,
} from '../utils/mobileInstallBanner';

// When PayU redirects to /?payu_failed=1 or payu_success=1, send user to /funds so the app loads and AddFund can show the modal
const PayURedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (location.pathname !== '/' || !location.search) return;
    const params = new URLSearchParams(location.search);
    if (params.get('payu_failed') === '1' || params.get('payu_success') === '1') {
      navigate(`/funds?tab=add-fund&${params.toString()}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);
  return null;
};

// Scroll to top on every route/screen change (pathname or search params)
const ScrollToTop = () => {
  const location = useLocation();
  const { pathname, search } = location;
  const prevPathRef = useRef(null);

  useEffect(() => {
    // Store previous pathname for "Back" buttons
    try {
      if (prevPathRef.current) {
        sessionStorage.setItem('prevPathname', prevPathRef.current);
      }
    } catch (_) { }
    prevPathRef.current = pathname;

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
      // Mobile: scrollIntoView helps iOS Safari and Chrome Android
      try {
        document.body.scrollIntoView?.({ behavior: 'instant', block: 'start' });
        document.documentElement?.scrollIntoView?.({ behavior: 'instant', block: 'start' });
      } catch (_) {}
      // Scroll main scrollable containers (window + overflow divs) – same for mobile and desktop
      try {
        const scrollables = document.querySelectorAll(
          '[class*="overflow-y-auto"], [class*="overflow-y-scroll"], [class*="overflow-auto"], [class*="ios-scroll-touch"]'
        );
        scrollables.forEach((el) => {
          if (el && typeof el.scrollTop === 'number') el.scrollTop = 0;
        });
      } catch (_) {}
    };

    scrollToTop();
    const raf = requestAnimationFrame(scrollToTop);
    const t1 = setTimeout(scrollToTop, 100);
    const t2 = setTimeout(scrollToTop, 250);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname, search]);

  return null;
};
const PUBLIC_PATHS = ['/login'];

const Layout = ({ children }) => {
  const location = useLocation();
  const { isDesktop } = useBreakpoint();
  const onPanelChange = useDashboardNav();
  const [hasUser, setHasUser] = useState(() => !!localStorage.getItem('user'));
  const [bannerDismissed, setBannerDismissed] = useState(() => isMobileInstallBannerDismissed());
  const isLoginPage = location.pathname === '/login';
  const isDashboardShellPage = location.pathname === '/' || location.pathname === '/markets';
  const isAdminPanel = location.pathname.startsWith('/admin-panel');

  // Hide top nav on mobile only (CSS) for My Bets landing + Bet History list + related history screens
  const hideTopNavMobileOnly =
    location.pathname === '/bids' ||
    location.pathname === '/bet-history' ||
    location.pathname === '/starline-bet-history' ||
    location.pathname === '/king-bazaar-bet-history' ||
    location.pathname === '/market-result-history';
  const hideTopNavOnMobile =
    !isDesktop &&
    (['/funds', '/profile', '/notifications', '/bidoptions', '/game-bid', '/games'].includes(location.pathname) ||
      location.pathname.startsWith('/support'));

  // Mobile only: hide bottom navbar (currently none; show on all screens)
  const hideBottomNavOnMobile = false;

  useEffect(() => {
    const check = () => setHasUser(!!localStorage.getItem('user'));
    window.addEventListener('userLogin', check);
    window.addEventListener('userLogout', check);
    return () => {
      window.removeEventListener('userLogin', check);
      window.removeEventListener('userLogout', check);
    };
  }, []);

  useEffect(() => {
    const syncBannerState = () => setBannerDismissed(isMobileInstallBannerDismissed());
    const onBannerChange = (event) => {
      setBannerDismissed(Boolean(event?.detail?.dismissed));
    };

    syncBannerState();
    window.addEventListener(MOBILE_INSTALL_BANNER_EVENT, onBannerChange);
    window.addEventListener('storage', syncBannerState);

    return () => {
      window.removeEventListener(MOBILE_INSTALL_BANNER_EVENT, onBannerChange);
      window.removeEventListener('storage', syncBannerState);
    };
  }, [location.pathname]);

  const isPublicPath = PUBLIC_PATHS.includes(location.pathname);
  if (isAdminPanel) {
    return <>{children}</>;
  }
  if (!hasUser && !isPublicPath) {
    return <Navigate to="/login" replace />;
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Desktop: global sidebar + dashboard header on every player screen
  if (isDesktop) {
    const activePanel = getActivePanelFromLocation(location.pathname, location.search);
    const showDashboardNav = isDashboardShellPage;

    return (
      <div className="dashboard-shell min-h-screen bg-[#f5f5f7] dark:bg-[#141415]">
        <DesktopDashboardLayout
          activePanel={showDashboardNav ? activePanel || (location.pathname === '/markets' ? 'markets' : 'home') : undefined}
          onPanelChange={showDashboardNav ? onPanelChange : undefined}
        >
          {children}
        </DesktopDashboardLayout>
      </div>
    );
  }

  // Mobile dashboard home/markets
  if (isDashboardShellPage) {
    const hasPromoBanner = shouldShowMobileInstallBanner(location.pathname) && !bannerDismissed;
    return (
      <div className="min-h-screen min-h-ios-screen w-full bg-[#f5f5f7] pb-[calc(4rem+env(safe-area-inset-bottom,0px))] dark:bg-[#141415]">
        <AppHeader />
<<<<<<< Updated upstream
        <div
          style={{
            paddingTop: hasPromoBanner
              ? getMobileDashboardContentTop(true)
              : 'calc(54px + env(safe-area-inset-top, 0px))',
          }}
        >
=======
        <div className="pt-[calc(54px+env(safe-area-inset-top,0px))] sm:pt-[calc(58px+env(safe-area-inset-top,0px))]">
>>>>>>> Stashed changes
          {children}
        </div>
        <BottomNavbar />
      </div>
    );
  }

  const isBidPage = location.pathname.includes('game-bid') || location.pathname === '/bidoptions';
  const isBetsPage = location.pathname === '/bids';
  const isHistoryPage =
    location.pathname === '/bet-history' || location.pathname === '/market-result-history';

  return (
    <div
      className={
        hideBottomNavOnMobile
          ? 'min-h-screen min-h-ios-screen pb-6 md:pb-0 w-full max-w-full overflow-x-hidden bg-[#f5f5f7] dark:bg-black'
          : 'min-h-screen min-h-ios-screen pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0 w-full max-w-full overflow-x-hidden bg-[#f5f5f7] dark:bg-black'
      }
    >
      {/* My Bets, Bet History, Game Results etc.: hide top nav on mobile only via CSS */}
      {hideTopNavMobileOnly ? (
        <div className="hidden md:block">
          <AppHeader />
          <SubHeader />
        </div>
      ) : (
        !hideTopNavOnMobile && (
          <>
            <AppHeader />
            <SubHeader />
          </>
        )
      )}
      <div
        className={
          hideTopNavMobileOnly
            ? 'pt-[calc(0.5rem+env(safe-area-inset-top,0px))] md:pt-[calc(84px+env(safe-area-inset-top,0px))]'
            : hideTopNavOnMobile
              ? 'pt-[calc(0.5rem+env(safe-area-inset-top,0px))]'
              : isBidPage
                ? 'pt-[calc(84px+env(safe-area-inset-top,0px))] sm:pt-[calc(88px+env(safe-area-inset-top,0px))] md:pt-[calc(90px+env(safe-area-inset-top,0px))]'
                : (isBetsPage || isHistoryPage)
                  ? 'pt-[calc(84px+env(safe-area-inset-top,0px))] sm:pt-[calc(88px+env(safe-area-inset-top,0px))] md:pt-[calc(100px+env(safe-area-inset-top,0px))]'
                  : 'pt-[calc(84px+env(safe-area-inset-top,0px))] sm:pt-[calc(88px+env(safe-area-inset-top,0px))] md:pt-[calc(92px+env(safe-area-inset-top,0px))]'
        }
      >
        {children}
      </div>
      {!hideBottomNavOnMobile && <BottomNavbar />}
    </div>
  );
};

const AppRoutes = () => {
  useHeartbeat();
  return (
    <Router>
      <PayURedirect />
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/markets" element={<MarketsPage />} />
          <Route path="/bidoptions" element={<BidOptions />} />
          <Route path="/game-bid" element={<GameBid />} />
          <Route path="/bank" element={<Passbook />} />
          <Route path="/funds" element={<Funds />} />
          <Route path="/download" element={<Download />} />
          <Route path="/passbook" element={<Passbook />} />
          <Route path="/support" element={<SupportNew />} />
          <Route path="/support/new" element={<SupportNew />} />
          <Route path="/support/status" element={<SupportStatus />} />
          <Route path="/login" element={<Login />} />
          <Route path="/bids" element={<Bids />} />
          <Route path="/bet-history" element={<BetHistory />} />
          <Route path="/starline-bet-history" element={<StarlineBetHistory />} />
          <Route path="/king-bazaar-bet-history" element={<KingBazaarBetHistory />} />
          <Route path="/market-result-history" element={<MarketResultHistory />} />
          <Route path="/startline-dashboard" element={<StartlineDashboard />} />
          <Route path="/starline-market" element={<StarlineMarket />} />
          <Route path="/king-bazaar-market" element={<KingBazaarMarket />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/top-winners" element={<TopWinners />} />
          <Route path="/game-rate" element={<GameRate />} />
          <Route path="/games" element={<Games />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/admin-panel" element={<Navigate to="/admin-panel/dashboard" replace />} />
          <Route path="/admin-panel/dashboard" element={<AdminDashboard />} />
          <Route path="/admin-panel/games" element={<GameManager />} />
          <Route path="/admin-panel/transactions" element={<Transactions />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default AppRoutes;

