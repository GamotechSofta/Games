import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import { FaBars } from 'react-icons/fa';

const Layout = ({ children, title }) => {
    const navigate = useNavigate();
    const { bookie, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-[#020617] text-gray-100 font-sans selection:bg-amber-500/30 selection:text-amber-200">
            {/* Mobile header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 z-40 shadow-xl">
                <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-amber-500 transition-all active:scale-95"
                    aria-label="Open menu"
                >
                    <FaBars className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/10 rotate-3">
                        <span className="text-black font-black text-lg">B</span>
                    </div>
                    <h1 className="text-lg font-bold text-white tracking-tight truncate max-w-[150px]">
                        {title || 'Bookie Panel'}
                    </h1>
                </div>
                <div className="w-10" />
            </header>

            {/* Sidebar */}
            <Sidebar
                user={bookie}
                onLogout={handleLogout}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Backdrop for mobile */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-30 transition-all duration-300"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden
                />
            )}

            {/* Main content */}
            <main className="pt-20 lg:pt-0 lg:ml-[280px] min-h-screen overflow-x-hidden transition-all duration-300">
                <div className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto box-border">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
