import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SkeletonBlock from '../components/SkeletonBlock';
import ProtectedApp from './ProtectedApp';

const Login = lazy(() => import('../pages/Login'));

function RouteFallback() {
  return (
    <div className="content-fade-in min-h-[40vh] w-full px-4 py-3 space-y-3" aria-hidden>
      <SkeletonBlock className="h-14 w-full" />
      <SkeletonBlock className="h-28 w-full" />
      <SkeletonBlock className="h-28 w-full" />
    </div>
  );
}

const AppRoutes = () => {
  return (
    <Router>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/login/password" element={<Login />} />
          <Route path="/login/otp" element={<Login />} />
          <Route path="/admin-panel" element={<Navigate to="/admin-panel/dashboard" replace />} />
          <Route path="*" element={<ProtectedApp />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default AppRoutes;

