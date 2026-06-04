import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayersProvider } from './context/PlayersContext';
import Login from './pages/Login';
import AppLayout from './components/layout/AppLayout';
import OverviewPage from './pages/OverviewPage';
import PlayerCallsPage from './pages/PlayerCallsPage';
import BetsPage from './pages/BetsPage';

const PrivateRoute = ({ children }) => {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-teal-600 animate-pulse font-medium">Loading…</div>
            </div>
        );
    }

    if (!session?.token) {
        return <Navigate to="/" replace />;
    }

    return children;
};

const AppShell = () => (
    <PlayersProvider>
        <Routes>
            <Route
                element={(
                    <PrivateRoute>
                        <AppLayout />
                    </PrivateRoute>
                )}
            >
                <Route path="/dashboard" element={<OverviewPage />} />
                <Route path="/call-players" element={<PlayerCallsPage />} />
                <Route path="/bets" element={<BetsPage />} />
                <Route path="/players" element={<Navigate to="/call-players" replace />} />
                <Route path="/payments" element={<Navigate to="/call-players" replace />} />
                <Route path="/wallet" element={<Navigate to="/call-players" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    </PlayersProvider>
);

const AppRoutes = () => (
    <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/*" element={<AppShell />} />
    </Routes>
);

const App = () => (
    <Router>
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    </Router>
);

export default App;
