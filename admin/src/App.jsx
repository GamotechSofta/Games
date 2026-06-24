import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { clearAdminAuth } from './utils/api';
import { AdminSettingsProvider } from './context/AdminSettingsContext';
import { SkeletonTable } from './components/Skeleton';
import Login from './pages/Login';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Markets = lazy(() => import('./pages/Markets'));
const AddUser = lazy(() => import('./pages/AddUser'));
const AddMarket = lazy(() => import('./pages/AddMarket'));
const BetHistory = lazy(() => import('./pages/BetHistory'));
const Reports = lazy(() => import('./pages/Reports'));
const Revenue = lazy(() => import('./pages/Revenue'));
const BookieDetail = lazy(() => import('./pages/BookieDetail'));
const PaymentManagement = lazy(() => import('./pages/PaymentManagement'));
const DepositWithdrawalHistory = lazy(() => import('./pages/DepositWithdrawalHistory'));
const DailySettlement = lazy(() => import('./pages/DailySettlement'));
const Wallet = lazy(() => import('./pages/Wallet'));
const HelpDesk = lazy(() => import('./pages/HelpDesk'));
const Logs = lazy(() => import('./pages/Logs'));
const BookieManagement = lazy(() => import('./pages/BookieManagement'));
const AllUsers = lazy(() => import('./pages/AllUsers'));
const PlayerDetail = lazy(() => import('./pages/PlayerDetail'));
const PlayerDevices = lazy(() => import('./pages/PlayerDevices'));
const AddResult = lazy(() => import('./pages/AddResult'));
const DeclareConfirm = lazy(() => import('./pages/DeclareConfirm'));
const DeclareSuccess = lazy(() => import('./pages/DeclareSuccess'));
const UpdateRate = lazy(() => import('./pages/UpdateRate'));
const MarketDetail = lazy(() => import('./pages/MarketDetail'));
const Settings = lazy(() => import('./pages/Settings'));
const TopWinners = lazy(() => import('./pages/TopWinners'));
const SpecificAdminManagement = lazy(() => import('./pages/SpecificAdminManagement'));
const TelecallerManagement = lazy(() => import('./pages/TelecallerManagement'));
const GameManagement = lazy(() => import('./pages/GameManagement'));

const PageFallback = () => (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl">
            <SkeletonTable rows={8} />
        </div>
    </div>
);

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'instant',
        });
    }, [pathname]);

    return null;
};

const PrivateRoute = ({ children }) => {
    const admin = localStorage.getItem('admin');
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    if (!admin || !token) {
        if (!admin) clearAdminAuth();
        return <Navigate to="/" />;
    }
    return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
};

const App = () => {
    return (
        <AdminSettingsProvider>
            <Router>
                <ScrollToTop />
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/dashboard" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
                    <Route path="/markets" element={<PrivateRoute><Markets /></PrivateRoute>} />
                    <Route path="/markets/:marketId" element={<PrivateRoute><MarketDetail /></PrivateRoute>} />
                    <Route path="/add-result" element={<PrivateRoute><AddResult /></PrivateRoute>} />
                    <Route path="/add-result/view/:marketId" element={<PrivateRoute><MarketDetail fromAddResult /></PrivateRoute>} />
                    <Route path="/declare-confirm" element={<PrivateRoute><DeclareConfirm /></PrivateRoute>} />
                    <Route path="/declare-success" element={<PrivateRoute><DeclareSuccess /></PrivateRoute>} />
                    <Route path="/update-rate" element={<PrivateRoute><UpdateRate /></PrivateRoute>} />
                    <Route path="/add-user" element={<PrivateRoute><AddUser /></PrivateRoute>} />
                    <Route path="/add-market" element={<PrivateRoute><AddMarket /></PrivateRoute>} />
                    <Route path="/bet-history" element={<PrivateRoute><BetHistory /></PrivateRoute>} />
                    <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
                    <Route path="/revenue" element={<PrivateRoute><Revenue /></PrivateRoute>} />
                    <Route path="/revenue/:bookieId" element={<PrivateRoute><BookieDetail /></PrivateRoute>} />
                    <Route path="/top-winners" element={<PrivateRoute><TopWinners /></PrivateRoute>} />
                    <Route path="/payment-management" element={<PrivateRoute><PaymentManagement /></PrivateRoute>} />
                    <Route path="/deposit-withdrawal-history" element={<PrivateRoute><DepositWithdrawalHistory /></PrivateRoute>} />
                    <Route path="/daily-settlement" element={<PrivateRoute><DailySettlement /></PrivateRoute>} />
                    <Route path="/wallet" element={<PrivateRoute><Wallet /></PrivateRoute>} />
                    <Route path="/help-desk" element={<PrivateRoute><HelpDesk /></PrivateRoute>} />
                    <Route path="/logs" element={<PrivateRoute><Logs /></PrivateRoute>} />
                    <Route path="/all-users" element={<PrivateRoute><AllUsers /></PrivateRoute>} />
                    <Route path="/all-users/:userId" element={<PrivateRoute><PlayerDetail /></PrivateRoute>} />
                    <Route path="/all-users/:userId/devices" element={<PrivateRoute><PlayerDevices /></PrivateRoute>} />
                    <Route path="/suspend-player" element={<Navigate to="/all-users" replace />} />
                    <Route path="/suspend-bookie" element={<Navigate to="/bookie-management" replace />} />
                    <Route path="/bookie-management" element={<PrivateRoute><BookieManagement /></PrivateRoute>} />
                    <Route path="/game-management" element={<PrivateRoute><GameManagement /></PrivateRoute>} />
                    <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
                    <Route path="/specific-admin" element={<PrivateRoute><SpecificAdminManagement /></PrivateRoute>} />
                    <Route path="/telecaller-management" element={<PrivateRoute><TelecallerManagement /></PrivateRoute>} />
                </Routes>
            </Router>
        </AdminSettingsProvider>
    );
};

export default App;
