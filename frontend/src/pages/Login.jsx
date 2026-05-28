import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import aakdaLogo from '../config/logo';
import { API_BASE_URL } from '../config/api';

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const refParam = searchParams.get('ref');
  const [isLogin, setIsLogin] = useState(!refParam);
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [isAbove18, setIsAbove18] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginMode, setLoginMode] = useState('password');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [signupOtp, setSignupOtp] = useState('');
  const [signupOtpSent, setSignupOtpSent] = useState(false);
  const [signupOtpLoading, setSignupOtpLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // Only allow digits for phone number
    if (name === 'phone') {
      processedValue = value.replace(/\D/g, '').slice(0, 10);
    }
    
    setFormData({
      ...formData,
      [name]: processedValue,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isAbove18) {
      setError(t('login.mustBeAbove18'));
      return;
    }

    if (isLogin) {
      // Login validation
      if (!formData.phone) {
        setError(t('login.phoneRequired'));
        return;
      }
      if (loginMode === 'password' && !formData.password) {
        setError(t('login.passwordRequired'));
        return;
      }
      if (loginMode === 'otp') {
        if (!otpSent) {
          setError('Please send OTP first');
          return;
        }
        if (!/^\d{4,6}$/.test(otp)) {
          setError('Please enter valid OTP');
          return;
        }
      }
    } else {
      // Signup validation
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
        setError(t('login.allFieldsRequired'));
        return;
      }
      if (formData.password.length < 6) {
        setError(t('login.passwordMinLength'));
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError(t('login.passwordsDoNotMatch'));
        return;
      }
      if (!/^\d{4,6}$/.test(signupOtp)) {
        setError('Please enter valid signup OTP');
        return;
      }
    }

    setLoading(true);

    try {
      let endpoint;
      let body;
      let deviceId = '';
      
      // Use same deviceId for both login and signup so admin can see Device ID / IP
      try {
        deviceId = typeof localStorage !== 'undefined' ? (localStorage.getItem('deviceId') || '') : '';
        if (!deviceId) {
          deviceId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `web-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('deviceId', deviceId);
          }
        }
      } catch (e) {
        deviceId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      }

      if (isLogin) {
        if (loginMode === 'otp') {
          endpoint = '/users/otp/verify';
          body = { phone: formData.phone, otp };
        } else {
          endpoint = '/users/login';
          body = { phone: formData.phone, password: formData.password, deviceId: deviceId || undefined };
        }
      } else {
        endpoint = '/users/signup-otp';
        body = {
          username: `${formData.firstName} ${formData.lastName}`.trim(),
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          otp: signupOtp,
          referredBy: refParam || undefined,
          deviceId: deviceId || undefined,
        };
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        // Store user data (preserve signup date when available)
        const previousUser = localStorage.getItem('user');
        let previousCreatedAt = null;
        if (previousUser) {
          try {
            const parsed = JSON.parse(previousUser);
            previousCreatedAt = parsed?.createdAt || parsed?.created_at || parsed?.createdOn || null;
          } catch (e) {
            previousCreatedAt = null;
          }
        }

        const userPayload = {
          ...data.data,
          createdAt:
            data.data?.createdAt ||
            data.data?.created_at ||
            data.data?.createdOn ||
            (!isLogin ? new Date().toISOString() : previousCreatedAt)
        };

        localStorage.setItem('user', JSON.stringify(userPayload));
        if (data.token) {
          localStorage.setItem('userToken', data.token);
        }
        // Dispatch custom event to update navbar
        window.dispatchEvent(new Event('userLogin'));
        // Redirect to home after login/signup
        navigate('/');
      } else {
        setError(data.message || (isLogin ? t('login.loginFailed') : t('login.signupFailed')));
      }
    } catch (err) {
      setError(t('login.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError('');
    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      setError('Please enter valid 10-digit phone number');
      return;
    }
    setOtpLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Failed to send OTP');
        return;
      }
      setOtpSent(true);
    } catch (err) {
      setError(t('login.networkError'));
    } finally {
      setOtpLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    });
    setError('');
    setLoginMode('password');
    setOtp('');
    setOtpSent(false);
    setSignupOtp('');
    setSignupOtpSent(false);
  };

  const handleSendSignupOtp = async () => {
    setError('');
    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      setError('Please enter valid 10-digit phone number');
      return;
    }
    setSignupOtpLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Failed to send OTP');
        return;
      }
      setSignupOtpSent(true);
    } catch (err) {
      setError(t('login.networkError'));
    } finally {
      setSignupOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f5f7] via-white to-gray-100 text-gray-900 dark:from-black dark:via-gray-900 dark:to-black dark:text-white relative overflow-hidden">
      {/* Desktop: Two Column Layout */}
      <div className="hidden md:flex h-screen overflow-hidden">
        {/* Left Side - Image (Fixed, Not Scrollable, Fits Screen) */}
        <div className="relative w-1/2 h-screen fixed left-0 top-0 overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900">
          <img
            src={aakdaLogo}
            alt="Aakda"
            className="absolute inset-0 m-auto max-w-[85%] max-h-[45%] w-auto h-auto object-contain"
          />
        </div>

         {/* Right Side - Form (Scrollable) */}
         <div className="w-1/2 ml-auto overflow-y-auto h-screen">
           <div className={`flex items-center justify-center min-h-full ${isLogin ? 'p-4 lg:p-6' : 'p-3 lg:p-4'}`}>
             <div className="w-full max-w-md">
            {/* Title Section */}
            <div className={`w-full ${isLogin ? 'mb-4 lg:mb-5' : 'mb-2'}`}>
              <h1 className={`${isLogin ? 'text-2xl lg:text-3xl mb-1.5' : 'text-xl lg:text-2xl mb-1'} font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent`}>
                {isLogin ? t('login.title') : t('login.createAccount')}
              </h1>
              <p className={`text-gray-400 ${isLogin ? 'text-sm lg:text-base' : 'text-xs lg:text-sm'}`}>
                {isLogin ? t('login.subtitle') : 'Join us and start winning'}
              </p>
            </div>

            {/* Form Container */}
            <div className="w-full">
              {/* Toggle Buttons */}
              <div className={`flex gap-2 ${isLogin ? 'mb-4' : 'mb-2'} bg-gray-100/90 backdrop-blur-sm rounded-xl p-1.5 border border-gray-300 dark:bg-gray-800/50 dark:border-gray-700/50`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    resetForm();
                  }}
                  className={`flex-1 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                    isLogin
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg shadow-yellow-500/30'
                      : 'text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-700/50'
                  }`}
                >
                  {t('login.login')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    resetForm();
                  }}
                  className={`flex-1 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                    !isLogin
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg shadow-yellow-500/30'
                      : 'text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-700/50'
                  }`}
                >
                  {t('login.signUp')}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2 backdrop-blur-sm">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className={isLogin ? "space-y-3" : "space-y-2"}>
                {/* Login Fields */}
                {isLogin && (
                  <>
                    <div>
                      <label className="block text-gray-300 text-xs font-medium mb-1.5">
                        {t('login.phoneNumber')} <span className="text-yellow-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          maxLength="10"
                          className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-lg px-3 pl-10 py-2.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm text-sm"
                          placeholder={t('login.phonePlaceholder')}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMode('password');
                          setOtp('');
                          setOtpSent(false);
                        }}
                        className={`rounded-lg py-2 text-xs font-semibold transition ${
                          loginMode === 'password'
                            ? 'bg-yellow-500 text-black'
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        Password
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMode('otp');
                          setFormData((prev) => ({ ...prev, password: '' }));
                        }}
                        className={`rounded-lg py-2 text-xs font-semibold transition ${
                          loginMode === 'otp'
                            ? 'bg-yellow-500 text-black'
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        OTP
                      </button>
                    </div>

                    {loginMode === 'password' && (
                    <div>
                      <label className="block text-gray-300 text-xs font-medium mb-1.5">
                        {t('login.password')} <span className="text-yellow-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-lg px-3 pl-10 pr-10 py-2.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm text-sm"
                          placeholder={t('login.passwordPlaceholder')}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    )}

                    {loginMode === 'otp' && (
                      <div>
                        <label className="block text-gray-300 text-xs font-medium mb-1.5">
                          OTP <span className="text-yellow-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm text-sm"
                            placeholder="Enter OTP"
                            required
                          />
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={otpLoading}
                            className="rounded-lg px-3 py-2.5 text-xs font-semibold bg-yellow-500 text-black hover:bg-yellow-400 disabled:opacity-60"
                          >
                            {otpLoading ? '...' : (otpSent ? 'Resend' : 'Send')}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* First Name and Last Name (only for signup) */}
                {!isLogin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-300 text-xs font-medium mb-1">
                        {t('login.firstName')} <span className="text-yellow-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm text-sm"
                        placeholder={t('login.firstName')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-xs font-medium mb-1">
                        {t('login.lastName')} <span className="text-yellow-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm text-sm"
                        placeholder={t('login.lastName')}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Email (only for signup) */}
                {!isLogin && (
                  <div>
                    <label className="block text-gray-300 text-xs font-medium mb-1">
                      {t('login.emailAddress')} <span className="text-yellow-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-lg px-3 pl-9 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm text-sm"
                        placeholder={t('login.emailPlaceholder')}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Phone (only for signup) */}
                {!isLogin && (
                  <div>
                    <label className="block text-gray-300 text-xs font-medium mb-1">
                      {t('login.phoneNumber')} <span className="text-yellow-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        maxLength="10"
                        className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-lg px-3 pl-9 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm text-sm"
                        placeholder={t('login.phonePlaceholder')}
                        required
                      />
                    </div>
                  </div>
                )}

                {!isLogin && (
                  <div>
                    <label className="block text-gray-300 text-xs font-medium mb-1">
                      Signup OTP <span className="text-yellow-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={signupOtp}
                        onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm text-sm"
                        placeholder="Enter OTP"
                        required
                      />
                      <button
                        type="button"
                        onClick={handleSendSignupOtp}
                        disabled={signupOtpLoading}
                        className="rounded-lg px-3 py-2 text-xs font-semibold bg-yellow-500 text-black hover:bg-yellow-400 disabled:opacity-60"
                      >
                        {signupOtpLoading ? '...' : (signupOtpSent ? 'Resend' : 'Send')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Password (only for signup) */}
                {!isLogin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-300 text-xs font-medium mb-1">
                        {t('login.password')} <span className="text-yellow-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-lg px-3 pl-9 pr-9 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm text-sm"
                          placeholder={t('login.createPasswordPlaceholder')}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-xs font-medium mb-1">
                        {t('login.confirmPassword')} <span className="text-yellow-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-lg px-3 pl-9 pr-9 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm text-sm"
                          placeholder={t('login.confirmPasswordPlaceholder')}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((p) => !p)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Checkbox */}
                <div className={isLogin ? "mb-3" : "mb-2"}>
                  <label className="flex items-start gap-2 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={isAbove18}
                        onChange={(e) => setIsAbove18(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`${isLogin ? 'w-4 h-4' : 'w-3.5 h-3.5'} rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                        isAbove18 
                          ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-500 shadow-md shadow-green-500/30' 
                          : 'border-gray-400 group-hover:border-gray-500 bg-gray-100/80 dark:border-gray-600 dark:group-hover:border-gray-500 dark:bg-gray-800/50'
                      }`}>
                        {isAbove18 && (
                          <svg className={`${isLogin ? 'w-3 h-3' : 'w-2.5 h-2.5'} text-gray-900 dark:text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className={`text-gray-300 ${isLogin ? 'text-xs' : 'text-[10px]'} leading-tight flex-1`}>
                      {t('login.above18')}{' '}
                      <span className="text-yellow-500 underline">{t('login.termsOfUse')}</span> {t('login.and')}{' '}
                      <span className="text-yellow-500 underline">{t('login.privacyPolicy')}</span>
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !isAbove18}
                  className={`w-full bg-gradient-to-r from-yellow-500 via-yellow-500 to-yellow-600 text-black font-bold ${isLogin ? 'py-2.5' : 'py-2'} rounded-lg hover:from-yellow-400 hover:via-yellow-500 hover:to-yellow-600 transition-all duration-200 text-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/30 hover:shadow-xl hover:shadow-yellow-500/40 active:scale-[0.98]`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('common.pleaseWait')}
                    </span>
                  ) : (
                    isLogin
                      ? (loginMode === 'otp' ? 'Verify OTP' : t('login.signIn'))
                      : t('login.createAccount')
                  )}
                </button>

                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode((prev) => (prev === 'otp' ? 'password' : 'otp'));
                      setError('');
                    }}
                    className="w-full py-2 text-xs font-semibold text-yellow-500 hover:text-yellow-400 transition-colors"
                  >
                    {loginMode === 'otp' ? 'Login with Password' : 'Login with OTP'}
                  </button>
                )}
              </form>
            </div>

              {/* Bottom Legal Text */}
              <div className={`${isLogin ? 'mt-4' : 'mt-2'} text-center w-full`}>
                <p className={`text-gray-400 ${isLogin ? 'text-xs' : 'text-[10px]'} leading-tight`}>
                  {t('login.byContinuing')}{' '}
                  <span className="text-yellow-500 hover:text-yellow-400 underline cursor-pointer transition-colors">{t('login.termsOfUse')}</span>
                  {' '}{t('login.and')}{' '}
                  <span className="text-yellow-500 hover:text-yellow-400 underline cursor-pointer transition-colors">{t('login.privacyPolicy')}</span>
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>
        
      {/* Mobile: Single Column Layout */}
      <div className="md:hidden flex flex-col px-4 sm:px-6 py-4 sm:py-6 min-h-screen">
        <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center justify-center flex-1">
          {/* Image - Reduced size for mobile */}
          <div className="w-full mb-4 sm:mb-6 flex justify-center">
            <img
              src={aakdaLogo}
              alt="Aakda"
              className="h-10 sm:h-12 w-auto max-w-[220px] object-contain"
            />
          </div>

          {/* Title Section */}
          <div className="w-full mb-4 sm:mb-5">
            <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              {isLogin ? t('login.title') : t('login.createAccount')}
            </h1>
            <p className="text-gray-400 text-sm sm:text-base text-center">
              {isLogin ? t('login.subtitle') : 'Join us and start winning'}
            </p>
          </div>

          {/* Middle Section - Login/Signup */}
          <div className="w-full">
            {/* Toggle Buttons */}
            <div className="flex gap-2 mb-5 bg-gray-100/90 backdrop-blur-sm rounded-xl p-1.5 border border-gray-300 dark:bg-gray-800/50 dark:border-gray-700/50">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  resetForm();
                }}
                className={`flex-1 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                  isLogin
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg shadow-yellow-500/30'
                    : 'text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-700/50'
                }`}
              >
                {t('login.login')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  resetForm();
                }}
                className={`flex-1 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                  !isLogin
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg shadow-yellow-500/30'
                    : 'text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-700/50'
                }`}
              >
                {t('login.signUp')}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center gap-2 backdrop-blur-sm">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Login Fields */}
              {isLogin && (
                <>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2.5">
                      {t('login.phoneNumber')} <span className="text-yellow-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        maxLength="10"
                        className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-xl px-4 pl-12 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm"
                        placeholder={t('login.phonePlaceholder')}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMode('password');
                        setOtp('');
                        setOtpSent(false);
                      }}
                      className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                        loginMode === 'password'
                          ? 'bg-yellow-500 text-black'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMode('otp');
                        setFormData((prev) => ({ ...prev, password: '' }));
                      }}
                      className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                        loginMode === 'otp'
                          ? 'bg-yellow-500 text-black'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      OTP
                    </button>
                  </div>

                  {loginMode === 'password' && (
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2.5">
                      {t('login.password')} <span className="text-yellow-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-xl px-4 pl-12 pr-12 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm"
                        placeholder={t('login.passwordPlaceholder')}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-300"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  )}

                  {loginMode === 'otp' && (
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2.5">
                        OTP <span className="text-yellow-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm"
                          placeholder="Enter OTP"
                          required
                        />
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={otpLoading}
                          className="rounded-xl px-3 py-3.5 text-sm font-semibold bg-yellow-500 text-black hover:bg-yellow-400 disabled:opacity-60"
                        >
                          {otpLoading ? '...' : (otpSent ? 'Resend' : 'Send')}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* First Name and Last Name (only for signup) */}
              {!isLogin && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2.5">
                      {t('login.firstName')} <span className="text-yellow-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm"
                      placeholder={t('login.firstName')}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2.5">
                      {t('login.lastName')} <span className="text-yellow-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm"
                      placeholder={t('login.lastName')}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email (only for signup) */}
              {!isLogin && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2.5">
                    {t('login.emailAddress')} <span className="text-yellow-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-xl px-4 pl-12 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm"
                      placeholder={t('login.emailPlaceholder')}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Phone (only for signup) */}
              {!isLogin && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2.5">
                    {t('login.phoneNumber')} <span className="text-yellow-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      maxLength="10"
                      className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-xl px-4 pl-12 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm"
                      placeholder={t('login.phonePlaceholder')}
                      required
                    />
                  </div>
                </div>
              )}

              {!isLogin && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2.5">
                    Signup OTP <span className="text-yellow-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={signupOtp}
                      onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm"
                      placeholder="Enter OTP"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleSendSignupOtp}
                      disabled={signupOtpLoading}
                      className="rounded-xl px-3 py-3.5 text-sm font-semibold bg-yellow-500 text-black hover:bg-yellow-400 disabled:opacity-60"
                    >
                      {signupOtpLoading ? '...' : (signupOtpSent ? 'Resend' : 'Send')}
                    </button>
                  </div>
                </div>
              )}

              {/* Password (only for signup) */}
              {!isLogin && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2.5">
                    {t('login.password')} <span className="text-yellow-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-xl px-4 pl-12 pr-12 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm"
                      placeholder={t('login.createPasswordPlaceholder')}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-300"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password (only for signup) */}
              {!isLogin && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2.5">
                    {t('login.confirmPassword')} <span className="text-yellow-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full bg-white/95 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700/50 rounded-xl px-4 pl-12 pr-12 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all backdrop-blur-sm"
                      placeholder={t('login.confirmPasswordPlaceholder')}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-300"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Checkbox */}
              <div className="mb-5">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={isAbove18}
                      onChange={(e) => setIsAbove18(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      isAbove18 
                        ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-500 shadow-lg shadow-green-500/30' 
                        : 'border-gray-400 group-hover:border-gray-500 bg-gray-100/80 dark:border-gray-600 dark:group-hover:border-gray-500 dark:bg-gray-800/50'
                    }`}>
                      {isAbove18 && (
                        <svg className="w-3.5 h-3.5 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-300 text-sm leading-relaxed flex-1">
                    {t('login.above18')}{' '}
                    <span className="text-yellow-500 underline">{t('login.termsOfUse')}</span> {t('login.and')}{' '}
                    <span className="text-yellow-500 underline">{t('login.privacyPolicy')}</span>
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !isAbove18}
                className="w-full bg-gradient-to-r from-yellow-500 via-yellow-500 to-yellow-600 text-black font-bold py-3.5 sm:py-4 rounded-xl hover:from-yellow-400 hover:via-yellow-500 hover:to-yellow-600 transition-all duration-200 text-sm sm:text-base uppercase disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/30 hover:shadow-xl hover:shadow-yellow-500/40 active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('common.pleaseWait')}
                  </span>
                ) : (
                  isLogin
                    ? (loginMode === 'otp' ? 'Verify OTP' : t('login.signIn'))
                    : t('login.createAccount')
                )}
              </button>

              {isLogin && (
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode((prev) => (prev === 'otp' ? 'password' : 'otp'));
                    setError('');
                  }}
                  className="w-full py-2 text-sm font-semibold text-yellow-500 hover:text-yellow-400 transition-colors"
                >
                  {loginMode === 'otp' ? 'Login with Password' : 'Login with OTP'}
                </button>
              )}
            </form>

            {/* Bottom Legal Text */}
            <div className="mt-6 sm:mt-8 pb-4 text-center w-full">
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                {t('login.byContinuing')}{' '}
                <span className="text-yellow-500 hover:text-yellow-400 underline cursor-pointer transition-colors">{t('login.termsOfUse')}</span>
                {' '}{t('login.and')}{' '}
                <span className="text-yellow-500 hover:text-yellow-400 underline cursor-pointer transition-colors">{t('login.privacyPolicy')}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
