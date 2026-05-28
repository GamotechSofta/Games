import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useHeartbeat } from '../hooks/useHeartbeat';
import { usePlayerWalletSocketSync } from '../hooks/usePlayerWalletSocketSync';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { getActivePanelFromLocation, useDashboardNav } from '../utils/dashboardNav';
import SkeletonBlock from '../components/SkeletonBlock';
import {
  isMobileInstallBannerDismissed,
  MOBILE_INSTALL_BANNER_EVENT,
  shouldShowMobileInstallBanner,
  getMobileDashboardContentTop,
} from '../utils/mobileInstallBanner';
import ProtectedRoute from './ProtectedRoute';
import { clearUserAuth, getUserToken, isTokenExpired } from '../utils/auth';

const AppHeader = lazy(() => import('../components/AppHeader'));
const BottomNavbar = lazy(() => import('../components/BottomNavbar'));
const SubHeader = lazy(() => import('../components/SubHeader'));
const Home = lazy(() => import('../pages/Home'));
const DesktopDashboardLayout = lazy(() => import('../components/DesktopDashboardLayout'));
const MarketsPage = lazy(() => import('../pages/MarketsPage'));
const BidOptions = lazy(() => import('../pages/BidOptions'));
const GameBid = lazy(() => import('../pages/GameBid/index'));
const Funds = lazy(() => import('../pages/Funds'));
const Download = lazy(() => import('../pages/Download'));
const Passbook = lazy(() => import('../pages/Passbook'));
const SupportNew = lazy(() => import('../pages/Support/SupportNew'));
const SupportStatus = lazy(() => import('../pages/Support/SupportStatus'));
const Bids = lazy(() => import('../pages/Bids'));
const Profile = lazy(() => import('../pages/Profile'));
const BetHistory = lazy(() => import('../pages/BetHistory'));
const StarlineBetHistory = lazy(() => import('../pages/StarlineBetHistory'));
const KingBazaarBetHistory = lazy(() => import('../pages/KingBazaarBetHistory'));
const MarketResultHistory = lazy(() => import('../pages/MarketResultHistory'));
const StartlineDashboard = lazy(() => import('../pages/StartlineDashboard'));
const TopWinners = lazy(() => import('../pages/TopWinners'));
const StarlineMarket = lazy(() => import('../pages/StarlineMarket'));
const KingBazaarMarket = lazy(() => import('../pages/KingBazaarMarket'));
const GameRate = lazy(() => import('../pages/GameRate'));
const Games = lazy(() => import('../pages/Games'));
const Wallet = lazy(() => import('../pages/Wallet'));
const AdminDashboard = lazy(() => import('../admin/AdminDashboard'));
const GameManager = lazy(() => import('../admin/GameManager'));
const Transactions = lazy(() => import('../admin/Transactions'));
const ProtectedDemo = lazy(() => import('../pages/ProtectedDemo'));

function RouteFallback() {
  return (
    <div className="min-h-[40vh] w-full px-4 py-3 space-y-3" aria-hidden>
      <SkeletonBlock className="h-14 w-full" />
      <SkeletonBlock className="h-28 w-full" />
      <SkeletonBlock className="h-28 w-full" />
    </div>
  );
}

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

