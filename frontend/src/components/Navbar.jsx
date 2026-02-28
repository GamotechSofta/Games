import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearUserAuth } from '../utils/auth';
import { triggerApkDownload } from '../utils/downloads';

const Navbar = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const checkUser = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (e) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    checkUser();

    // Listen for storage changes (when user logs in/out in another tab)
    window.addEventListener('storage', checkUser);
    
    // Listen for custom login event
    window.addEventListener('userLogin', checkUser);
    window.addEventListener('userLogout', checkUser);

    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('userLogin', checkUser);
      window.removeEventListener('userLogout', checkUser);
    };
  }, []);

  const handleLogout = () => {
    clearUserAuth();
  };

  return (
    <nav className="bg-black w-full px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between shadow-sm">
      {/* Left side - Hamburger menu and Logo */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Hamburger Menu Icon */}
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-[#f3b61b]/50 flex items-center justify-center cursor-pointer hover:bg-[#f3b61b]/10 transition-colors">
          <div className="flex flex-col gap-1 sm:gap-1.5">
            <div className="w-2.5 sm:w-3 h-0.5 bg-[#f3b61b]"></div>
            <div className="w-3 sm:w-4 h-0.5 bg-[#f3b61b]"></div>
            <div className="w-2.5 sm:w-3 h-0.5 bg-[#f3b61b]"></div>
          </div>
        </div>
        
        {/* Logo - Clickable to home */}
        <Link to="/" className="flex items-center cursor-pointer">
          <img
            src="https://res.cloudinary.com/dnyp5jknp/image/upload/v1771570274/Blue_Tosca_Modern_Game_Logo_1_ktl6bu.png"
            alt="Logo"
            className="h-10 sm:h-12 md:h-14 w-auto object-contain"
          />
        </Link>
      </div>

      {/* Right side - Buttons and User info */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
        {/* Download App Button - direct APK download */}
        <button
          onClick={triggerApkDownload}
          className="bg-gray-800 text-[#f3b61b] border border-[#f3b61b]/50 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg shadow-md hover:bg-[#f3b61b]/10 transition-colors font-medium text-xs sm:text-sm md:text-base"
        >
          {t('header.downloadApp')}
        </button>
        {/* Bank Button */}
        <button 
          onClick={() => navigate('/bank')}
          className="bg-[#f3b61b] text-black px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg shadow-md hover:opacity-90 transition-colors font-medium text-xs sm:text-sm md:text-base"
        >
          Bank
        </button>
        
        {/* User Profile Icon or Sign In/Sign Up */}
        {user ? (
          <>
            {/* Profile Icon - Clickable to profile or logout */}
            <div 
              onClick={handleLogout}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-[#f3b61b]/50 bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-[#f3b61b]/10 transition-colors"
              title="Logout"
            >
              <svg 
                className="w-5 h-5 sm:w-6 sm:h-6 text-[#f3b61b]" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
            
            {/* Username - Hidden on very small screens */}
            <span className="text-[#f3b61b] font-medium text-sm sm:text-base md:text-lg hidden sm:inline">
              {user.username}
            </span>
          </>
        ) : (
          /* Sign In/Sign Up Icon */
          <div 
            onClick={() => navigate('/login')}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-gray-600 bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors"
            title="Sign In / Sign Up"
          >
            <svg 
              className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
              />
            </svg>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
