import React from 'react';
import { useNavigate } from 'react-router-dom';
import WalletSection from '../components/WalletSection';
import HeroSection from '../components/HeroSection';
import Section1 from '../components/Section1';

const Home = () => {
  const navigate = useNavigate();
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();
  const username = user?.username || user?.name || 'User';
  const balance = Number(user?.balance ?? user?.walletBalance ?? 0) || 0;

  return (
    <div className="min-h-screen min-h-ios-screen bg-[#0a0a0a] w-full max-w-full overflow-x-hidden">
      <div className="px-3 pt-2 pb-1 md:px-6">
        <div className="rounded-xl border border-white/10 bg-[#1f2023] p-4">
          <p className="text-gray-300 text-sm">Welcome, {username}</p>
          <p className="text-white text-xl font-bold mt-1">Balance: ₹{balance.toLocaleString('en-IN')}</p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button onClick={() => navigate('/games')} className="py-2 rounded-lg bg-yellow-500 text-black font-semibold">Play Games</button>
            <button onClick={() => navigate('/wallet')} className="py-2 rounded-lg bg-white/10 text-white font-semibold">Wallet</button>
          </div>
        </div>
      </div>
      {/* Mobile View - WalletSection */}
      <div className="md:hidden">
        <WalletSection />
      </div>
      
      {/* Hero Section - Shows on both mobile and desktop (banner) */}
      <HeroSection />

      {/* Section1 - Markets */}
      <Section1 />
    </div>
  );
};

export default Home;
