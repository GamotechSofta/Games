import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { prefetchForPathname, schedulePostLoginPrefetch } from '../api/postLoginPrefetch';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useHeartbeat } from '../hooks/useHeartbeat';
import { usePlayerWalletSocketSync } from '../hooks/usePlayerWalletSocketSync';
import useMarketsSocketSync from '../hooks/useMarketsSocketSync';
import useWalletBalanceBootstrap from '../hooks/useWalletBalanceBootstrap';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { getActivePanelFromLocation, useDashboardNav } from '../utils/dashboardNav';
import SkeletonBlock from '../components/SkeletonBlock';
import {
  isMobileInstallBannerDismissed,
  MOBILE_INSTALL_BANNER_EVENT,
  shouldShowMobileInstallBanner,
  getMobileDashboardContentTop,
} from '../utils/mobileInstallBanner';
import AppHeader from '../components/AppHeader';
import BottomNavbar from '../components/BottomNavbar';
import Home from '../pages/Home';
import AuthModal from '../components/auth/AuthModal';
import ProtectedRoute from './ProtectedRoute';
import { clearUserAuth, getUserToken, isTokenExpired } from '../utils/auth';
import { CallProvider } from '../context/CallContext';
import CallSessionOverlay from '../components/call/CallSessionOverlay';
import IosCallSetupModal from '../components/call/IosCallSetupModal';

const WALLET_SOCKET_ENABLED = import.meta.env.VITE_WALLET_SOCKET === 'true';

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
    <div className="content-fade-in min-h-[40vh] w-full px-4 py-3 space-y-3" aria-hidden>
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
      const scrollRoot = document.querySelector('main, [data-scroll-root]');
      if (scrollRoot && typeof scrollRoot.scrollTop === 'number') {
        scrollRoot.scrollTop = 0;
      }
    };

    scrollToTop();
    const raf = requestAnimationFrame(scrollToTop);

    return () => cancelAnimationFrame(raf);
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
  const isAdminPanel = location.pathname.startsWith('/admin-panel');
  const showDesktopDashboardNav =
    location.pathname === '/' ||
    location.pathname === '/markets' ||
    (location.pathname === '/games' && (activePanel === 'casino' || activePanel === 'skills'));

  const hideBottomNavOnMobile =
    location.pathname === '/game-bid' || location.pathname === '/games';

  useEffect(() => {
    const check = (event) => {
      const loggedIn = !!localStorage.getItem('user');
      setHasUser(loggedIn);
      if (loggedIn && event?.type === 'userLogin') {
        schedulePostLoginPrefetch();
      }
    };
    check();
    window.addEventListener('userLogin', check);
    window.addEventListener('userLogout', check);
    return () => {
      window.removeEventListener('userLogin', check);
      window.removeEventListener('userLogout', check);
    };
  }, []);

  usePlayerWalletSocketSync(Boolean(hasUser && !isAdminPanel && WALLET_SOCKET_ENABLED));
  useWalletBalanceBootstrap(Boolean(hasUser && !isAdminPanel));

  useEffect(() => {
    if (hasUser) prefetchForPathname(location.pathname);
  }, [hasUser, location.pathname]);

  useEffect(() => {
    const syncTabHidden = () => {
      document.body.classList.toggle('tab-hidden', document.visibilityState === 'hidden');
    };
    syncTabHidden();
    document.addEventListener('visibilitychange', syncTabHidden);
    return () => {
      document.removeEventListener('visibilitychange', syncTabHidden);
      document.body.classList.remove('tab-hidden');
    };
  }, []);

  useEffect(() => {
    const validateToken = () => {
      const token = getUserToken();
      if (token && isTokenExpired(token)) {
        clearUserAuth();
      }
    };
    validateToken();
    const timer = setInterval(validateToken, 5 * 60 * 1000);
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

  // Logged-out users: show the home page behind a non-dismissible login/sign up popup.
  // Inner content stays locked until the user authenticates.
  const gatedChildren = hasUser ? children : <Home />;
  const withAuthGate = (node) => {
    if (hasUser) return node;
    return (
      <>
        <div className="pointer-events-none select-none" aria-hidden>
          {node}
        </div>
        <AuthModal />
      </>
    );
  };

  const callEnabled = Boolean(hasUser && !isAdminPanel);
  const wrapCalls = (node) => (
    <CallProvider enabled={callEnabled}>
      <IosCallSetupModal />
      {node}
      <CallSessionOverlay />
    </CallProvider>
  );

  if (isDesktop) {
    return withAuthGate(wrapCalls(
      <div className="dashboard-shell min-h-screen bg-[#f5f5f7] dark:bg-[#141415]">
        <Suspense fallback={<RouteFallback />}>
          <DesktopDashboardLayout
            activePanel={showDesktopDashboardNav ? activePanel || (location.pathname === '/markets' ? 'markets' : 'home') : undefined}
            onPanelChange={showDesktopDashboardNav ? onPanelChange : undefined}
          >
            {gatedChildren}
          </DesktopDashboardLayout>
        </Suspense>
      </div>,
    ));
  }

  if (!isDesktop) {
    const hasPromoBanner = shouldShowMobileInstallBanner(location.pathname) && !bannerDismissed;
    const isGameBidPage = location.pathname === '/game-bid';
    const isGameBidMobileShell = isGameBidPage;
    const showMobileHeader = !isGameBidMobileShell;
    const mobileContentTop = showMobileHeader
      ? getMobileDashboardContentTop(hasPromoBanner)
      : undefined;
    const showBottomNav = hasUser && !hideBottomNavOnMobile;
    const mobileBottomPad =
      !showBottomNav
        ? 'pb-[env(safe-area-inset-bottom,0px)]'
        : location.pathname === '/profile'
          ? 'pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]'
          : 'pb-[calc(4rem+env(safe-area-inset-bottom,0px))]';

    return withAuthGate(wrapCalls(
      <div
        className={`min-h-screen min-h-ios-screen ${mobileBottomPad} md:pb-0 w-full max-w-full overflow-x-hidden bg-[#f5f5f7] dark:bg-black`}
      >
        {showMobileHeader && <AppHeader />}
        <div
          className={
            isGameBidMobileShell
              ? 'bid-route-shell flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden pt-[env(safe-area-inset-top,0px)]'
              : 'content-fade-in'
          }
          style={isGameBidMobileShell ? undefined : { animationDuration: '180ms' }}
        >
          <div
            className={isGameBidMobileShell ? 'flex flex-col flex-1 min-h-0 h-full pt-0' : undefined}
            style={!isGameBidMobileShell && mobileContentTop ? { paddingTop: mobileContentTop } : undefined}
          >
            {gatedChildren}
          </div>
        </div>
        {showBottomNav && <BottomNavbar />}
      </div>,
    ));
  }

  return null;
};

export default function ProtectedApp() {
  useHeartbeat();
  const [hasUser, setHasUser] = useState(() => !!localStorage.getItem('user'));

  useEffect(() => {
    const sync = () => setHasUser(!!localStorage.getItem('user'));
    sync();
    window.addEventListener('userLogin', sync);
    window.addEventListener('userLogout', sync);
    return () => {
      window.removeEventListener('userLogin', sync);
      window.removeEventListener('userLogout', sync);
    };
  }, []);

  useMarketsSocketSync(hasUser);

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