const ScrollToTop = () => {
  const location = useLocation();
  const { pathname, search } = location;
  const prevPathRef = useRef(null);

  useEffect(() => {
    try {
      if (prevPathRef.current) {
        sessionStorage.setItem('prevPathname', prevPathRef.current);
      }
    } catch (_) {}
    prevPathRef.current = pathname;

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
      try {
        document.body.scrollIntoView?.({ behavior: 'instant', block: 'start' });
        document.documentElement?.scrollIntoView?.({ behavior: 'instant', block: 'start' });
      } catch (_) {}
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

const Layout = ({ children }) => {
  const location = useLocation();
  const { isDesktop } = useBreakpoint();
  const onPanelChange = useDashboardNav();
  const [hasUser, setHasUser] = useState(() => !!localStorage.getItem('user'));
  const [bannerDismissed, setBannerDismissed] = useState(() => isMobileInstallBannerDismissed());
  const activePanel = getActivePanelFromLocation(location.pathname, location.search);
  const isDashboardShellPage = location.pathname === '/' || location.pathname === '/markets';
  const isAdminPanel = location.pathname.startsWith('/admin-panel');
  const showDesktopDashboardNav =
    location.pathname === '/' ||
    location.pathname === '/markets' ||
    (location.pathname === '/games' && (activePanel === 'casino' || activePanel === 'skills'));

  const hideTopNavMobileOnly =
    location.pathname === '/bids' ||
    location.pathname === '/bet-history' ||
    location.pathname === '/starline-bet-history' ||
    location.pathname === '/king-bazaar-bet-history' ||
    location.pathname === '/market-result-history';
  const hideTopNavOnMobile =
    !isDesktop &&
    (['/funds', '/profile', '/bidoptions', '/game-bid', '/games'].includes(location.pathname) ||
      location.pathname.startsWith('/support'));
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

  usePlayerWalletSocketSync(Boolean(hasUser && !isAdminPanel));

  useEffect(() => {
    const validateToken = () => {
      const token = getUserToken();
      if (token && isTokenExpired(token)) {
        clearUserAuth();
      }
    };
    validateToken();
    const timer = setInterval(validateToken, 30 * 1000);
    return () => clearInterval(timer);
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

  if (isAdminPanel) return <>{children}</>;
  if (!hasUser) return <Navigate to="/login" replace />;

  if (isDesktop) {
    return (
      <div className="dashboard-shell min-h-screen bg-[#f5f5f7] dark:bg-[#141415]">
        <Suspense fallback={<RouteFallback />}>
          <DesktopDashboardLayout
            activePanel={showDesktopDashboardNav ? activePanel || (location.pathname === '/markets' ? 'markets' : 'home') : undefined}
            onPanelChange={showDesktopDashboardNav ? onPanelChange : undefined}
          >
            {children}
          </DesktopDashboardLayout>
        </Suspense>
      </div>
    );
  }

  if (isDashboardShellPage) {
    const hasPromoBanner = shouldShowMobileInstallBanner(location.pathname) && !bannerDismissed;
    return (
      <div className="min-h-screen min-h-ios-screen w-full bg-[#f5f5f7] pb-[calc(4rem+env(safe-area-inset-bottom,0px))] dark:bg-[#141415]">
        <Suspense fallback={null}>
          <AppHeader />
        </Suspense>
        <div style={{ paddingTop: getMobileDashboardContentTop(hasPromoBanner) }}>{children}</div>
        <Suspense fallback={null}>
          <BottomNavbar />
        </Suspense>
      </div>
    );
  }

  const isBidPage = location.pathname.includes('game-bid') || location.pathname === '/bidoptions';
  const isBetsPage = location.pathname === '/bids';
  const isHistoryPage = location.pathname === '/bet-history' || location.pathname === '/market-result-history';
  const mobileBottomPad = location.pathname === '/profile'
    ? 'pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]'
    : 'pb-[calc(4rem+env(safe-area-inset-bottom,0px))]';

  return (
    <div
      className={
        hideBottomNavOnMobile
          ? 'min-h-screen min-h-ios-screen pb-6 md:pb-0 w-full max-w-full overflow-x-hidden bg-[#f5f5f7] dark:bg-black'
          : `min-h-screen min-h-ios-screen ${mobileBottomPad} md:pb-0 w-full max-w-full overflow-x-hidden bg-[#f5f5f7] dark:bg-black`
      }
    >
      {hideTopNavMobileOnly ? (
        <div className="hidden md:block">
          <Suspense fallback={null}>
            <AppHeader />
          </Suspense>
          <Suspense fallback={null}>
            <SubHeader />
          </Suspense>
        </div>
      ) : (
        !hideTopNavOnMobile && (
          <>
            <Suspense fallback={null}>
              <AppHeader />
            </Suspense>
            <Suspense fallback={null}>
              <SubHeader />
            </Suspense>
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
      {!hideBottomNavOnMobile && (
        <Suspense fallback={null}>
          <BottomNavbar />
        </Suspense>
      )}
    </div>
  );
};

export default function ProtectedApp() {
  useHeartbeat();

  return (
    <>
      <PayURedirect />
      <ScrollToTop />
      <Layout>
        <Suspense fallback={<RouteFallback />}>
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
            <Route path="/bids" element={<Bids />} />
            <Route path="/bet-history" element={<BetHistory />} />
            <Route path="/starline-bet-history" element={<StarlineBetHistory />} />
            <Route path="/king-bazaar-bet-history" element={<KingBazaarBetHistory />} />
            <Route path="/market-result-history" element={<MarketResultHistory />} />
            <Route path="/startline-dashboard" element={<StartlineDashboard />} />
            <Route path="/starline-market" element={<StarlineMarket />} />
            <Route path="/king-bazaar-market" element={<KingBazaarMarket />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/top-winners" element={<TopWinners />} />
            <Route path="/game-rate" element={<GameRate />} />
            <Route path="/games" element={<Games />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/protected-example" element={<ProtectedRoute><ProtectedDemo /></ProtectedRoute>} />
            <Route path="/admin-panel" element={<Navigate to="/admin-panel/dashboard" replace />} />
            <Route path="/admin-panel/dashboard" element={<AdminDashboard />} />
            <Route path="/admin-panel/games" element={<GameManager />} />
            <Route path="/admin-panel/transactions" element={<Transactions />} />
          </Routes>
        </Suspense>
      </Layout>
    </>
  );
}

