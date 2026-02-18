import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useHeartbeat } from '../hooks/useHeartbeat';
import { useBreakpoint } from '../hooks/useBreakpoint';
import AppHeader from '../components/AppHeader';
import SubHeader from '../components/SubHeader';
import BottomNavbar from '../components/BottomNavbar';
import Home from '../pages/Home';
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
import KingBazaarDashboard from '../pages/KingBazaarDashboard';
import KingBazaarMarket from '../pages/KingBazaarMarket';
import Notifications from '../pages/Notifications';
import GameRate from '../pages/GameRate';

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
  const [hasUser, setHasUser] = useState(() => !!localStorage.getItem('user'));
  const isLoginPage = location.pathname === '/login';
  const isHomePage = location.pathname === '/';

  // Hide top nav on mobile only (CSS) for My Bets landing + Bet History list + related history screens
  const hideTopNavMobileOnly =
    location.pathname === '/bids' ||
    location.pathname === '/bet-history' ||
    location.pathname === '/starline-bet-history' ||
    location.pathname === '/king-bazaar-bet-history' ||
    location.pathname === '/market-result-history';
  const hideTopNavOnMobile =
    !isDesktop &&
    (['/funds', '/profile', '/notifications', '/bidoptions', '/game-bid'].includes(location.pathname) ||
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

  const isPublicPath = PUBLIC_PATHS.includes(location.pathname);
  if (!hasUser && !isPublicPath) {
    return <Navigate to="/login" replace />;
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isHomePage) {
    return (
      <div className="min-h-screen min-h-ios-screen pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0 bg-black w-full">
        <AppHeader />
        <SubHeader />
        <div className="pt-[calc(84px+env(safe-area-inset-top,0px))] sm:pt-[calc(80px+env(safe-area-inset-top,0px))] md:pt-[calc(88px+env(safe-area-inset-top,0px))]">
          {children}
        </div>
        <BottomNavbar />
      </div>
    );
  }

  const isBidPage = location.pathname.includes('game-bid') || location.pathname === '/bidoptions';
  const isSupportPage =
    location.pathname === '/support' ||
    location.pathname === '/support/new' ||
    location.pathname === '/support/status';
  const isDarkPage =
    isBidPage ||
    location.pathname === '/bids' ||
    location.pathname === '/bank' ||
    location.pathname === '/funds' ||
    location.pathname === '/passbook' ||
    location.pathname === '/download' ||
    location.pathname === '/profile' ||
    location.pathname === '/bet-history' ||
    location.pathname === '/starline-bet-history' ||
    location.pathname === '/market-result-history' ||
    location.pathname === '/notifications' ||
    location.pathname === '/startline-dashboard' ||
    location.pathname === '/king-bazaar-dashboard' ||
    location.pathname === '/king-bazaar-market' ||
    location.pathname === '/game-rate' ||
    isSupportPage;
  const isBetsPage = location.pathname === '/bids';
  const isHistoryPage =
    location.pathname === '/bet-history' || location.pathname === '/market-result-history';

  return (
    <div
      className={
        hideBottomNavOnMobile
          ? 'min-h-screen min-h-ios-screen pb-6 md:pb-0 w-full max-w-full overflow-x-hidden bg-black'
          : 'min-h-screen min-h-ios-screen pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0 w-full max-w-full overflow-x-hidden bg-black'
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
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
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
          <Route path="/king-bazaar-dashboard" element={<KingBazaarDashboard />} />
          <Route path="/king-bazaar-market" element={<KingBazaarMarket />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/top-winners" element={<TopWinners />} />
          <Route path="/game-rate" element={<GameRate />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default AppRoutes;

