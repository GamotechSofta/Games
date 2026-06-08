import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SkeletonBlock from '../components/SkeletonBlock';
import ProtectedApp from './ProtectedApp';

function RouteFallback() {
  return (
    <div className="content-fade-in min-h-[40vh] w-full px-4 py-3 space-y-3" aria-hidden>
      <SkeletonBlock className="h-14 w-full" />
      <SkeletonBlock className="h-28 w-full" />
      <SkeletonBlock className="h-28 w-full" />
    </div>
  );
}

// Old login routes now resolve to the home page (login/sign up shows as a popup there).
// Preserve any query string (e.g. ?ref=) for referral signups.
const LoginRedirect = () => {
  const location = useLocation();
  return <Navigate to={{ pathname: '/', search: location.search }} replace />;
};

const AppRoutes = () => {
  return (
    <Router>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginRedirect />} />
          <Route path="/login/password" element={<LoginRedirect />} />
          <Route path="/admin-panel" element={<Navigate to="/admin-panel/dashboard" replace />} />
          <Route path="*" element={<ProtectedApp />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default AppRoutes;
